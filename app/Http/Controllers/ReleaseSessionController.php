<?php

namespace App\Http\Controllers;

use App\Models\ReleaseSchedule;
use App\Models\ReleaseSession;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class ReleaseSessionController extends Controller
{
    /**
     * ============================================================
     * INDEX / RELEASE MONITOR
     * ============================================================
     *
     * Halaman monitoring release.
     *
     * DATA REALTIME:
     * ReleaseMonitor.tsx -> Finesse
     *
     * DATA SESSION:
     * ReleaseSession -> database
     */
    public function index(Request $request): Response
    {
        $date = $request->input(
            'date',
            now()->toDateString()
        );

        $search = trim(
            (string) $request->input('search', '')
        );

        $shift = trim(
            (string) $request->input('shift', '')
        );

        $query = ReleaseSchedule::query()
            ->whereDate('date', $date)
            ->where('active', true)
            ->with([
                'sessions' => function ($query) {
                    $query
                        ->orderByDesc('id');
                },
            ]);

        if ($shift !== '') {
            $query->where(
                'shift',
                $shift
            );
        }

        if ($search !== '') {
            $query->where(
                'agent_name',
                'like',
                '%' . $search . '%'
            );
        }

        $schedules = $query
            ->orderBy('agent_name')
            ->orderByRaw(
                'scheduled_start IS NULL'
            )
            ->orderBy('scheduled_start')
            ->orderBy('id')
            ->get();

        $groups = $schedules
            ->groupBy(function (ReleaseSchedule $schedule) {
                return implode('|', [
                    $schedule->agent_name,
                    $schedule->shift,
                    $schedule->date->format('Y-m-d'),
                ]);
            })
            ->map(function ($items) {
                $first = $items->first();

                $usedMinutes = 0;
                $carryOverMinutes = 0;

                $scheduleData = [];

                foreach ($items as $item) {
                    $session = $item->sessions->first();

                    $usedSeconds = 0;

                    if ($session) {
                        if (
                            in_array(
                                $session->status,
                                [
                                    'active',
                                    'overtime',
                                ],
                                true
                            )
                            && $session->actual_start
                        ) {
                            /*
                             * Elapsed dibekukan pada batas Work
                             * Date/end shift agar tidak membengkak
                             * lintas hari.
                             */
                            $usedSeconds = $this->getBoundedElapsedSeconds(
                                $session,
                                $item
                            );
                        } else {
                            $usedSeconds = max(
                                0,
                                (int) $session->duration_used_seconds
                            );
                        }
                    }

                    $usedSlotMinutes = intdiv(
                        $usedSeconds,
                        60
                    );

                    /*
                     * Jangan hitung missed sebagai pemakaian.
                     */
                    if (
                        $session
                        && $session->status === 'missed'
                    ) {
                        $usedSlotMinutes = 0;
                    }

                    $usedMinutes += $usedSlotMinutes;

                    /*
                     * Carry-over dihitung dari:
                     *
                     * hak slot sebelumnya
                     * - pemakaian aktual
                     *
                     * tanpa membutuhkan kolom tambahan
                     * di release_sessions.
                     */
                    if (
                        $session
                        && $session->status === 'completed'
                    ) {
                        $allowedPreviousSeconds =
                            $this->getAllowedDurationSeconds(
                                $item,
                                $items
                            );

                        $carryOverSeconds = max(
                            0,
                            $allowedPreviousSeconds
                                - $usedSeconds
                        );

                        $carryOverMinutes = intdiv(
                            $carryOverSeconds,
                            60
                        );
                    }

                    $monitorStatus =
                        $this->getMonitorStatus(
                            $item,
                            $session
                        );

                    $statusLabel =
                        $this->getStatusLabel(
                            $item,
                            $session
                        );

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
                            $item->tolerance_minutes
                            ?? 5
                        ),

                        'session' => $session
                            ? $this->formatSession(
                                $session,
                                $item
                            )
                            : null,

                        'session_status' => $session?->status,

                        'used_minutes' => $usedSlotMinutes,

                        'carry_over_minutes' => $carryOverMinutes,

                        'monitor_status' => $monitorStatus,

                        'status_label' => $statusLabel,
                    ];
                }

                $allocatedMinutes = $items->sum(
                    fn(
                        ReleaseSchedule $item
                    ) => (int) $item->duration_minutes
                );

                $remainingMinutes = max(
                    0,
                    $allocatedMinutes
                        - $usedMinutes
                );

                return [
                    'agent_name' => $first->agent_name,

                    'shift' => $first->shift,

                    'date' => $first->date->format('Y-m-d'),

                    'allocated_minutes' => $allocatedMinutes,

                    'total_minutes' => $allocatedMinutes,

                    'used_minutes' => $usedMinutes,

                    'remaining_minutes' => $remainingMinutes,

                    'carry_over_minutes' => max(
                        0,
                        $carryOverMinutes
                    ),

                    'release_count' => $items->count(),

                    'has_history' => $items->contains(
                        fn(
                            ReleaseSchedule $item
                        ) => $item->sessions->isNotEmpty()
                    ),

                    'schedules' => collect($scheduleData)->values(),
                ];
            })
            ->values();

        return Inertia::render(
            'ReleaseSchedule/schedule-index',
            [
                'groups' => $groups,

                'filters' => [
                    'date' => $date,
                    'shift' => $shift,
                    'search' => $search,
                ],

                'summary' => [
                    'total_cso' => $groups->count(),

                    'total_slots' => $schedules->count(),

                    'total_minutes' => $schedules->sum(
                        fn(
                            ReleaseSchedule $schedule
                        ) => (int)
                        $schedule->duration_minutes
                    ),

                    'shifts' => $groups
                        ->pluck('shift')
                        ->unique()
                        ->values(),
                ],

                'server_time' => now()->format(
                    'Y-m-d H:i:s'
                ),
            ]
        );
    }

    /**
     * ============================================================
     * SYNC FROM FINESSE
     * ============================================================
     *
     * INI ADALAH METHOD UTAMA.
     *
     * ReleaseMonitor mengirim data Finesse setiap polling.
     *
     * Payload yang diharapkan:
     *
     * {
     *     "agents": [
     *         {
     *             "name": "CC.23.CHARINA",
     *             "voice": {
     *                 "status": "Talking"
     *             },
     *             "digital": {
     *                 "active": true,
     *                 "session_active": true,
     *                 "call_in_progress": 1
     *             }
     *         }
     *     ]
     * }
     */
    public function syncFromFinesse(
        Request $request
    ): JsonResponse {
        $validated = $request->validate([
            'agents' => [
                'required',
                'array',
            ],

            'agents.*.name' => [
                'required',
                'string',
                'max:255',
            ],

            'agents.*.voice' => [
                'nullable',
                'array',
            ],

            'agents.*.voice.status' => [
                'nullable',
                'string',
            ],

            'agents.*.voice.reason' => [
                'nullable',
                'string',
            ],

            'agents.*.digital' => [
                'nullable',
                'array',
            ],

            'agents.*.digital.active' => [
                'nullable',
                'boolean',
            ],

            'agents.*.digital.session_active' => [
                'nullable',
                'boolean',
            ],

            'agents.*.digital.call_in_progress' => [
                'nullable',
                'integer',
            ],
        ]);

        $results = [];

        DB::transaction(
            function () use (
                $validated,
                &$results
            ) {
                foreach (
                    $validated['agents'] as $agent
                ) {
                    $results[] =
                        $this->withReleaseInfo(
                            $this->syncAgent(
                                $agent
                            )
                        );
                }
            }
        );

        return response()->json([
            'success' => true,

            'server_time' => now()->format(
                'Y-m-d H:i:s'
            ),

            'results' => $results,
        ]);
    }

    /**
     * ============================================================
     * SYNC SATU CSO
     * ============================================================
     */
    private function syncAgent(
        array $agent
    ): array {
        $agentName =
            trim(
                (string) $agent['name']
            );

        $voice =
            $agent['voice']
            ?? [];

        $digital =
            $agent['digital']
            ?? [];

        /*
         * ========================================================
         * CUSTOMER ACTIVE
         * ========================================================
         *
         * TRUE berarti CSO masih menangani customer.
         *
         * Voice:
         * Talking
         *
         * Digital:
         * active/session_active
         * atau CallInProgress > 0
         */
        $voiceStatus =
            strtoupper(
                trim(
                    (string) (
                        $voice['status']
                        ?? ''
                    )
                )
            );

        $voiceBusy =
            in_array(
                $voiceStatus,
                [
                    'TALKING',
                    'TALK',
                    'CONNECTED',
                    'INCALL',
                    'IN CALL',
                ],
                true
            );

        $digitalBusy =
            (bool) (
                $digital['active']
                ?? false
            )
            ||
            (bool) (
                $digital['session_active']
                ?? false
            )
            ||
            (
                (int) (
                    $digital['call_in_progress']
                    ?? 0
                ) > 0
            );

        $customerActive =
            $voiceBusy
            || $digitalBusy;

        /*
         * ========================================================
         * CACHE STATUS BUSY (SUMBER BERSAMA)
         * ========================================================
         *
         * Sync ini berjalan tiap 5 detik dari ReleaseMonitor.
         * Status busy disimpan agar ReleaseScheduleController
         * (halaman schedule) bisa memakai kondisi Finesse yang
         * sama tanpa memanggil FinesseService sendiri.
         *
         * TTL 90 detik: jika Monitor mati, cache kedaluwarsa
         * dan schedule kembali memakai logika jam saja.
         */
        Cache::put(
            'release:busy:' . $agentName,
            $customerActive,
            now()->addSeconds(90)
        );

        /*
         * ========================================================
         * CARI JADWAL YANG SEDANG BERLAKU
         * ========================================================
         */
        /*
         * Cari jadwal yang berlaku untuk agent.
         *
         * Mendukung shift malam (overnight shift J, P, R):
         * Pada dini hari (00:00 - 08:30 WITA), shift malam yang dimulai
         * kemarin sore/malam masih aktif berjalan hari ini.
         */
        $todayMakassar = now('Asia/Makassar')->toDateString();
        $yesterdayMakassar = now('Asia/Makassar')->subDay()->toDateString();
        $currentHour = (int) now('Asia/Makassar')->format('H');

        $query = ReleaseSchedule::query()
            ->where(
                'agent_name',
                $agentName
            )
            ->where(
                'active',
                true
            );

        if ($currentHour < 9) {
            $query->where(function ($q) use ($todayMakassar, $yesterdayMakassar) {
                $q->whereDate('date', $todayMakassar)
                    ->orWhere(function ($sub) use ($yesterdayMakassar) {
                        $sub->whereDate('date', $yesterdayMakassar)
                            ->whereIn('shift', ['J', 'P', 'R']);
                    });
            });
        } else {
            $query->whereDate('date', $todayMakassar);
        }

        $schedules = $query
            ->orderByRaw(
                'scheduled_start IS NULL'
            )
            ->orderBy(
                'scheduled_start'
            )
            ->orderBy('id')
            ->lockForUpdate()
            ->get();

        if ($schedules->isEmpty()) {
            return [
                'agent_name' => $agentName,

                'action' => 'no_schedule',

                'customer_active' => $customerActive,
            ];
        }

        /*
         * ========================================================
         * PROSES SLOT
         * ========================================================
         */
        foreach ($schedules as $schedule) {
            $session =
                ReleaseSession::query()
                ->where(
                    'release_schedule_id',
                    $schedule->id
                )
                ->latest('id')
                ->lockForUpdate()
                ->first();

            /*
             * ----------------------------------------------------
             * SESSION SUDAH SELESAI
             * ----------------------------------------------------
             *
             * Overtime TIDAK dianggap selesai selama
             * actual_end masih kosong.
             *
             * CSO yang overtime masih sedang release,
             * jadi session harus terus dipantau sampai
             * CSO benar-benar kembali menangani customer.
             */
            if (
                $session
                && in_array(
                    $session->status,
                    [
                        'completed',
                        'missed',
                    ],
                    true
                )
            ) {
                continue;
            }

            if (
                $session
                && $session->status === 'overtime'
                && $session->actual_end
            ) {
                continue;
            }

            /*
             * ----------------------------------------------------
             * SESSION SEDANG RELEASE
             * ----------------------------------------------------
             */
            if (
                $session
                && in_array(
                    $session->status,
                    [
                        'active',
                        'overtime',
                    ],
                    true
                )
                && ! $session->actual_end
            ) {
                /*
                 * Jika CSO kembali menangani customer,
                 * berarti release selesai.
                 *
                 * Ini otomatis.
                 */
                if ($customerActive) {
                    $finished =
                        $this->finishAutomatically(
                            $session,
                            $schedule
                        );

                    return [
                        'agent_name' => $agentName,

                        'action' => 'completed',

                        'schedule_id' => $schedule->id,

                        'session_id' => $finished->id,

                        'status' => $finished->status,

                        'customer_active' => true,

                        'duration_used_seconds' => $finished
                            ->duration_used_seconds,

                        'remaining_seconds' => $this->getRemainingSeconds(
                            $schedule,
                            $finished,
                            $schedules
                        ),
                    ];
                }

                /*
                 * Masih release.
                 *
                 * Update duration realtime.
                 */
                $elapsed =
                    max(
                        0,
                        $session
                            ->actual_start
                            ->diffInSeconds(
                                now()
                            )
                    );

                $allowed =
                    $this->getAllowedDurationSeconds(
                        $schedule,
                        $schedules
                    );

                /*
                 * Overtime:
                 *
                 * Session TIDAK ditutup.
                 * Status overtime menandakan CSO masih
                 * release melewati haknya.
                 *
                 * Session tetap terbuka sampai CSO
                 * kembali menangani customer, baru
                 * actual_end diisi oleh
                 * finishAutomatically.
                 */
                if ($elapsed > $allowed) {
                    $session->update([
                        'duration_used_seconds' => $elapsed,

                        'status' => 'overtime',
                    ]);

                    return [
                        'agent_name' => $agentName,

                        'action' => 'overtime',

                        'schedule_id' => $schedule->id,

                        'session_id' => $session->id,

                        'status' => 'overtime',

                        'customer_active' => false,

                        'duration_used_seconds' => $elapsed,
                    ];
                }

                $session->update([
                    'duration_used_seconds' => $elapsed,
                ]);

                return [
                    'agent_name' => $agentName,

                    'action' => 'releasing',

                    'schedule_id' => $schedule->id,

                    'session_id' => $session->id,

                    'status' => 'active',

                    'customer_active' => false,

                    'duration_used_seconds' => $elapsed,
                ];
            }

            /*
             * ----------------------------------------------------
             * BELUM ADA SESSION
             * ----------------------------------------------------
             */
            if (! $session) {
                /*
                 * Flexible Toilet:
                 *
                 * Tidak dimulai hanya karena jam.
                 * Untuk flexible, kita tetap membutuhkan
                 * indikator release dari frontend.
                 *
                 * Untuk tahap pertama jangan otomatis
                 * membuat toilet session tanpa sinyal.
                 */
                if ($schedule->is_flexible) {
                    continue;
                }

                /*
                  * Jadwal fixed belum waktunya.
                  */
                $start =
                    $this->getScheduledStart(
                        $schedule
                    );

                if (
                    now()->lt($start)
                ) {
                    continue;
                }

                /*
                 * =================================================
                 * 1. CUSTOMER MASIH AKTIF (VOICE / DIGITAL)
                 * =================================================
                 *
                 * Selama CSO masih menangani Voice atau Digital:
                 * TIDAK BOLEH dibuatkan session 'missed', betapapun
                 * jam toleransi sudah habis.
                 * Status tetap tolerance / Menunggu Release.
                 */
                if ($customerActive) {
                    return [
                        'agent_name' => $agentName,

                        'action' => 'waiting_customer',

                        'schedule_id' => $schedule->id,

                        'status' => 'tolerance',
                    ];
                }

                /*
                 * =================================================
                 * 2. NOT READY DENGAN ALASAN BUKAN MAKAN
                 * =================================================
                 */
                $voiceReason = strtolower(
                    trim(
                        (string) (
                            $voice['reason'] ?? ''
                        )
                    )
                );

                $isMealStatus =
                    str_contains($voiceReason, 'makan')
                    || str_contains($voiceReason, 'meal');

                $voiceNotReady =
                    $voiceStatus !== ''
                    && ! in_array(
                        $voiceStatus,
                        [
                            'READY',
                            'AVAILABLE',
                        ],
                        true
                    );

                if (
                    $voiceNotReady
                    && ! $isMealStatus
                ) {
                    return [
                        'agent_name' => $agentName,

                        'action' => 'waiting_status',

                        'schedule_id' => $schedule->id,

                        'status' => 'tolerance',

                        'customer_active' => false,
                    ];
                }

                /*
                 * =================================================
                 * 3. AGENT BENAR-BENAR MENGAMBIL RELEASE MAKAN
                 * =================================================
                 *
                 * Berlaku normal maupun DELAYED RELEASE (setelah customer selesai).
                 * actual_start = waktu aktual deteksi Makan (now()).
                 */
                if ($isMealStatus) {
                    $newSession =
                        ReleaseSession::create([
                            'release_schedule_id' => $schedule->id,

                            'agent_name' => $schedule->agent_name,

                            'actual_start' => now(),

                            'actual_end' => null,

                            'duration_used_seconds' => 0,

                            'status' => 'active',
                        ]);

                    return [
                        'agent_name' => $agentName,

                        'action' => 'started',

                        'schedule_id' => $schedule->id,

                        'session_id' => $newSession->id,

                        'status' => 'active',

                        'customer_active' => false,

                        'actual_start' => $newSession
                            ->actual_start
                            ->format(
                                'Y-m-d\\TH:i:s\\Z'
                            ),
                    ];
                }

                /*
                 * =================================================
                 * 4. SUDAH MELEWATI MASA TOLERANSI (TIDAK AMBIL MAKAN)
                 * =================================================
                 *
                 * Customer sudah selesai, CSO tidak mengambil status Makan,
                 * dan jam toleransi telah lewat -> barulah MISSED.
                 */
                if (
                    now()->gt(
                        $this->getToleranceEnd(
                            $schedule,
                            $start
                        )
                    )
                ) {
                    ReleaseSession::create([
                        'release_schedule_id' => $schedule->id,

                        'agent_name' => $schedule->agent_name,

                        'actual_start' => null,

                        'actual_end' => null,

                        'duration_used_seconds' => 0,

                        'status' => 'missed',
                    ]);

                    continue;
                }

                /*
                 * =================================================
                 * 5. AGENT BELUM MENGAMBIL RELEASE (MASIH READY & TOLERANSI)
                 * =================================================
                 */
                return [
                    'agent_name' => $agentName,

                    'action' => 'waiting_release',

                    'schedule_id' => $schedule->id,

                    'status' => 'tolerance',

                    'customer_active' => false,
                ];
            }
        }

        return [
            'agent_name' => $agentName,

            'action' => 'no_action',

            'customer_active' => $customerActive,
        ];
    }

    /**
     * ============================================================
     * RELEASE INFO UNTUK RELEASEMONITOR
     * ============================================================
     *
     * Melengkapi hasil syncAgent dengan data realtime:
     *
     * - jadwal
     * - monitor_status / status_label
     * - session (actual_start, allowed, remaining)
     * - carry-over
     *
     * Dipakai ReleaseMonitor untuk kolom release,
     * tanpa request tambahan ke server.
     */
    private function withReleaseInfo(
        array $result
    ): array {
        if (
            ! isset($result['schedule_id'])
        ) {
            return $result;
        }

        $schedule =
            ReleaseSchedule::query()
            ->find(
                $result['schedule_id']
            );

        if (! $schedule) {
            return $result;
        }

        $session =
            ReleaseSession::query()
            ->where(
                'release_schedule_id',
                $schedule->id
            )
            ->latest('id')
            ->first();

        $result['release'] = [
            'schedule_id' => $schedule->id,

            'type' => $schedule->type,

            'is_flexible' => (bool)
            $schedule->is_flexible,

            'scheduled_start' => $schedule->scheduled_start
                ? substr(
                    (string)
                    $schedule->scheduled_start,
                    0,
                    5
                )
                : null,

            'duration_minutes' => (int)
            $schedule->duration_minutes,

            'carry_over_minutes' => (int) ceil(
                $this->calculateCarryOverSeconds(
                    $schedule
                ) / 60
            ),

            'monitor_status' => $this->getMonitorStatus(
                $schedule,
                $session,
                (bool) (
                    $result['customer_active']
                    ?? false
                )
            ),

            'status_label' => $this->getStatusLabel(
                $schedule,
                $session,
                (bool) (
                    $result['customer_active']
                    ?? false
                )
            ),

            'session' => $session
                ? $this->formatSession(
                    $session,
                    $schedule
                )
                : null,
        ];

        return $result;
    }

    /**
     * ============================================================
     * FINISH OTOMATIS
     * ============================================================
     */
    private function finishAutomatically(
        ReleaseSession $session,
        ReleaseSchedule $schedule
    ): ReleaseSession {
        if (! $session->actual_start) {
            return $session;
        }

        $now = now();

        $duration =
            max(
                0,
                $session
                    ->actual_start
                    ->diffInSeconds(
                        $now
                    )
            );

        $allowed =
            $this->getAllowedDurationSeconds(
                $schedule
            );

        $status =
            $duration > $allowed
            ? 'overtime'
            : 'completed';

        $session->update([
            'actual_end' => $now,

            'duration_used_seconds' => $duration,

            'status' => $status,
        ]);

        return $session->fresh();
    }

    /**
     * ============================================================
     * STATUS SATU SCHEDULE
     * ============================================================
     */
    public function status(
        ReleaseSchedule $releaseSchedule
    ): JsonResponse {
        $session =
            ReleaseSession::query()
            ->where(
                'release_schedule_id',
                $releaseSchedule->id
            )
            ->latest('id')
            ->first();

        return response()->json([
            'success' => true,

            'schedule' => [
                'id' => $releaseSchedule->id,

                'agent_name' => $releaseSchedule->agent_name,

                'shift' => $releaseSchedule->shift,

                'date' => $releaseSchedule->date
                    ->format('Y-m-d'),

                'type' => $releaseSchedule->type,

                'scheduled_start' => $releaseSchedule->scheduled_start
                    ? substr(
                        $releaseSchedule->scheduled_start,
                        0,
                        5
                    )
                    : null,

                'scheduled_end' => $releaseSchedule->scheduled_end
                    ? substr(
                        $releaseSchedule->scheduled_end,
                        0,
                        5
                    )
                    : null,

                'duration_minutes' => (int)
                $releaseSchedule
                    ->duration_minutes,

                'is_flexible' => (bool)
                $releaseSchedule
                    ->is_flexible,

                'tolerance_minutes' => (int) (
                    $releaseSchedule
                    ->tolerance_minutes
                    ?? 5
                ),
            ],

            'session' => $session
                ? $this->formatSession(
                    $session,
                    $releaseSchedule
                )
                : null,

            'monitor_status' => $this->getMonitorStatus(
                $releaseSchedule,
                $session
            ),

            'status_label' => $this->getStatusLabel(
                $releaseSchedule,
                $session
            ),

            'server_time' => now()->format(
                'Y-m-d H:i:s'
            ),
        ]);
    }

    /**
     * ============================================================
     * MONITOR STATUS
     * ============================================================
     */
    private function getMonitorStatus(
        ReleaseSchedule $schedule,
        ?ReleaseSession $session,
        bool $customerActive = false
    ): string {
        if (
            $session?->status === 'completed'
        ) {
            return 'released';
        }

        if (
            $session?->status === 'overtime'
        ) {
            return 'overtime';
        }

        if (
            $session?->status === 'active'
        ) {
            return 'releasing';
        }

        if (
            $session?->status === 'missed'
        ) {
            return 'missed';
        }

        if ($schedule->is_flexible) {
            return 'upcoming';
        }

        $start =
            $this->getScheduledStart(
                $schedule
            );

        if (
            now()->lt($start)
        ) {
            return 'upcoming';
        }

        /*
          * ============================================================
          * TOLERANCE & MISSED
          * ============================================================
          *
          * Setelah jadwal masuk:
          *
          * 1. Selama CSO MASIH MENANGANI CUSTOMER
          *    (Talking / Digital Active) -> 'tolerance'
          *    TIDAK PERNAH missed selagi busy,
          *    konsisten dengan syncAgent
          *    (action: waiting_customer).
          *
          * 2. Selama masih dalam masa toleransi
          *    (scheduled_end + tolerance_minutes)
          *    -> 'tolerance'
          *
          * 3. Melewati masa toleransi dan BELUM ADA
          *    session aktif -> 'missed'
          */
        /*
         * CustomerActive eksplisit dari sync (Finesse realtime)
         * ATAU dari cache busy yang ditulis sync tiap 5 detik.
         * Keduanya satu sumber data, sehingga Monitor dan
         * Schedule tidak mungkin berbeda keputusan.
         */
        $busy = $customerActive
            || (bool) Cache::get(
                'release:busy:' . $schedule->agent_name,
                false
            );

        if ($busy) {
            return 'tolerance';
        }

        if (
            now()->gt(
                $this->getToleranceEnd(
                    $schedule,
                    $start
                )
            )
        ) {
            return 'missed';
        }

        return 'tolerance';
    }

    /**
     * ============================================================
     * TOLERANCE END
     * ============================================================
     *
     * Batas toleransi dihitung dari AKHIR window release
     * (scheduled_end), bukan dari scheduled_start.
     *
     * Mendukung jadwal lintas hari (23:50 -> 00:05).
     */
    private function getToleranceEnd(
        ReleaseSchedule $schedule,
        Carbon $start
    ): Carbon {
        $toleranceMinutes = (int) (
            $schedule->tolerance_minutes
            ?? 5
        );

        if (
            $schedule->scheduled_end
        ) {
            $endTime = substr(
                (string) $schedule->scheduled_end,
                0,
                8
            );

            if (
                strlen($endTime) === 5
            ) {
                $endTime .= ':00';
            }

            $endDate =
                $start
                ->format('Y-m-d');

            $end = Carbon::createFromFormat(
                'Y-m-d H:i:s',
                $endDate . ' ' . $endTime,
                'Asia/Makassar'
            );

            /*
             * Lintas tengah hari:
             * jika end < start, tambahkan 1 hari.
             */
            if (
                $end->lt($start)
            ) {
                $end->addDay();
            }

            return $end
                ->copy()
                ->addMinutes($toleranceMinutes);
        }

        return $start
            ->copy()
            ->addMinutes(
                (int) $schedule->duration_minutes
                    + $toleranceMinutes
            );
    }

    /**
     * ============================================================
     * STATUS LABEL
     * ============================================================
     */
    private function getStatusLabel(
        ReleaseSchedule $schedule,
        ?ReleaseSession $session,
        bool $customerActive = false
    ): string {
        if (
            $session?->status === 'completed'
        ) {
            return 'Sudah Release';
        }

        if (
            $session?->status === 'overtime'
        ) {
            return 'Overtime';
        }

        if (
            $session?->status === 'active'
        ) {
            return 'Sedang Release';
        }

        if (
            $session?->status === 'missed'
        ) {
            return 'Tidak Release';
        }

        if (
            $schedule->is_flexible
        ) {
            return 'Flexible';
        }

        if (
            now()->lt(
                $this->getScheduledStart(
                    $schedule
                )
            )
        ) {
            return 'Akan Release';
        }

        /*
         * CSO masih melayani customer:
         * alarm toleransi, bukan missed.
         *
         * Sumber data sama dengan getMonitorStatus:
         * customerActive dari sync realtime ATAU cache
         * busy yang ditulis /release-session/sync.
         */
        $busy = $customerActive
            || (bool) Cache::get(
                'release:busy:' . $schedule->agent_name,
                false
            );

        if ($busy) {
            return 'Menunggu Release';
        }

        if (
            now()->gt(
                $this->getToleranceEnd(
                    $schedule,
                    $this->getScheduledStart(
                        $schedule
                    )
                )
            )
        ) {
            return 'Tidak Release';
        }

        return 'Belum Release';
    }

    /**
     * ============================================================
     * SCHEDULE START
     * ============================================================
     *
     * Mendukung:
     *
     * 23:50 -> 00:05
     */
    private function getScheduledStart(
        ReleaseSchedule $schedule
    ): Carbon {
        $date =
            $schedule->date
            ->format('Y-m-d');

        $time =
            $schedule->scheduled_start
            ?: '00:00:00';

        /*
         * Normalisasi format time dari database.
         *
         * Bisa "08:00" atau "08:00:00".
         */
        $time = substr(
            (string) $time,
            0,
            8
        );

        if (
            strlen($time) === 5
        ) {
            $time .= ':00';
        }

        /*
         * Jadwal diinput dalam WITA (Asia/Makassar),
         * sedangkan aplikasi berjalan di UTC.
         *
         * Tanpa timezone eksplisit, jadwal 15:25 WITA
         * dianggap 15:25 UTC (23:25 WITA) sehingga
         * release tidak pernah terdeteksi.
         */
        $start = Carbon::createFromFormat(
            'Y-m-d H:i:s',
            $date . ' ' . $time,
            'Asia/Makassar'
        );

        /*
         * Dukungan Overnight Schedule:
         *
         * Shift J (16:00-01:00) dan Shift P (22:00-08:00):
         * Shift dimulai sore/malam pada tanggal Work Date ($schedule->date).
         * Slot release setelah midnight (jam dini hari < 12:00, contoh 00:30, 02:15, 05:00)
         * secara fisik jatuh pada tanggal kalender berikutnya ($date + 1 hari).
         *
         * Shift R:
         * SELURUH jam schedule jatuh pada tanggal berikutnya ($date + 1 hari).
         */
        if (
            $schedule->shift === 'R'
            || (
                in_array($schedule->shift, ['J', 'P'], true)
                && (int) substr($time, 0, 2) < 12
            )
        ) {
            $start->addDay();
        }

        return $start;
    }

    /**
     * ============================================================
     * BOUNDED ELAPSED (WORK DATE FREEZE)
     * ============================================================
     *
     * Elapsed session dihitung dari actual_start sampai:
     *
     * - now() jika belum melewati batas Work Date, atau
     * - batas Work Date/end shift jika sudah melewatinya.
     *
     * Tujuannya: session active/overtime yang ditinggal
     * setelah end shift TIDAK terus menambah duration tanpa
     * batas. Status session tetap seperti sekarang (tidak
     * diubah menjadi completed), hanya perhitungan elapsed
     * yang dibekukan.
     *
     * Batas yang dipakai adalah akhir window hari kerja
     * (akhir shift + toleransi). Untuk shift overnight (J/P/R)
     * batas ini otomatis jatuh pada tanggal kalender
     * berikutnya, sehingga session yang benar-benar masih
     * berjalan di dini hari tetap terhitung.
     *
     * Wrapper publik agar ReleaseScheduleController dapat
     * memakai perhitungan elapsed yang sama (single source
     * of truth) tanpa menduplikasi logika.
     */
    public function boundedElapsedSeconds(
        ReleaseSession $session,
        ReleaseSchedule $schedule
    ): int {
        return $this->getBoundedElapsedSeconds(
            $session,
            $schedule
        );
    }

    private function getBoundedElapsedSeconds(
        ReleaseSession $session,
        ReleaseSchedule $schedule
    ): int {
        if (! $session->actual_start) {
            return 0;
        }

        /*
         * PENTING: actual_start disimpan/cast dalam UTC,
         * sedangkan batas Work Date dibangun dalam
         * Asia/Makassar. Membandingkan keduanya langsung akan
         * menghasilkan selisih 8 jam karena perbedaan
         * timezone. Karena itu perbandingan dilakukan pada
         * timestamp absolut (Unix), bukan pada komponen
         * tanggal/waktu lokal.
         */
        $startTs = $session->actual_start->getTimestamp();

        /*
         * Batas akhir: akhir window slot + toleransi.
         * getToleranceEnd() sudah menangani overnight.
         */
        $boundary = $this->getToleranceEnd(
            $schedule,
            $this->getScheduledStart($schedule)
        );

        $boundaryTs = $boundary->getTimestamp();

        $referenceTs = min(
            now()->getTimestamp(),
            $boundaryTs
        );

        return max(0, $referenceTs - $startTs);
    }

    /**
     * ============================================================
     * ALLOWED DURATION
     * ============================================================
     *
     * Hak release:
     *
     * 15 menit
     *
     * + carry-over slot sebelumnya.
     */
    private function getAllowedDurationSeconds(
        ReleaseSchedule $schedule,
        $allSchedules = null
    ): int {
        $base =
            (int)
            $schedule->duration_minutes
            * 60;

        if ($schedule->is_flexible) {
            return $base;
        }

        $carry =
            $this->calculateCarryOverSeconds(
                $schedule,
                $allSchedules
            );

        return $base + $carry;
    }

    /**
     * ============================================================
     * CARRY OVER
     * ============================================================
     *
     * Contoh:
     *
     * Slot 1:
     * Hak 15
     * Dipakai 10
     *
     * Sisa 5
     *
     * Slot 2:
     * Hak 15 + 5
     *
     * = 20 menit
     */
    private function calculateCarryOverSeconds(
        ReleaseSchedule $schedule,
        $allSchedules = null
    ): int {
        if ($schedule->is_flexible) {
            return 0;
        }

        /*
         * ====================================================
         * REUSE EAGER-LOADED DATA (HILANGKAN N+1)
         * ====================================================
         *
         * Jika pemanggil sudah menyediakan koleksi schedule
         * (mis. $items dari halaman Schedule Index yang sudah
         * di-eager-load beserta sessions), pakai itu.
         *
         * Jika belum, query sekali saja — bukan per slot.
         *
         * Hasil carry-over TIDAK berubah: urutan dan filter
         * tetap sama seperti sebelumnya.
         */
        if ($allSchedules !== null) {
            $previousSchedules = collect($allSchedules)
                ->filter(function (ReleaseSchedule $item) use ($schedule) {
                    return $item->agent_name === $schedule->agent_name
                        && $item->shift === $schedule->shift
                        && $item->date->format('Y-m-d')
                        === $schedule->date->format('Y-m-d')
                        && (bool) $item->active
                        && ! (bool) $item->is_flexible;
                })
                ->sortBy([
                    ['scheduled_start', 'asc'],
                    ['id', 'asc'],
                ])
                ->values();
        } else {
            $previousSchedules =
                ReleaseSchedule::query()
                ->where(
                    'agent_name',
                    $schedule->agent_name
                )
                ->where(
                    'shift',
                    $schedule->shift
                )
                ->whereDate(
                    'date',
                    $schedule->date
                )
                ->where(
                    'active',
                    true
                )
                ->where(
                    'is_flexible',
                    false
                )
                ->with([
                    'sessions' => function ($query) {
                        $query->orderByDesc('id');
                    },
                ])
                ->orderBy(
                    'scheduled_start'
                )
                ->orderBy('id')
                ->get();
        }

        $carrySeconds = 0;

        foreach (
            $previousSchedules as $previous
        ) {
            if (
                $previous->id ===
                $schedule->id
            ) {
                break;
            }

            /*
             * Ambil session terbaru dari relasi yang sudah
             * dimuat (eager-loaded) bila tersedia; kalau tidak,
             * baru query. Hasil tetap sama: session dengan
             * id terbesar.
             */
            $previousSession = $previous->relationLoaded(
                'sessions'
            )
                ? $previous->sessions->first()
                : ReleaseSession::query()
                ->where(
                    'release_schedule_id',
                    $previous->id
                )
                ->latest('id')
                ->first();

            /*
             * Belum release:
             * jangan memindahkan saldo.
             */
            if (! $previousSession) {
                continue;
            }

            /*
             * Missed:
             * tidak menghasilkan carry.
             */
            if (
                $previousSession->status ===
                'missed'
            ) {
                $carrySeconds = 0;

                continue;
            }

            /*
             * Overtime:
             * hak sudah habis.
             */
            if (
                $previousSession->status ===
                'overtime'
            ) {
                $carrySeconds = 0;

                continue;
            }

            if (
                $previousSession->status !==
                'completed'
            ) {
                continue;
            }

            $previousAllowed =
                (
                    (int)
                    $previous->duration_minutes
                    * 60
                )
                + $carrySeconds;

            $used =
                max(
                    0,
                    (int)
                    $previousSession
                        ->duration_used_seconds
                );

            $carrySeconds =
                max(
                    0,
                    $previousAllowed
                        - $used
                );
        }

        return $carrySeconds;
    }

    /**
     * ============================================================
     * REMAINING
     * ============================================================
     */
    private function getRemainingSeconds(
        ReleaseSchedule $schedule,
        ReleaseSession $session,
        $allSchedules = null
    ): int {
        $allowed =
            $this->getAllowedDurationSeconds(
                $schedule,
                $allSchedules
            );

        return max(
            0,
            $allowed
                - (int)
                $session
                    ->duration_used_seconds
        );
    }

    /**
     * ============================================================
     * FORMAT SESSION (PUBLIC)
     * ============================================================
     * Dipakai juga oleh ReleaseScheduleController agar kedua
     * halaman membaca session dari formatter yang sama persis
     * (single source of truth).
     */
    public function formatSession(
        ReleaseSession $session,
        ReleaseSchedule $schedule,
        $allSchedules = null
    ): array {
        $allowed =
            $this->getAllowedDurationSeconds(
                $schedule,
                $allSchedules
            );

        $used =
            (int)
            $session->duration_used_seconds;

        if (
            in_array(
                $session->status,
                [
                    'active',
                    'overtime',
                ],
                true
            )
            && $session->actual_start
        ) {
            /*
             * Elapsed dibekukan pada batas Work Date/end shift
             * agar session yang ditinggal tidak membengkak
             * lintas hari.
             */
            $used = $this->getBoundedElapsedSeconds(
                $session,
                $schedule
            );
        }

        return [
            'id' => $session->id,

            'release_schedule_id' => $session
                ->release_schedule_id,

            'agent_name' => $session->agent_name,

            'actual_start' => $session->actual_start
                ? $session
                ->actual_start
                /*
                         * ISO-8601 UTC agar new Date() di
                         * frontend menghitung timer dengan
                         * benar di timezone browser mana pun.
                         */
                ->format('Y-m-d\\TH:i:s\\Z')
                : null,

            'actual_end' => $session->actual_end
                ? $session
                ->actual_end
                ->format('Y-m-d\\TH:i:s\\Z')
                : null,

            'duration_used_seconds' => $used,

            'status' => $session->status,

            'allowed_duration_seconds' => $allowed,

            'allowed_duration_minutes' => (int)
            ceil(
                $allowed / 60
            ),

            'remaining_seconds' => max(
                0,
                $allowed - $used
            ),
        ];
    }
}
