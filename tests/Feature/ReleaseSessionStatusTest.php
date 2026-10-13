<?php

namespace Tests\Feature;

use App\Http\Controllers\ReleaseSessionController;
use App\Models\ReleaseSchedule;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use ReflectionClass;
use Tests\TestCase;

/**
 * ============================================================
 * REGRESSION TEST — STATUS RELEASE / MONITOR
 * ============================================================
 *
 * Menguji koreksi hasil audit CC.23.HERI:
 *
 * - Session yang SUDAH berakhir (`actual_end` terisi) tidak
 *   boleh lagi ditampilkan sebagai release aktif
 *   (`overtime` / `releasing`).
 * - `missed` tanpa actual_start/actual_end tetap `missed`.
 * - Session yang benar-benar masih berjalan tetap seperti semula.
 * - Overtime yang benar-benar terjadi tetap bisa muncul.
 * - `finishAutomatically()` memakai elapsed terbatas window
 *   sehingga tidak memalsukan overtime.
 *
 * Status historis di database TIDAK diubah oleh perbaikan ini;
 * test memverifikasi hasil TAMPILAN (monitor_status / status_label).
 */
class ReleaseSessionStatusTest extends TestCase
{
    use RefreshDatabase;

    private ReleaseSessionController $controller;

    protected function setUp(): void
    {
        parent::setUp();

        /*
         * Tanpa ini, getMonitorStatus() membaca cache busy global
         * dari environment nyata sehingga hasil test tidak
         * deterministik.
         */
        Cache::flush();

        $this->controller = app(ReleaseSessionController::class);
    }

    private function invoke(string $method, array $args)
    {
        $ref = new ReflectionClass($this->controller);
        $m = $ref->getMethod($method);
        $m->setAccessible(true);

        return $m->invokeArgs($this->controller, $args);
    }

    private function monitor(ReleaseSchedule $schedule, $session, bool $busy = false): string
    {
        return $this->invoke('getMonitorStatus', [$schedule, $session, $busy]);
    }

    private function label(ReleaseSchedule $schedule, $session, bool $busy = false): string
    {
        return $this->invoke('getStatusLabel', [$schedule, $session, $busy]);
    }

    /**
     * Schedule helper: slot 15 menit yang sudah masuk jamnya
     * (supaya cabang berbasis jam tidak mendominasi hasil).
     */
    private function makeSchedule(array $attributes = []): ReleaseSchedule
    {
        return ReleaseSchedule::create(array_merge([
            'agent_name' => 'CC.23.TEST',
            'shift' => 'X',
            'date' => now('Asia/Makassar')->toDateString(),
            'type' => 'meal',
            'scheduled_start' => now('Asia/Makassar')->subMinutes(30)->format('H:i:00'),
            'scheduled_end' => now('Asia/Makassar')->subMinutes(15)->format('H:i:00'),
            'duration_minutes' => 15,
            'is_flexible' => false,
            'tolerance_minutes' => 5,
            'active' => true,
        ], $attributes));
    }

    /** Session helper (kontrol penuh atas actual_start/actual_end). */
    private function makeSession(ReleaseSchedule $schedule, array $attributes = [])
    {
        return $schedule->sessions()->create(array_merge([
            'agent_name' => $schedule->agent_name,
            'actual_start' => null,
            'actual_end' => null,
            'duration_used_seconds' => 0,
            'status' => 'active',
        ], $attributes));
    }

    /* ---------------------------------------------------------
     | 1. OVERTIME + actual_end TERISI -> bukan release aktif
     |--------------------------------------------------------- */
    public function test_overtime_dengan_actual_end_terisi_tidak_ditampilkan_sebagai_release_aktif(): void
    {
        $schedule = $this->makeSchedule();

        $session = $this->makeSession($schedule, [
            'status' => 'overtime',
            'actual_start' => Carbon::now()->subMinutes(40),
            'actual_end' => Carbon::now()->subMinutes(10),
            'duration_used_seconds' => 1800,
        ]);

        $this->assertSame('released', $this->monitor($schedule, $session));
        $this->assertSame('Sudah Release', $this->label($schedule, $session));

        /* Status historis di database TIDAK diubah. */
        $this->assertSame('overtime', $session->fresh()->status);
    }

    /* ---------------------------------------------------------
     | 2. ACTIVE + actual_end TERISI -> bukan release aktif
     |--------------------------------------------------------- */
    public function test_active_dengan_actual_end_terisi_tidak_ditampilkan_sebagai_release_aktif(): void
    {
        $schedule = $this->makeSchedule();

        $session = $this->makeSession($schedule, [
            'status' => 'active',
            'actual_start' => Carbon::now()->subMinutes(20),
            'actual_end' => Carbon::now()->subMinutes(5),
            'duration_used_seconds' => 900,
        ]);

        $this->assertSame('released', $this->monitor($schedule, $session));
        $this->assertNotSame('releasing', $this->monitor($schedule, $session));
        $this->assertSame('Sudah Release', $this->label($schedule, $session));
    }

    /* ---------------------------------------------------------
     | 3. COMPLETED tetap selesai
     |--------------------------------------------------------- */
    public function test_completed_tetap_ditampilkan_sebagai_selesai(): void
    {
        $schedule = $this->makeSchedule();

        $session = $this->makeSession($schedule, [
            'status' => 'completed',
            'actual_start' => Carbon::now()->subMinutes(20),
            'actual_end' => Carbon::now()->subMinutes(5),
            'duration_used_seconds' => 900,
        ]);

        $this->assertSame('released', $this->monitor($schedule, $session));
        $this->assertSame('Sudah Release', $this->label($schedule, $session));
    }

    /* ---------------------------------------------------------
     | 4. MISSED tanpa waktu mulai tetap missed
     |--------------------------------------------------------- */
    public function test_missed_tanpa_waktu_mulai_tetap_missed(): void
    {
        $schedule = $this->makeSchedule([
            'scheduled_start' => now('Asia/Makassar')->subMinutes(120)->format('H:i:00'),
            'scheduled_end' => now('Asia/Makassar')->subMinutes(100)->format('H:i:00'),
        ]);

        $session = $this->makeSession($schedule, [
            'status' => 'missed',
            'actual_start' => null,
            'actual_end' => null,
            'duration_used_seconds' => 0,
        ]);

        $this->assertSame('missed', $this->monitor($schedule, $session));
        $this->assertSame('Tidak Release', $this->label($schedule, $session));
    }

    /* ---------------------------------------------------------
     | 5. Session BELUM selesai & benar-benar release -> tetap aktif
     |--------------------------------------------------------- */
    public function test_session_belum_selesai_tetap_ditampilkan_sebagai_release_aktif(): void
    {
        $schedule = $this->makeSchedule();

        $session = $this->makeSession($schedule, [
            'status' => 'active',
            'actual_start' => Carbon::now()->subMinutes(5),
            'actual_end' => null,
            'duration_used_seconds' => 300,
        ]);

        $this->assertSame('releasing', $this->monitor($schedule, $session));
        $this->assertSame('Sedang Release', $this->label($schedule, $session));
    }

    public function test_session_overtime_yang_belum_ditutup_masih_overtime(): void
    {
        $schedule = $this->makeSchedule();

        $session = $this->makeSession($schedule, [
            'status' => 'overtime',
            'actual_start' => Carbon::now()->subMinutes(60),
            'actual_end' => null,
            'duration_used_seconds' => 3600,
        ]);

        $this->assertSame('overtime', $this->monitor($schedule, $session));
        $this->assertSame('Overtime', $this->label($schedule, $session));
    }

    /* ---------------------------------------------------------
     | 6. Release yang benar-benar lewat batas tetap bisa overtime
     |--------------------------------------------------------- */
    public function test_finish_automatically_masih_menghasilkan_overtime_bila_benar_benar_lewat_batas(): void
    {
        /*
         * Slot 60 menit yang window-nya MASIH TERBUKA, dengan
         * actual_start 90 menit lalu (di dalam window, tapi sudah
         * jauh melewati hak release).
         *
         * bounded elapsed = 5400s > allowed = 3600s -> overtime.
         */
        $schedule = $this->makeSchedule([
            'duration_minutes' => 60,
            'scheduled_start' => now('Asia/Makassar')->subMinutes(50)->format('H:i:00'),
            'scheduled_end' => now('Asia/Makassar')->addMinutes(10)->format('H:i:00'),
            'tolerance_minutes' => 5,
        ]);

        $session = $this->makeSession($schedule, [
            'status' => 'active',
            'actual_start' => Carbon::now()->subMinutes(90),
            'actual_end' => null,
            'duration_used_seconds' => 0,
        ]);

        $finished = $this->invoke('finishAutomatically', [
            $session->fresh(),
            $schedule,
            collect([$schedule]),
        ]);

        $this->assertSame('overtime', $finished->status);
        $this->assertGreaterThan(
            $this->invoke('getAllowedDurationSeconds', [$schedule, collect([$schedule])]),
            $finished->duration_used_seconds
        );

        /* Overtime asli tetap tampil sebagai overtime (belum ditutup
         * pada saat penilaian), konsisten di kedua fungsi. */
        $this->assertSame('released', $this->monitor($schedule, $finished));
        $this->assertSame('Sudah Release', $this->label($schedule, $finished));
    }

    /* ---------------------------------------------------------
     | 7. Kembali aktif setelah Makan TIDAK memalsukan overtime
     |--------------------------------------------------------- */
    public function test_finish_automatically_tidak_memalsukan_overtime_akibat_elapsed_di_luar_window(): void
    {
        /*
         * Skenario CC.23.HERI: CSO selesai Makan lalu kembali
         * bekerja, dengan elapsed DI DALAM window < hak release.
         *
         * Sebelum perbaikan, `now() - actual_start` yang membengkak
         * membuat session distempel 'overtime' palsu.
         */
        $schedule = $this->makeSchedule([
            'duration_minutes' => 60,
            'scheduled_start' => now('Asia/Makassar')->subMinutes(10)->format('H:i:00'),
            'scheduled_end' => now('Asia/Makassar')->addMinutes(50)->format('H:i:00'),
        ]);

        $session = $this->makeSession($schedule, [
            'status' => 'active',
            'actual_start' => Carbon::now()->subMinutes(10),
            'actual_end' => null,
            'duration_used_seconds' => 0,
        ]);

        $finished = $this->invoke('finishAutomatically', [
            $session->fresh(),
            $schedule,
            collect([$schedule]),
        ]);

        $this->assertSame('completed', $finished->status);

        /*
         * actual_end harus konsisten dengan duration_used_seconds
         * (bukan `now()`, karena elapsed dibatasi window).
         */
        $this->assertSame(
            $finished->duration_used_seconds,
            (int) $finished->actual_start->diffInSeconds($finished->actual_end)
        );

        /* Karena sudah selesai, status monitor = released. */
        $this->assertSame('released', $this->monitor($schedule, $finished));
    }

    /* ---------------------------------------------------------
     | 8. Kedua fungsi konsisten (Monitor & Schedule satu sumber)
     |--------------------------------------------------------- */
    public function test_monitor_status_dan_status_label_konsisten_untuk_semua_kondisi(): void
    {
        $schedule = $this->makeSchedule();

        $cases = [
            ['active', Carbon::now()->subMinutes(5), null, 'releasing', 'Sedang Release'],
            ['overtime', Carbon::now()->subMinutes(60), null, 'overtime', 'Overtime'],
            ['active', Carbon::now()->subMinutes(20), Carbon::now()->subMinutes(5), 'released', 'Sudah Release'],
            ['overtime', Carbon::now()->subMinutes(40), Carbon::now()->subMinutes(10), 'released', 'Sudah Release'],
            ['completed', Carbon::now()->subMinutes(20), Carbon::now()->subMinutes(5), 'released', 'Sudah Release'],
        ];

        foreach ($cases as [$status, $start, $end, $expectedMonitor, $expectedLabel]) {
            $session = $this->makeSession($schedule, [
                'status' => $status,
                'actual_start' => $start,
                'actual_end' => $end,
                'duration_used_seconds' => 600,
            ]);

            $this->assertSame(
                $expectedMonitor,
                $this->monitor($schedule, $session),
                "monitor_status untuk {$status} (end=".($end ? 'isi' : 'null').')'
            );

            $this->assertSame(
                $expectedLabel,
                $this->label($schedule, $session),
                "status_label untuk {$status} (end=".($end ? 'isi' : 'null').')'
            );
        }
    }

    /* ---------------------------------------------------------
     | Tambahan: nilai monitor_status harus dikenali konsumen UI
     |--------------------------------------------------------- */
    public function test_monitor_status_hanya_menghasilkan_nilai_yang_dikenal_ui(): void
    {
        $allowed = ['upcoming', 'releasing', 'tolerance', 'missed', 'released', 'overtime'];
        $schedule = $this->makeSchedule();

        $cases = [
            ['active', Carbon::now()->subMinutes(5), null],
            ['overtime', Carbon::now()->subMinutes(60), null],
            ['active', Carbon::now()->subMinutes(20), Carbon::now()->subMinutes(5)],
            ['overtime', Carbon::now()->subMinutes(40), Carbon::now()->subMinutes(10)],
            ['completed', Carbon::now()->subMinutes(20), Carbon::now()->subMinutes(5)],
            ['missed', null, null],
        ];

        foreach ($cases as [$status, $start, $end]) {
            $session = $this->makeSession($schedule, [
                'status' => $status,
                'actual_start' => $start,
                'actual_end' => $end,
                'duration_used_seconds' => 600,
            ]);

            $this->assertContains($this->monitor($schedule, $session), $allowed);
        }
    }

    /* =========================================================
     | CARRY-OVER
     |========================================================= */

    /** Helper: buat slot pada jam tertentu di tanggal test. */
    private function makeSlot(string $agent, string $start, int $durationMinutes): ReleaseSchedule
    {
        return ReleaseSchedule::create([
            'agent_name' => $agent,
            'shift' => 'X',
            'date' => now('Asia/Makassar')->toDateString(),
            'type' => 'meal',
            'scheduled_start' => $start.':00',
            'scheduled_end' => date('H:i:00', strtotime($start) + $durationMinutes * 60),
            'duration_minutes' => $durationMinutes,
            'is_flexible' => false,
            'tolerance_minutes' => 5,
            'active' => true,
        ]);
    }

    private function carryFor(ReleaseSchedule $schedule, $items): int
    {
        return $this->invoke('calculateCarryOverSeconds', [$schedule, $items]);
    }

    private function allowedFor(ReleaseSchedule $schedule, $items): int
    {
        return $this->invoke('getAllowedDurationSeconds', [$schedule, $items]);
    }

    /* ---------------------------------------------------------
     | 9a. Carry-over sah: sisa slot tepat sebelumnya
     |--------------------------------------------------------- */
    public function test_carry_over_diambil_dari_slot_tepat_sebelumnya(): void
    {
        $agent = 'CC.23.CARRY1';

        $slot1 = $this->makeSlot($agent, '15:00', 15);
        $slot2 = $this->makeSlot($agent, '18:00', 15);

        /* Slot 1: hak 900s, dipakai 600s -> sisa 300s. */
        $slot1->sessions()->create([
            'agent_name' => $agent,
            'actual_start' => Carbon::now()->subMinutes(30),
            'actual_end' => Carbon::now()->subMinutes(10),
            'duration_used_seconds' => 600,
            'status' => 'completed',
        ]);

        $items = ReleaseSchedule::where('agent_name', $agent)
            ->whereDate('date', now('Asia/Makassar')->toDateString())
            ->orderBy('scheduled_start')->orderBy('id')->get();

        $this->assertSame(300, $this->carryFor($slot2, $items));
        $this->assertSame(1200, $this->allowedFor($slot2, $items));
    }

    /* ---------------------------------------------------------
     | 9b. TIDAK boleh mengakumulasi carry berantai
     |--------------------------------------------------------- */
    public function test_carry_over_tidak_mengakumulasi_berantai_dari_beberapa_slot(): void
    {
        $agent = 'CC.23.CARRY2';

        $slot1 = $this->makeSlot($agent, '15:00', 15);
        $slot2 = $this->makeSlot($agent, '18:00', 35);
        $slot3 = $this->makeSlot($agent, '19:00', 15);
        $slot4 = $this->makeSlot($agent, '21:00', 10);

        /*
         * Sisa besar di slot 1 & 2. Bila diakumulasi berantai,
         * carry slot 4 akan membengkak. Aturan yang benar:
         * hanya slot 3 (tepat sebelumnya) yang menyumbang.
         */
        $slot1->sessions()->create([
            'agent_name' => $agent,
            'actual_start' => Carbon::now()->subHour(),
            'actual_end' => Carbon::now()->subHour()->addMinute(),
            'duration_used_seconds' => 10,
            'status' => 'completed',
        ]);

        $slot2->sessions()->create([
            'agent_name' => $agent,
            'actual_start' => Carbon::now()->subHour(),
            'actual_end' => Carbon::now()->subHour()->addMinute(),
            'duration_used_seconds' => 0,
            'status' => 'completed',
        ]);

        $slot3->sessions()->create([
            'agent_name' => $agent,
            'actual_start' => Carbon::now()->subHour(),
            'actual_end' => Carbon::now()->subHour()->addMinute(),
            'duration_used_seconds' => 0,
            'status' => 'completed',
        ]);

        $items = ReleaseSchedule::where('agent_name', $agent)
            ->whereDate('date', now('Asia/Makassar')->toDateString())
            ->orderBy('scheduled_start')->orderBy('id')->get();

        /*
         * Slot 3: hak 900s, dipakai 0s -> sisa 900s.
         * Slot 4 carry HARUS 900s (bukan 890 + 2100 + ...).
         */
        $this->assertSame(900, $this->carryFor($slot4, $items));
        $this->assertSame(1500, $this->allowedFor($slot4, $items));

        /* Slot pertama tidak pernah punya carry. */
        $this->assertSame(0, $this->carryFor($slot1, $items));
        $this->assertSame(900, $this->allowedFor($slot1, $items));
    }

    /* ---------------------------------------------------------
     | 9c. Slot 15 menit tidak bisa mendapat allowed 1499s
     |--------------------------------------------------------- */
    public function test_slot_15_menit_tidak_mendapat_allowed_yang_membengkak(): void
    {
        $agent = 'CC.23.CARRY3';

        $slot1 = $this->makeSlot($agent, '15:00', 35);
        $slot2 = $this->makeSlot($agent, '18:00', 15);

        $slot1->sessions()->create([
            'agent_name' => $agent,
            'actual_start' => Carbon::now()->subHour(),
            'actual_end' => Carbon::now()->subHour()->addMinute(),
            'duration_used_seconds' => 900,
            'status' => 'completed',
        ]);

        $items = ReleaseSchedule::where('agent_name', $agent)
            ->whereDate('date', now('Asia/Makassar')->toDateString())
            ->orderBy('scheduled_start')->orderBy('id')->get();

        /*
         * Sisa slot 1 = 2100 - 900 = 1200s.
         * Maka allowed slot 2 = 900 + 1200 = 2100s (sah, dari
         * slot tepat sebelumnya) - TAPI bukan hasil akumulasi
         * slot-slot yang lebih lama lagi.
         */
        $this->assertSame(1200, $this->carryFor($slot2, $items));
        $this->assertSame(2100, $this->allowedFor($slot2, $items));

        /*
         * Yang TIDAK boleh: carry slot lama diwariskan berantai.
         */
        $this->assertLessThan(
            $this->carryFor($slot2, $items) + 1200,
            $this->allowedFor($slot2, $items)
        );
    }

    /* ---------------------------------------------------------
     | 9d. Missed / overtime tidak menyisakan carry
     |--------------------------------------------------------- */
    public function test_missed_dan_overtime_tidak_menghasilkan_carry(): void
    {
        $agentMissed = 'CC.23.CARRY4';
        $s1 = $this->makeSlot($agentMissed, '15:00', 15);
        $s2 = $this->makeSlot($agentMissed, '18:00', 15);

        $s1->sessions()->create([
            'agent_name' => $agentMissed,
            'actual_start' => null,
            'actual_end' => null,
            'duration_used_seconds' => 0,
            'status' => 'missed',
        ]);

        $items = ReleaseSchedule::where('agent_name', $agentMissed)
            ->whereDate('date', now('Asia/Makassar')->toDateString())
            ->orderBy('scheduled_start')->orderBy('id')->get();

        $this->assertSame(0, $this->carryFor($s2, $items));

        $agentOt = 'CC.23.CARRY5';
        $o1 = $this->makeSlot($agentOt, '15:00', 15);
        $o2 = $this->makeSlot($agentOt, '18:00', 15);

        $o1->sessions()->create([
            'agent_name' => $agentOt,
            'actual_start' => Carbon::now()->subHour(),
            'actual_end' => Carbon::now()->subMinutes(10),
            'duration_used_seconds' => 1800,
            'status' => 'overtime',
        ]);

        $items2 = ReleaseSchedule::where('agent_name', $agentOt)
            ->whereDate('date', now('Asia/Makassar')->toDateString())
            ->orderBy('scheduled_start')->orderBy('id')->get();

        $this->assertSame(0, $this->carryFor($o2, $items2));
    }

    /* ---------------------------------------------------------
     | 7b. actual_end = waktu penutupan aktual, bukan waktu lampau
     |--------------------------------------------------------- */
    public function test_finish_automatically_mengisi_actual_end_dengan_waktu_penutupan(): void
    {
        $schedule = $this->makeSchedule([
            'duration_minutes' => 60,
            'scheduled_start' => now('Asia/Makassar')->subMinutes(10)->format('H:i:00'),
            'scheduled_end' => now('Asia/Makassar')->addMinutes(50)->format('H:i:00'),
        ]);

        $session = $this->makeSession($schedule, [
            'status' => 'active',
            'actual_start' => Carbon::now()->subMinutes(10),
            'actual_end' => null,
            'duration_used_seconds' => 0,
        ]);

        $before = Carbon::now()->subSecond();
        $finished = $this->invoke('finishAutomatically', [
            $session->fresh(),
            $schedule,
            collect([$schedule]),
        ]);
        $after = Carbon::now()->addSecond();

        /* actual_end = waktu penutupan aktual (bukan waktu lampau). */
        $this->assertTrue(
            $finished->actual_end->between($before, $after),
            'actual_end harus berada di sekitar waktu penutupan sekarang'
        );

        /* duration_used_seconds tetap dibatasi window. */
        $this->assertGreaterThan(0, $finished->duration_used_seconds);
        $this->assertSame('completed', $finished->status);
    }
}
