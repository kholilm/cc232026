<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use RuntimeException;

class FinesseService
{
    private string $url =
    'http://10.14.155.34/dashboardv3/cubemap/getdataJsonCall';

    private string $digitalUrl =
    'http://10.14.155.34/dashboardv3/cubemap/getJsonDigital';

    /**
     * =========================================================
     * VOICE / FINESSE
     * =========================================================
     *
     * Sumber Voice tetap sama.
     *
     * Tidak mengubah:
     * - duration
     * - READY
     * - NOTREADY
     * - HANDLED
     * - status Voice
     * - reason Voice
     * - extension
     */
    public function getAgents(int $unit = 23): array
    {
        $data = $this->fetchVoiceData();

        return collect($data['tempData'] ?? [])
            ->filter(function ($agent) use ($unit) {
                return (int) ($agent['UNIT'] ?? 0) === $unit;
            })
            ->values()
            ->all();
    }

    /**
     * =========================================================
     * FETCH VOICE RESPONSE (1 HTTP call)
     * =========================================================
     *
     * Response yang sama juga berisi dataAuxiliary
     * (LoginName / UNIT / TOILET / MAKAN / SHOLAT) yang
     * dipakai Cubemap. Diparse di getCombined tanpa
     * HTTP call tambahan.
     */
    private function fetchVoiceData(): array
    {
        $response = Http::timeout(10)->post($this->url);

        if (!$response->successful()) {
            throw new RuntimeException(
                'Gagal mengambil data Finesse. HTTP: ' .
                    $response->status()
            );
        }

        $data = $response->json();

        if (!is_array($data)) {
            throw new RuntimeException(
                'Response Finesse bukan JSON yang valid.'
            );
        }

        return $data;
    }

    /**
     * =========================================================
     * AUXILIARY (SUMBER SAMA DENGAN CUBEMAP)
     * =========================================================
     *
     * Parse dataAuxiliary dari response voice, lalu hitung:
     * - menit per kategori (detik -> menit, floor)
     * - total_aux_minutes
     * - sisa_aux_minutes (quota - total, min 0)
     */
    private function parseAuxiliary($raw): ?array
    {
        if (is_string($raw)) {
            $decoded = json_decode($raw, true);
            $raw = is_array($decoded) ? $decoded : null;
        }

        if (!is_array($raw)) {
            return null;
        }

        $toilet = max(0, (int) ($raw['TOILET'] ?? 0));
        $makan = max(0, (int) ($raw['MAKAN'] ?? 0));
        $sholat = max(0, (int) ($raw['SHOLAT'] ?? 0));

        $toiletMinutes = (int) floor($toilet / 60);
        $makanMinutes = (int) floor($makan / 60);
        $sholatMinutes = (int) floor($sholat / 60);

        $totalAuxMinutes = $toiletMinutes + $makanMinutes + $sholatMinutes;

        $quotaMinutes = (int) config(
            'finesse.aux_quota_minutes',
            env('FINESSE_AUX_QUOTA_MINUTES', 90)
        );

        return [
            'toilet_minutes' => $toiletMinutes,
            'makan_minutes' => $makanMinutes,
            'sholat_minutes' => $sholatMinutes,
            'total_aux_minutes' => $totalAuxMinutes,
            'sisa_aux_minutes' => max(0, $quotaMinutes - $totalAuxMinutes),
            'quota_minutes' => $quotaMinutes,
        ];
    }

    /**
     * =========================================================
     * DIGITAL / NON-VOICE
     * =========================================================
     */
    public function getDigital(int $unit = 23): array
    {
        $response = Http::timeout(10)->post($this->digitalUrl);

        if (!$response->successful()) {
            throw new RuntimeException(
                'Gagal mengambil data Digital. HTTP: ' .
                    $response->status()
            );
        }

        $data = $response->json();

        if (!is_array($data)) {
            throw new RuntimeException(
                'Response Digital bukan JSON yang valid.'
            );
        }

        $digitalAgents = $data['dataNonvoice'] ?? [];

        if (!is_array($digitalAgents)) {
            return [];
        }

        $prefix = 'CC.' . $unit . '.';

        return collect($digitalAgents)
            ->filter(function ($agent) use ($prefix) {
                $name = trim(
                    (string) ($agent['LastName'] ?? '')
                );

                return str_starts_with(
                    strtoupper($name),
                    strtoupper($prefix)
                );
            })
            ->values()
            ->all();
    }

    /**
     * =========================================================
     * CACHE KEY PER CSO
     * =========================================================
     */
    private function cacheKey(
        string $name,
        string $suffix
    ): string {
        $normalizedName = strtoupper(trim($name));

        $normalizedName = preg_replace(
            '/[^A-Z0-9]+/',
            '_',
            $normalizedName
        );

        return strtolower(
            trim($normalizedName, '_')
        ) . '_' . $suffix;
    }

    /**
     * =========================================================
     * COMBINED VOICE + DIGITAL
     * =========================================================
     *
     * Aturan Digital:
     *
     * RESERVED + CallInProgress > 0
     *
     * Digital Session Timer:
     *
     * START :
     * session belum ada + Digital aktif
     *
     * ACTIVE :
     * started_at ada + CallInProgress > 0
     *
     * END :
     * started_at ada + CallInProgress = 0
     *
     * AgentState NOTAVAILABLE tidak otomatis
     * mengakhiri Digital session.
     */
    public function getCombined(int $unit = 23): array
    {
        $voiceData = $this->fetchVoiceData();

        $voice = collect($voiceData['tempData'] ?? [])
            ->filter(function ($agent) use ($unit) {
                return (int) ($agent['UNIT'] ?? 0) === $unit;
            })
            ->values()
            ->all();

        $digital = $this->getDigital($unit);

        /**
         * Auxiliary dari response yang SAMA dengan Cubemap.
         * Key: LoginName ternormalisasi (pola cacheKey).
         */
        $auxiliaryByName = collect($voiceData['dataAuxiliary'] ?? [])
            ->filter(function ($aux) {
                return !empty(trim((string) ($aux['LoginName'] ?? '')));
            })
            ->keyBy(function ($aux) {
                return $this->cacheKey(
                    (string) ($aux['LoginName'] ?? ''),
                    'aux'
                );
            });

        $digitalByName = collect($digital)
            ->keyBy(function ($agent) {
                return strtoupper(
                    trim(
                        (string) (
                            $agent['LastName'] ?? ''
                        )
                    )
                );
            });

        return collect($voice)
            ->map(function ($agent) use ($digitalByName, $auxiliaryByName) {
                $name = strtoupper(
                    trim(
                        (string) (
                            $agent['NAMA'] ?? ''
                        )
                    )
                );

                $digitalAgent = $digitalByName->get($name);

                $currentDigitalActive = false;

                $sessionActive = false;

                $sessionDuration = null;

                if ($digitalAgent) {
                    $digitalName = strtoupper(
                        trim(
                            (string) (
                                $digitalAgent['LastName']
                                ?? $name
                            )
                        )
                    );

                    /**
                     * State Digital saat ini.
                     */
                    $currentState = [
                        'state' =>
                        $digitalAgent['AgentState']
                            ?? null,

                        'reason_code' =>
                        $digitalAgent['ReasonCode']
                            ?? null,

                        'reason' =>
                        $digitalAgent['Reason']
                            ?? null,

                        'call_in_progress' =>
                        $digitalAgent['CallInProgress']
                            ?? null,

                        'chat' =>
                        $digitalAgent['CHAT']
                            ?? null,

                        'chat_mobile' =>
                        $digitalAgent['CHATMOBILE']
                            ?? null,

                        'email' =>
                        $digitalAgent['EMAIL']
                            ?? null,
                    ];

                    $currentDuration =
                        $digitalAgent['Duration']
                        ?? null;

                    /**
                     * Digital aktif apabila:
                     *
                     * RESERVED
                     * +
                     * CallInProgress > 0
                     */
                    $currentDigitalActive =
                        strtoupper(
                            trim(
                                (string) (
                                    $digitalAgent['AgentState']
                                    ?? ''
                                )
                            )
                        ) === 'RESERVED'
                        &&
                        (int) (
                            $digitalAgent['CallInProgress']
                            ?? 0
                        ) > 0;

                    $activeKey = $this->cacheKey(
                        $digitalName,
                        'digital_active'
                    );

                    $startedAtKey = $this->cacheKey(
                        $digitalName,
                        'digital_started_at'
                    );

                    $eventStateKey = $this->cacheKey(
                        $digitalName,
                        'digital_event_state'
                    );

                    $previousDigitalActive =
                        Cache::get($activeKey);

                    $previousState =
                        Cache::get($eventStateKey);

                    $startedAtTimestamp =
                        Cache::get($startedAtKey);

                    $callInProgressNow =
                        (int) (
                            $digitalAgent['CallInProgress']
                            ?? 0
                        );

                    /**
                     * =====================================================
                     * DIGITAL ACTIVE CHANGE
                     * =====================================================
                     */
                    if (
                        $previousDigitalActive !== null
                        &&
                        (bool) $previousDigitalActive
                        !== $currentDigitalActive
                    ) {
                        Log::info(
                            strtoupper(
                                str_replace(
                                    '.',
                                    '_',
                                    $digitalName
                                )
                            ) .
                                ' DIGITAL ACTIVE CHANGE',
                            [
                                'server_time' =>
                                now()->format(
                                    'Y-m-d H:i:s'
                                ),

                                'name' =>
                                $digitalName,

                                'previous_active' =>
                                (bool)
                                $previousDigitalActive,

                                'current_active' =>
                                $currentDigitalActive,

                                'state' =>
                                $digitalAgent['AgentState']
                                    ?? null,

                                'call_in_progress' =>
                                $callInProgressNow,

                                'duration' =>
                                $currentDuration,
                            ]
                        );
                    }

                    /**
                     * =====================================================
                     * DIGITAL SESSION START
                     * =====================================================
                     *
                     * Jika Digital sedang aktif tetapi
                     * cache started_at belum ada,
                     * buat timer baru.
                     */
                    if (
                        $currentDigitalActive
                        &&
                        $startedAtTimestamp === null
                    ) {
                        $duration = max(
                            0,
                            (int) (
                                $currentDuration ?? 0
                            )
                        );

                        $detectedAt = now();

                        $startedAt =
                            $detectedAt
                            ->copy()
                            ->subSeconds($duration);

                        $startedAtTimestamp =
                            $startedAt->timestamp;

                        Cache::put(
                            $startedAtKey,
                            $startedAtTimestamp,
                            now()->addHours(12)
                        );

                        Log::info(
                            strtoupper(
                                str_replace(
                                    '.',
                                    '_',
                                    $digitalName
                                )
                            ) .
                                ' DIGITAL START',
                            [
                                'server_time' =>
                                $detectedAt->format(
                                    'Y-m-d H:i:s'
                                ),

                                'name' =>
                                $digitalName,

                                'duration' =>
                                $duration,

                                'estimated_start' =>
                                $startedAt->format(
                                    'Y-m-d H:i:s'
                                ),

                                'previous_active' =>
                                $previousDigitalActive,

                                'state' =>
                                $digitalAgent['AgentState']
                                    ?? null,

                                'call_in_progress' =>
                                $callInProgressNow,
                            ]
                        );
                    }

                    /**
                     * =====================================================
                     * DIGITAL SESSION ACTIVE
                     * =====================================================
                     *
                     * AgentState tidak dijadikan syarat.
                     *
                     * Selama:
                     *
                     * started_at ada
                     * +
                     * CallInProgress > 0
                     *
                     * maka timer tetap berjalan.
                     */
                    $sessionActive =
                        $startedAtTimestamp !== null
                        &&
                        $callInProgressNow > 0;

                    if ($sessionActive) {
                        $sessionDuration = max(
                            0,
                            now()->timestamp
                                - (int) $startedAtTimestamp
                        );
                    }

                    /**
                     * =====================================================
                     * DIGITAL SESSION END
                     * =====================================================
                     *
                     * Hanya CallInProgress = 0
                     * yang mengakhiri session.
                     */
                    if (
                        $startedAtTimestamp !== null
                        &&
                        $callInProgressNow === 0
                    ) {
                        $sessionDuration = max(
                            0,
                            now()->timestamp
                                - (int) $startedAtTimestamp
                        );

                        Log::info(
                            strtoupper(
                                str_replace(
                                    '.',
                                    '_',
                                    $digitalName
                                )
                            ) .
                                ' DIGITAL END',
                            [
                                'server_time' =>
                                now()->format(
                                    'Y-m-d H:i:s'
                                ),

                                'name' =>
                                $digitalName,

                                'duration_api' =>
                                $currentDuration,

                                'session_duration' =>
                                $sessionDuration,

                                'state' =>
                                $digitalAgent['AgentState']
                                    ?? null,

                                'call_in_progress' =>
                                $callInProgressNow,
                            ]
                        );

                        Cache::forget(
                            $startedAtKey
                        );

                        $startedAtTimestamp =
                            null;

                        $sessionActive =
                            false;
                    }

                    /**
                     * =====================================================
                     * SIMPAN DIGITAL STATE TERAKHIR
                     * =====================================================
                     */
                    Cache::put(
                        $activeKey,
                        $currentDigitalActive,
                        now()->addHours(12)
                    );

                    if (
                        $previousState
                        !==
                        $currentState
                    ) {
                        Log::info(
                            strtoupper(
                                str_replace(
                                    '.',
                                    '_',
                                    $digitalName
                                )
                            ) .
                                ' DIGITAL EVENT CHANGE',
                            [
                                'server_time' =>
                                now()->format(
                                    'Y-m-d H:i:s'
                                ),

                                'name' =>
                                $digitalName,

                                'previous' =>
                                $previousState,

                                'current' =>
                                $currentState,

                                'duration' =>
                                $currentDuration,
                            ]
                        );

                        Cache::put(
                            $eventStateKey,
                            $currentState,
                            now()->addHours(12)
                        );
                    }
                }

                /**
                 * =====================================================
                 * HASIL COMBINED
                 * =====================================================
                 */
                return [
                    'name' =>
                    $agent['NAMA'] ?? null,

                    'voice' => [
                        'status' =>
                        $agent['STATUS'] ?? null,

                        'reason' =>
                        $agent['REASON'] ?? null,

                        'duration' =>
                        $agent['DURATION'] ?? null,

                        'ready' =>
                        $agent['READY'] ?? null,

                        'not_ready' =>
                        $agent['NOTREADY'] ?? null,

                        'handled' =>
                        $agent['HANDLED'] ?? 0,

                        'extension' =>
                        $agent['EXTENTION'] ?? null,
                    ],

                    'digital' =>
                    $digitalAgent
                        ? [
                            'status' =>
                            $digitalAgent['AgentState']
                                ?? null,

                            'reason' =>
                            $digitalAgent['Reason']
                                ?? null,

                            'reason_code' =>
                            $digitalAgent['ReasonCode']
                                ?? null,

                            'duration' =>
                            $digitalAgent['Duration']
                                ?? 0,

                            'chat' =>
                            $digitalAgent['CHAT']
                                ?? 'NO',

                            'chat_mobile' =>
                            $digitalAgent['CHATMOBILE']
                                ?? 'NO',

                            'email' =>
                            $digitalAgent['EMAIL']
                                ?? 'NO',

                            'call_in_progress' =>
                            $digitalAgent['CallInProgress']
                                ?? 0,

                            'active' =>
                            $currentDigitalActive,

                            'session_active' =>
                            $sessionActive,

                            'session_duration' =>
                            $sessionDuration,
                        ]
                        : null,

                    /**
                     * Auxiliary (Toilet/Makan/Sholat) dari sumber
                     * yang sama dengan Cubemap. null jika
                     * LoginName tidak match.
                     */
                    'auxiliary' => $auxiliaryByName->has(
                        $this->cacheKey($name, 'aux')
                    )
                        ? $this->parseAuxiliary(
                            $auxiliaryByName->get(
                                $this->cacheKey($name, 'aux')
                            )
                        )
                        : null,
                ];
            })
            ->values()
            ->all();
    }
}
