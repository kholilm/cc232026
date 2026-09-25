<?php

namespace App\Http\Controllers;

use App\Models\ReleaseSchedule;
use App\Services\FinesseService;
use Carbon\Carbon;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Inertia\Response;
use Throwable;

class ReleaseScheduleController extends Controller
{
    /**
     * ============================================================
     * INDEX
     * ============================================================
     *
     * Menampilkan jadwal release berdasarkan:
     * - tanggal
     * - shift
     * - nama CSO
     *
     * Data monitoring:
     * - allocated_minutes
     * - used_minutes
     * - remaining_minutes
     * - carry_over_minutes
     *
     * dihitung PER CSO.
     */
    public function index(Request $request): Response
    {
        /*
         * Default tanggal = tanggal bisnis WITA (Asia/Makassar),
         * bukan tanggal UTC server.
         *
         * Jadwal diinput dengan tanggal WITA. Tanpa timezone
         * eksplisit, antara 00:00-08:00 WITA halaman schedule
         * menampilkan jadwal tanggal UTC (kemarin) sehingga
         * slot yang sedang release di Monitor tetap terlihat
         * "Akan Release" di sini.
         */
        $date = $request->input(
            'date',
            now('Asia/Makassar')->toDateString()
        );

        $shift = trim(
            (string) $request->input('shift', '')
        );

        $search = trim(
            (string) $request->input('search', '')
        );

        /*
         * ========================================================
         * QUERY RELEASE SCHEDULE
         * ========================================================
         *
         * Session diambil sekaligus agar Schedule Index dapat
         * menghitung pemakaian release berdasarkan Release Monitor.
         */
        $query = ReleaseSchedule::query()
            ->whereDate('date', $date)
            ->where('active', true)
            ->with([
                'sessions' => function ($query) {
                    $query->orderByDesc('created_at')
                        ->orderByDesc('id');
                },
            ]);

        /*
         * Filter shift.
         */
        if ($shift !== '') {
            $query->where(
                'shift',
                $shift
            );
        }

        /*
         * Filter nama CSO.
         *
         * Search hanya dilakukan ketika user menekan
         * tombol Cari / Enter dari frontend.
         */
        if ($search !== '') {
            $query->where(
                'agent_name',
                'like',
                '%' . $search . '%'
            );
        }

        /*
         * ========================================================
         * AMBIL DATA
         * ========================================================
         *
         * Urutan:
         * 1. Nama CSO
         * 2. Jadwal fixed terlebih dahulu
         * 3. Jam mulai
         * 4. Flexible terakhir
         */
        $schedules = $query
            ->orderBy('agent_name')
            ->orderByRaw('scheduled_start IS NULL')
            ->orderBy('scheduled_start')
            ->orderBy('id')
            ->get();

        /*
         * ========================================================
         * GROUP PER CSO + SHIFT + TANGGAL
         * ========================================================
         */
        /*
         * ========================================================
         * AUXILIARY (TOILET / MAKAN / SHOLAT)
         * ========================================================
         *
         * Diambil dari backend (FinesseService::getCombined)
         * melalui cache 10 detik, sehingga Schedule Index tetap
         * TIDAK memanggil Finesse secara langsung.
         *
         * Dipanggil SEKALI di luar loop group.
         */
        $auxiliaryMap = $this->auxiliaryMap();

        $groups = $schedules
            ->groupBy(function (ReleaseSchedule $schedule) {
                return implode('|', [
                    $schedule->agent_name,
                    $schedule->shift,
                    $schedule->date->format('Y-m-d'),
                ]);
            })
            ->map(function ($items) use ($auxiliaryMap) {
                $first = $items->first();

                /*
                 * =================================================
                 * NILAI TOTAL PER CSO
                 * =================================================
                 */

                /*
                 * Total alokasi asli berdasarkan schedule.
                 *
                 * Carry-over tidak ditambahkan ke sini karena
                 * carry-over adalah sisa dari release sebelumnya,
                 * bukan tambahan kuota baru.
                 */
                $allocatedMinutes = $items->sum(
                    fn(ReleaseSchedule $item) => (int) $item->duration_minutes
                );

                $usedMinutes = 0;

                /*
                 * Carry-over yang masih tersedia untuk
                 * release berikutnya.
                 */
                $availableCarryOver = 0;

                /*
                 * Carry-over terakhir yang dihasilkan.
                 *
                 * Dipakai sebagai fallback informasi.
                 */
                $lastCarryOver = 0;

                /*
                 * Menyimpan ID session terakhir setiap schedule.
                 */
                $scheduleData = [];

                /*
                 * Carry-over berjalan dari release sebelumnya.
                 *
                 * Contoh:
                 *
                 * Release 1 = 15 menit
                 * Dipakai 10 menit
                 * Carry-over = 5
                 *
                 * Release 2:
                 * Alokasi efektif = 15 + 5
                 */
                $carryInForNext = 0;

                /*
                 * =================================================
                 * PROSES SETIAP SLOT RELEASE
                 * =================================================
                 */
                foreach ($items as $item) {
                    /*
                     * Session terbaru untuk schedule ini.
                     */
                    $session = $item->sessions->first();

                    /*
                     * Carry-in:
                     *
                     * Sisa dari slot sebelumnya yang
                     * dihitung berjalan di loop ini.
                     *
                     * Tidak membaca kolom di database karena
                     * release_sessions tidak menyimpan
                     * carried_in_minutes.
                     */
                    $carriedIn = $carryInForNext;

                    /*
                     * Alokasi efektif slot ini.
                     */
                    $effectiveAllocated =
                        (int) $item->duration_minutes
                        + $carriedIn;

                    /*
                     * =================================================
                     * HITUNG PEMAKAIAN
                     * =================================================
                     */
                    $usedSeconds = 0;

                    if ($session) {
                        /*
                         * Release sedang berjalan.
                         *
                         * Gunakan waktu actual_start sampai sekarang,
                         * DIBEKUKAN pada batas Work Date/end shift
                         * supaya session yang ditinggal setelah
                         * end shift tidak menambah Terpakai tanpa
                         * batas (dan tidak bocor ke Work Date baru).
                         */
                        if (
                            in_array(
                                $session->status,
                                ['active', 'overtime'],
                                true
                            )
                            && $session->actual_start
                        ) {
                            $usedSeconds = app(
                                ReleaseSessionController::class
                            )->boundedElapsedSeconds(
                                    $session,
                                    $item
                                );
                        } else {
                            /*
                             * Release sudah selesai.
                             *
                             * Gunakan duration_used_seconds
                             * dari ReleaseSession.
                             */
                            $usedSeconds = max(
                                0,
                                (int) (
                                    $session->duration_used_seconds ?? 0
                                )
                            );
                        }
                    }

                    /*
                     * Ubah detik menjadi menit.
                     *
                     * Dibulatkan ke bawah supaya tidak menampilkan
                     * menit penuh sebelum benar-benar tercapai.
                     */
                    $usedSlotMinutes = intdiv(
                        (int) $usedSeconds,
                        60
                    );

                    /*
                     * Missed tidak dianggap memakai waktu.
                     */
                    if (
                        $session
                        && $session->status === 'missed'
                    ) {
                        $usedSlotMinutes = 0;
                    }

                    $usedMinutes += $usedSlotMinutes;

                    /*
                     * =================================================
                     * CARRY OVER
                     * =================================================
                     *
                     * Carry-over dihitung dari:
                     *
                     * (durasi slot + carry-in) - pemakaian aktual
                     *
                     * hanya ketika session sudah selesai
                     * (completed).
                     */
                    $carryOver = 0;

                    if (
                        $session
                        && $session->status === 'completed'
                    ) {
                        $allowedSeconds =
                            ((int) $item->duration_minutes
                                + $carriedIn)
                            * 60;

                        $carryOver = intdiv(
                            max(
                                0,
                                $allowedSeconds - $usedSeconds
                            ),
                            60
                        );

                        $carryInForNext = $carryOver;
                    }

                    /*
                     * Missed: tidak menghasilkan saldo.
                     */
                    if (
                        $session
                        && $session->status === 'missed'
                    ) {
                        $carryInForNext = 0;
                    }

                    /*
                     * Simpan carry-over terakhir
                     * untuk informasi.
                     */
                    $lastCarryOver = $carryOver;

                    /*
                     * Carry-over yang tersedia untuk slot
                     * berikutnya adalah carry-over berjalan.
                     */
                    $availableCarryOver = $carryInForNext;

                    /*
                     * =================================================
                     * STATUS
                     * =================================================
                     */
                    $monitorStatus = 'upcoming';
                    $statusLabel = 'Akan Release';

                    if ($session) {
                        switch ($session->status) {
                            case 'active':
                                $monitorStatus = 'releasing';
                                $statusLabel = 'Sedang Release';
                                break;

                            case 'overtime':
                                $monitorStatus = 'overtime';
                                $statusLabel = 'Overtime';
                                break;

                            case 'completed':
                                $monitorStatus = 'released';
                                $statusLabel = 'Sudah Release';
                                break;

                            case 'missed':
                                $monitorStatus = 'missed';
                                $statusLabel = 'Tidak Release';
                                break;

                            default:
                                $monitorStatus = 'upcoming';
                                $statusLabel = 'Akan Release';
                                break;
                        }
                    } elseif ($item->is_flexible) {
                        $monitorStatus = 'upcoming';
                        $statusLabel = 'Akan Release';
                    } elseif ($item->scheduled_start) {
                        /*
                         * Status jadwal yang belum mempunyai session.
                         *
                         * Status dihitung berdasarkan jadwal:
                         * - sebelum jam mulai          -> upcoming
                         * - s/d toleransi berakhir    -> waiting (toleransi)
                         * - setelah toleransi berakhir -> missed
                         */
                        /*
                         * Jadwal diinput dalam WITA (Asia/Makassar),
                         * aplikasi berjalan di UTC.
                         */
                        $scheduledTime =
                            strlen($item->scheduled_start) === 5
                            ? $item->scheduled_start . ':00'
                            : substr(
                                $item->scheduled_start,
                                0,
                                8
                            );

                        $scheduledDateTime = Carbon::createFromFormat(
                            'Y-m-d H:i:s',
                            $item->date->format('Y-m-d')
                            . ' '
                            . $scheduledTime,
                            'Asia/Makassar'
                        );

                        /*
                         * Dukungan Overnight Schedule:
                         * Shift J (16:00-01:00) dan Shift P (22:00-08:00):
                         * Slot dini hari (< 12:00) jatuh pada tanggal kalender berikutnya.
                         * Shift R:
                         * Seluruh jam schedule jatuh pada tanggal kalender berikutnya.
                         */
                        if (
                            $item->shift === 'R'
                            || (
                                in_array($item->shift, ['J', 'P'], true)
                                && (int) substr($scheduledTime, 0, 2) < 12
                            )
                        ) {
                            $scheduledDateTime->addDay();
                        }

                        $toleranceMinutes = (int) (
                            $item->tolerance_minutes ?? 10
                        );

                        if ($item->scheduled_end) {
                            $endTime =
                                strlen($item->scheduled_end) === 5
                                ? $item->scheduled_end . ':00'
                                : substr(
                                    $item->scheduled_end,
                                    0,
                                    8
                                );

                            $toleranceEndTime =
                                Carbon::createFromFormat(
                                    'Y-m-d H:i:s',
                                    $scheduledDateTime->format('Y-m-d')
                                    . ' '
                                    . $endTime,
                                    'Asia/Makassar'
                                )
                                    ->addMinutes($toleranceMinutes);

                            if (
                                $toleranceEndTime->lt(
                                    $scheduledDateTime
                                )
                            ) {
                                $toleranceEndTime->addDay();
                            }
                        } else {
                            $toleranceEndTime =
                                $scheduledDateTime
                                    ->copy()
                                    ->addMinutes(
                                        (int) $item->duration_minutes
                                        + $toleranceMinutes
                                    );
                        }

                        /*
                         * =================================================
                         * MISSED vs TOLERANSI (SUMBER DATA SAMA)
                         * =================================================
                         *
                         * Jangan langsung missed jika CSO masih
                         * menangani Voice/Digital. Status busy
                         * dibaca dari cache yang ditulis
                         * release-session/sync tiap 5 detik —
                         * sumber data yang sama dengan ReleaseMonitor.
                         */
                        $busy = (bool) Cache::get(
                            'release:busy:' . $first->agent_name,
                            false
                        );

                        if (now()->lt($scheduledDateTime)) {
                            $monitorStatus = 'upcoming';
                            $statusLabel = 'Akan Release';
                        } elseif (now()->lt($toleranceEndTime)) {
                            $monitorStatus = 'waiting';
                            $statusLabel = 'Toleransi';
                        } elseif ($busy) {
                            $monitorStatus = 'waiting';
                            $statusLabel = 'Menunggu Release';
                        } else {
                            $monitorStatus = 'missed';
                            $statusLabel = 'Tidak Release';
                        }
                    }

                    /*
                     * =================================================
                     * DATA SLOT
                     * =================================================
                     */
                    $scheduleData[] = [
                        'id' => $item->id,

                        'type' => $item->type,

                        'scheduled_start' => $item->scheduled_start
                            ? substr(
                                $item->scheduled_start,
                                0,
                                5
                            )
                            : null,

                        'scheduled_end' => $item->scheduled_end
                            ? substr(
                                $item->scheduled_end,
                                0,
                                5
                            )
                            : null,

                        'duration_minutes' => (int) $item->duration_minutes,

                        'is_flexible' => (bool) $item->is_flexible,

                        'tolerance_minutes' => (int) (
                            $item->tolerance_minutes ?? 5
                        ),

                        'has_session' => $session !== null,

                        'actual_start' => $session?->actual_start
                            ? $session->actual_start->format('H:i')
                            : null,

                        'session_status' => $session?->status,

                        /*
                         * Data session dari formatter yang SAMA
                         * dengan yang dikirim ke ReleaseMonitor:
                         * actual_start (ISO UTC), status,
                         * allowed_duration_seconds,
                         * duration_used_seconds,
                         * remaining_seconds.
                         */
                        'session' => $session
                            ? app(
                                ReleaseSessionController::class
                            )->formatSession(
                                    $session,
                                    $item,
                                    $items
                                )
                            : null,

                        'carried_in_minutes' => $carriedIn,

                        'allocated_minutes' => $effectiveAllocated,

                        'used_minutes' => $usedSlotMinutes,

                        'carry_over_minutes' => $carryOver,

                        'monitor_status' => $monitorStatus,

                        'status_label' => $statusLabel,
                    ];
                }

                /*
                 * Sisa per schedule.
                 */
                $remainingMinutes = max(
                    0,
                    $allocatedMinutes - $usedMinutes
                );

                /*
                 * Jika masih ada carry-over yang tersedia,
                 * tampilkan nilai tersebut.
                 *
                 * Jangan menambahkannya ke remaining agar tidak
                 * double-count.
                 */
                $carryOverMinutes = max(
                    0,
                    $availableCarryOver
                );

                /*
                 * =================================================
                 * RETURN GROUP
                 * =================================================
                 */
                return [
                    'agent_name' => $first->agent_name,

                    'shift' => $first->shift,

                    'date' => $first->date->format('Y-m-d'),

                    /*
                     * Auxiliary (Toilet/Makan/Sholat/Total/Sisa)
                     * dari sumber yang SAMA dengan ReleaseMonitor.
                     * null bila data tidak tersedia.
                     */
                    'auxiliary' => $auxiliaryMap[
                        strtoupper(
                            trim(
                                (string) $first->agent_name
                            )
                        )
                    ] ?? null,

                    /*
                     * Total alokasi release CSO.
                     */
                    'allocated_minutes' => $allocatedMinutes,

                    /*
                     * Alias untuk kompatibilitas dengan frontend lama.
                     */
                    'total_minutes' => $allocatedMinutes,

                    /*
                     * Total pemakaian CSO.
                     */
                    'used_minutes' => $usedMinutes,

                    /*
                     * Total sisa CSO.
                     */
                    'remaining_minutes' => $remainingMinutes,

                    /*
                     * Carry-over yang masih tersedia.
                     */
                    'carry_over_minutes' => $carryOverMinutes,

                    /*
                     * Jumlah slot tetap dikirim untuk kompatibilitas,
                     * tetapi tidak perlu ditampilkan sebagai summary.
                     */
                    'release_count' => $items->count(),

                    'has_history' => $items->contains(
                        fn(ReleaseSchedule $item) => $item->sessions->isNotEmpty()
                    ),

                    'schedules' => collect($scheduleData)->values(),
                ];
            })
            ->values();

        /*
         * ========================================================
         * RESPONSE INERTIA
         * ========================================================
         */
        return Inertia::render(
            'ReleaseSchedule/schedule-index',
            [
                'groups' => $groups,

                'filters' => [
                    'date' => $date,
                    'shift' => $shift,
                    'search' => $search,
                ],
            ]
        );
    }

    /**
     * ============================================================
     * CREATE
     * ============================================================
     */
    public function create(): Response
    {
        abort_unless(
            auth()->user()?->can('auth.release-schedule.create'),
            403
        );

        return Inertia::render(
            'ReleaseSchedule/schedule-create'
        );
    }

    /**
     * ============================================================
     * STORE
     * ============================================================
     */
    public function store(Request $request): RedirectResponse
    {
        abort_unless(
            auth()->user()?->can('auth.release-schedule.create'),
            403
        );

        $validated = $this->validateRequest(
            $request,
            false
        );

        $this->validateReleaseRows(
            $validated['releases']
        );

        DB::transaction(function () use ($validated) {
            foreach ($validated['releases'] as $release) {
                ReleaseSchedule::create(
                    $this->schedulePayload(
                        $validated,
                        $release
                    )
                );
            }
        });

        return redirect()
            ->route(
                'release-schedule.index',
                [
                    'date' => $validated['date'],
                ]
            )
            ->with(
                'success',
                'Jadwal release berhasil disimpan.'
            );
    }

    /**
     * ============================================================
     * EDIT
     * ============================================================
     */
    public function edit(
        ReleaseSchedule $releaseSchedule
    ): Response {
        abort_unless(
            auth()->user()?->can('auth.release-schedule.update'),
            403
        );

        $schedules = ReleaseSchedule::query()
            ->where(
                'agent_name',
                $releaseSchedule->agent_name
            )
            ->where(
                'shift',
                $releaseSchedule->shift
            )
            ->whereDate(
                'date',
                $releaseSchedule->date
            )
            ->where(
                'active',
                true
            )
            ->withCount('sessions')
            ->orderByRaw(
                'scheduled_start IS NULL'
            )
            ->orderBy('scheduled_start')
            ->orderBy('id')
            ->get();

        return Inertia::render(
            'ReleaseSchedule/schedule-edit',
            [
                'schedule' => [
                    'agent_name' => $releaseSchedule->agent_name,

                    'shift' => $releaseSchedule->shift,

                    'date' => $releaseSchedule->date
                        ->format('Y-m-d'),

                    'releases' => $schedules
                        ->map(
                            function (ReleaseSchedule $item) {
                                return [
                                    'id' => $item->id,

                                    'type' => $item->type,

                                    'scheduled_start' => $item->scheduled_start
                                        ? substr(
                                            $item->scheduled_start,
                                            0,
                                            5
                                        )
                                        : '',

                                    'scheduled_end' => $item->scheduled_end
                                        ? substr(
                                            $item->scheduled_end,
                                            0,
                                            5
                                        )
                                        : '',

                                    'duration_minutes' => (int) $item
                                        ->duration_minutes,

                                    'is_flexible' => (bool) $item
                                        ->is_flexible,

                                    'tolerance_minutes' => (int) (
                                        $item
                                            ->tolerance_minutes
                                        ?? 5
                                    ),

                                    'has_session' => (int) $item
                                        ->sessions_count > 0,
                                ];
                            }
                        )
                        ->values(),
                ],
            ]
        );
    }

    /**
     * ============================================================
     * UPDATE
     * ============================================================
     */
    public function update(
        Request $request,
        ReleaseSchedule $releaseSchedule
    ): RedirectResponse {
        abort_unless(
            auth()->user()?->can('auth.release-schedule.update'),
            403
        );

        $validated = $this->validateRequest(
            $request,
            true
        );

        $this->validateReleaseRows(
            $validated['releases']
        );

        $hasHistoryError = false;

        DB::transaction(
            function () use ($validated, $releaseSchedule, &$hasHistoryError) {
                $existing = ReleaseSchedule::query()
                    ->where(
                        'agent_name',
                        $releaseSchedule->agent_name
                    )
                    ->where(
                        'shift',
                        $releaseSchedule->shift
                    )
                    ->whereDate(
                        'date',
                        $releaseSchedule->date
                    )
                    ->where(
                        'active',
                        true
                    )
                    ->withCount('sessions')
                    ->lockForUpdate()
                    ->get();

                if ($existing->isEmpty()) {
                    abort(
                        404,
                        'Paket jadwal tidak ditemukan.'
                    );
                }

                /*
                 * Jika sudah memiliki histori release,
                 * identitas paket tidak boleh diubah.
                 */
                $hasHistory = $existing->contains(
                    fn(
                    ReleaseSchedule $item
                ) => (int) $item->sessions_count > 0
                );

                if ($hasHistory) {
                    if (
                        $validated['agent_name']
                        !==
                        $releaseSchedule->agent_name
                    ) {
                        abort(
                            422,
                            'Nama CSO tidak dapat diubah karena jadwal sudah memiliki histori release.'
                        );
                    }

                    if (
                        $validated['shift']
                        !==
                        $releaseSchedule->shift
                    ) {
                        abort(
                            422,
                            'Shift tidak dapat diubah karena jadwal sudah memiliki histori release.'
                        );
                    }

                    if (
                        $validated['date']
                        !==
                        $releaseSchedule
                            ->date
                            ->format('Y-m-d')
                    ) {
                        abort(
                            422,
                            'Tanggal tidak dapat diubah karena jadwal sudah memiliki histori release.'
                        );
                    }
                }

                /*
                 * ID yang dikirim dari frontend.
                 */
                $incomingIds = collect(
                    $validated['releases']
                )
                    ->pluck('id')
                    ->filter(
                        fn($id) => !empty($id)
                            && (int) $id > 0
                    )
                    ->map(
                        fn($id) => (int) $id
                    )
                    ->values();

                /*
                 * Pastikan semua ID valid.
                 */
                if (
                    $incomingIds
                        ->diff(
                            $existing->pluck('id')
                        )
                        ->isNotEmpty()
                ) {
                    abort(
                        422,
                        'Terdapat ID jadwal yang tidak valid.'
                    );
                }

                /*
                 * Update / create release.
                 */
                foreach (
                    $validated['releases'] as $release
                ) {
                    $id = !empty($release['id'])
                        ? (int) $release['id']
                        : null;

                    $payload =
                        $this->schedulePayload(
                            $validated,
                            $release
                        );

                    if ($id) {
                        $schedule =
                            $existing->firstWhere(
                                'id',
                                $id
                            );

                        if (!$schedule) {
                            abort(
                                422,
                                'Jadwal tidak ditemukan.'
                            );
                        }

                        /*
                         * Jadwal yang sudah memiliki session
                         * tidak boleh diubah.
                         */
                        if (
                            (int) 
                            $schedule
                                ->sessions_count
                            > 0
                        ) {
                            continue;
                        }

                        $schedule->update(
                            $payload
                        );
                    } else {
                        ReleaseSchedule::create(
                            $payload
                        );
                    }
                }

                /*
                 * Hapus slot yang sudah tidak dikirim.
                 */
                foreach ($existing as $old) {
                    if (
                        $incomingIds->contains(
                            (int) $old->id
                        )
                    ) {
                        continue;
                    }

                    if (
                        (int) 
                        $old->sessions_count
                        > 0
                    ) {
                        $hasHistoryError = true;
                        continue;
                    }

                    $old->delete();
                }
            }
        );

        if ($hasHistoryError) {
            return back()->with(
                'error',
                'Slot release yang sudah memiliki histori tidak dapat dihapus.'
            );
        }

        return redirect()
            ->route(
                'release-schedule.index',
                [
                    'date' => $validated['date'],
                ]
            )
            ->with(
                'success',
                'Jadwal release berhasil diperbarui.'
            );
    }

    /**
     * ============================================================
     * DESTROY
     * ============================================================
     */
    public function destroy(
        ReleaseSchedule $releaseSchedule
    ): RedirectResponse {
        abort_unless(
            auth()->user()?->can('auth.release-schedule.delete'),
            403
        );

        $hasHistory = false;

        DB::transaction(
            function () use ($releaseSchedule, &$hasHistory) {
                if (request()->boolean('single')) {
                    $releaseSchedule->loadCount('sessions');

                    if ((int) $releaseSchedule->sessions_count > 0) {
                        $hasHistory = true;
                        return;
                    }

                    $releaseSchedule->delete();
                    return;
                }

                $schedules = ReleaseSchedule::query()
                    ->where(
                        'agent_name',
                        $releaseSchedule->agent_name
                    )
                    ->where(
                        'shift',
                        $releaseSchedule->shift
                    )
                    ->whereDate(
                        'date',
                        $releaseSchedule->date
                    )
                    ->where(
                        'active',
                        true
                    )
                    ->withCount('sessions')
                    ->lockForUpdate()
                    ->get();

                if ($schedules->isEmpty()) {
                    return;
                }

                $hasHistory = $schedules->contains(
                    fn(
                    ReleaseSchedule $item
                ) => (int) $item->sessions_count > 0
                );

                if ($hasHistory) {
                    /*
                     * Slot release yang sudah memiliki histori
                     * TIDAK DAPAT dihapus. Data database tetap aman.
                     */
                    return;
                }

                /*
                 * Belum ada histori,
                 * aman untuk dihapus.
                 */
                ReleaseSchedule::query()
                    ->whereIn(
                        'id',
                        $schedules->pluck('id')
                    )
                    ->delete();
            }
        );

        if ($hasHistory) {
            return back()->with(
                'error',
                'Slot release yang sudah memiliki histori tidak dapat dihapus.'
            );
        }

        return back()->with(
            'success',
            'Jadwal release berhasil dihapus.'
        );
    }

    /**
     * ============================================================
     * VALIDATION
     * ============================================================
     */
    private function validateRequest(
        Request $request,
        bool $withIds
    ): array {
        $rules = [
            'agent_name' => [
                'required',
                'string',
                'max:255',
            ],

            'shift' => [
                'required',
                'string',
                'max:50',
            ],

            'date' => [
                'required',
                'date',
            ],

            'releases' => [
                'required',
                'array',
                'min:1',
            ],

            'releases.*.type' => [
                'required',
                'in:meal,meal_dzuhur,toilet',
            ],

            'releases.*.scheduled_start' => [
                'nullable',
                'date_format:H:i',
            ],

            'releases.*.scheduled_end' => [
                'nullable',
                'date_format:H:i',
            ],

            'releases.*.duration_minutes' => [
                'required',
                'integer',
                'min:1',
                'max:120',
            ],

            'releases.*.is_flexible' => [
                'required',
                'boolean',
            ],

            'releases.*.tolerance_minutes' => [
                'nullable',
                'integer',
                'min:0',
                'max:60',
            ],
        ];

        if ($withIds) {
            $rules['releases.*.id'] = [
                'nullable',
                'integer',
            ];
        }

        $validated =
            $request->validate($rules);

        $validated['agent_name'] =
            trim(
                $validated['agent_name']
            );

        $validated['shift'] =
            strtoupper(
                trim(
                    $validated['shift']
                )
            );

        return $validated;
    }

    /**
     * ============================================================
     * PAYLOAD
     * ============================================================
     */
    private function schedulePayload(
        array $validated,
        array $release
    ): array {
        $isFlexible =
            (bool) (
                $release['is_flexible']
                ?? false
            );

        return [
            'agent_name' => $validated['agent_name'],

            'shift' => $validated['shift'],

            'date' => $validated['date'],

            'type' => $release['type'],

            'scheduled_start' => $isFlexible
                ? null
                : $release['scheduled_start'],

            'scheduled_end' => $isFlexible
                ? null
                : $release['scheduled_end'],

            'duration_minutes' => (int) 
                $release['duration_minutes'],

            'is_flexible' => $isFlexible,

            'tolerance_minutes' => $isFlexible
                ? 0
                : (int) (
                    $release['tolerance_minutes']
                    ?? 10
                ),

            'active' => true,
        ];
    }

    /**
     * ============================================================
     * VALIDATE RELEASE ROWS
     * ============================================================
     */
    private function validateReleaseRows(
        array $releases
    ): void {
        $flexibleCount = 0;

        foreach (
            $releases as $index => $release
        ) {
            $row = $index + 1;

            $isFlexible =
                (bool) (
                    $release['is_flexible']
                    ?? false
                );

            /*
             * Flexible hanya untuk Toilet.
             */
            if ($isFlexible) {
                $flexibleCount++;

                if (
                    $release['type']
                    !==
                    'toilet'
                ) {
                    abort(
                        422,
                        "Slot {$row}: hanya Toilet yang boleh menggunakan mode flexible."
                    );
                }

                continue;
            }

            /*
             * Fixed schedule wajib mempunyai
             * jam mulai dan selesai.
             */
            if (
                empty($release['scheduled_start'])
                ||
                empty($release['scheduled_end'])
            ) {
                abort(
                    422,
                    "Slot {$row}: jam mulai dan jam selesai wajib diisi."
                );
            }

            $start =
                $this->timeToMinutes(
                    $release['scheduled_start']
                );

            $end =
                $this->timeToMinutes(
                    $release['scheduled_end']
                );

            /*
             * Mendukung schedule yang melewati tengah malam.
             */
            if ($end <= $start) {
                $end += 24 * 60;
            }

            $duration =
                $end - $start;

            if (
                $duration <= 0
                ||
                $duration > 120
            ) {
                abort(
                    422,
                    "Slot {$row}: durasi release harus 1-120 menit."
                );
            }

            /*
             * Pastikan duration_minutes sesuai
             * dengan jam mulai dan selesai.
             */
            if (
                (int) 
                $release['duration_minutes']
                !==
                $duration
            ) {
                abort(
                    422,
                    "Slot {$row}: durasi tidak sesuai jam mulai dan selesai. Durasi yang benar adalah {$duration} menit."
                );
            }
        }

        /*
         * Satu CSO hanya boleh mempunyai
         * satu Toilet flexible.
         */
        if ($flexibleCount > 1) {
            abort(
                422,
                'Untuk satu CSO hanya boleh ada satu slot Toilet flexible.'
            );
        }
    }

    /**
     * ============================================================
     * AUXILIARY MAP (TOILET / MAKAN / SHOLAT)
     * ============================================================
     *
     * Mengambil data Auxiliary dari FinesseService::getCombined()
     * (sumber yang SAMA dengan ReleaseMonitor / Cubemap), lalu
     * dipetakan per nama CSO ternormalisasi.
     *
     * Tujuan:
     * - Schedule Index membaca group.auxiliary dari backend.
     * - Schedule Index TIDAK memanggil /api/finesse/combined.
     *
     * Hasil di-cache singkat (10 detik) supaya:
     * - getCombined() maksimal dipanggil SATU kali saat cache
     *   miss, BUKAN sekali per CSO / per reload polling.
     * - Reload Inertia tidak menambah beban HTTP Finesse.
     *
     * Fail-safe: apa pun error/timeout Finesse TIDAK boleh
     * menggagalkan /release-schedule. Bila gagal, map kosong.
     *
     * @return array<string, array>
     */
    private function auxiliaryMap(): array
    {
        /*
         * Cache key stabil untuk unit 23.
         */
        $cacheKey = 'release-schedule:auxiliary:unit:23';

        try {
            return Cache::remember(
                $cacheKey,
                10,
                function () {
                    $agents = app(FinesseService::class)
                        ->getCombined(23);

                    $map = [];

                    foreach ($agents as $agent) {
                        $name = strtoupper(
                            trim(
                                (string) ($agent['name'] ?? '')
                            )
                        );

                        if ($name === '') {
                            continue;
                        }

                        if (!empty($agent['auxiliary'])) {
                            $map[$name] = $agent['auxiliary'];
                        }
                    }

                    return $map;
                }
            );
        } catch (Throwable $e) {
            /*
             * Auxiliary gagal (timeout/error Finesse).
             * Jangan throw: schedule utama harus tetap tampil.
             */
            Log::warning(
                'RELEASE SCHEDULE AUXILIARY ERROR',
                [
                    'message' => $e->getMessage(),
                ]
            );

            return [];
        }
    }

    /**
     * ============================================================
     * TIME HELPER
     * ============================================================
     */
    private function timeToMinutes(
        string $time
    ): int {
        $parts = explode(
            ':',
            $time
        );

        $hour =
            (int) (
                $parts[0] ?? 0
            );

        $minute =
            (int) (
                $parts[1] ?? 0
            );

        return (
            $hour * 60
        ) + $minute;
    }
}
