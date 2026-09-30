/**
 * ============================================================
 * USE FINESSE + RELEASE SYNC HOOKS
 * ============================================================
 *
 * - useTick        : tick 1 detik untuk timer realtime.
 * - useFinessePolling : polling /api/finesse/combined (5 detik)
 *                      + sinkronisasi timer Makan & Digital
 *                      (forward-only terhadap server).
 * - useReleaseSync    : kirim kondisi CSO ke backend
 *                      (/release-session/sync). Backend yang
 *                      memutuskan auto start / finish / carry-over.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { parseDurationToSeconds, resyncForward } from './format';
import type {
    Agent,
    FinesseResponse,
    ReleaseInfo,
    ReleaseSyncResponse,
    TimerState,
} from './release-types';

/** Tick realtime 1 detik. */
export function useTick() {
    const [tick, setTick] = useState(() => Date.now());

    useEffect(() => {
        const interval = window.setInterval(() => setTick(Date.now()), 1000);

        return () => window.clearInterval(interval);
    }, []);

    return tick;
}

function getCsrfToken(): string | null {
    return (
        document
            .querySelector('meta[name="csrf-token"]')
            ?.getAttribute('content') ?? null
    );
}

/**
 * ============================================================
 * RELEASE SYNC
 * ============================================================
 * ReleaseMonitor TIDAK membuat keputusan database.
 * Backend menentukan: jadwal, busy, auto start, auto finish,
 * carry-over, overtime.
 */
export function useReleaseSync() {
    const [releaseInfo, setReleaseInfo] = useState<Record<string, ReleaseInfo>>(
        {},
    );
    const syncingRef = useRef(false);

    const sync = useCallback(async (agents: Agent[]) => {
        if (syncingRef.current || !Array.isArray(agents)) {
            return;
        }

        syncingRef.current = true;

        try {
            const csrfToken = getCsrfToken();

            const response = await fetch('/release-session/sync', {
                method: 'POST',
                credentials: 'same-origin',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    ...(csrfToken ? { 'X-CSRF-TOKEN': csrfToken } : {}),
                },
                cache: 'no-store',
                body: JSON.stringify({ agents }),
            });

            if (!response.ok) {
                throw new Error(`Release sync HTTP ${response.status}`);
            }

            const result: ReleaseSyncResponse = await response.json();

            if (!result.success) {
                throw new Error(
                    result.message || 'Sinkronisasi ReleaseSession gagal.',
                );
            }

            const next: Record<string, ReleaseInfo> = {};

            (result.results ?? []).forEach((item) => {
                const name = String(item.agent_name ?? '')
                    .trim()
                    .toUpperCase();

                if (name && item.release) {
                    next[name] = item.release;
                }
            });

            setReleaseInfo(next);
        } catch (error) {
            // Error release sync tidak boleh menghentikan Finesse Monitor.
            console.error('[ReleaseMonitor] ReleaseSession sync error:', error);
        } finally {
            syncingRef.current = false;
        }
    }, []);

    const getReleaseInfo = useCallback(
        (displayName: string): ReleaseInfo | null =>
            releaseInfo[displayName.trim().toUpperCase()] ?? null,
        [releaseInfo],
    );

    return { releaseInfo, syncRelease: sync, getReleaseInfo };
}

/**
 * ============================================================
 * TIMER MANAGER (forward-only)
 * ============================================================
 * Kelola timer Makan (voice Not Ready + reason makan)
 * dan timer Digital Session terhadap duration server.
 */
function manageTimers(
    timers: Record<string, TimerState>,
    agents: Agent[],
    receivedAt: number,
    isActive: (agent: Agent) => number | null,
) {
    const activeNames = new Set<string>();

    agents.forEach((agent) => {
        const name = String(agent.name ?? '').trim();
        const serverSeconds = isActive(agent);

        if (name && serverSeconds !== null) {
            activeNames.add(name);

            const current = timers[name];

            if (!current) {
                timers[name] = {
                    baseSeconds: serverSeconds,
                    syncedAt: receivedAt,
                };

                return;
            }

            const next = resyncForward(current, serverSeconds, receivedAt);

            if (next) {
                timers[name] = next;
            }
        } else if (name) {
            delete timers[name];
        }
    });

    Object.keys(timers).forEach((name) => {
        if (!activeNames.has(name)) {
            delete timers[name];
        }
    });
}

/**
 * ============================================================
 * FINESSE POLLING (5 detik)
 * ============================================================
 */
export function useFinessePolling(onAgents: (agents: Agent[]) => void) {
    const [agents, setAgents] = useState<Agent[]>([]);
    const [offered, setOffered] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

    const mealTimers = useRef<Record<string, TimerState>>({});
    const digitalTimers = useRef<Record<string, TimerState>>({});
    const fetchingRef = useRef(false);

    const fetchAgents = useCallback(async () => {
        if (fetchingRef.current) {
            return;
        }

        fetchingRef.current = true;

        try {
            const response = await fetch('/api/finesse/combined', {
                headers: { Accept: 'application/json' },
                cache: 'no-store',
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data: FinesseResponse = await response.json();

            if (!data.success) {
                throw new Error(data.message || 'Gagal mengambil data Finesse');
            }

            const receivedAt = Date.now();
            const updated = Array.isArray(data.agents) ? data.agents : [];

            /*
             * Offered: snapshot backend call_nasional
             * (callPerformance[0][0].Offer). Dibaca apa adanya,
             * tidak dihitung ulang di frontend.
             */
            setOffered(Number(data.offered ?? updated[0]?.offered ?? 0) || 0);

            // Timer Makan: Not Ready + reason mengandung "makan".
            manageTimers(mealTimers.current, updated, receivedAt, (agent) => {
                const voice = agent.voice;

                if (!voice) {
                    return null;
                }

                const isMeal =
                    voice.status === 'Not Ready' &&
                    String(voice.reason ?? '')
                        .toLowerCase()
                        .includes('makan');

                if (!isMeal) {
                    return null;
                }

                return parseDurationToSeconds(voice.duration);
            });

            // Timer Digital: RESERVED + call_in_progress > 0.
            manageTimers(
                digitalTimers.current,
                updated,
                receivedAt,
                (agent) => {
                    const d = agent.digital;

                    if (
                        !d ||
                        d.active !== true ||
                        d.status !== 'RESERVED' ||
                        (d.call_in_progress ?? 0) <= 0
                    ) {
                        return null;
                    }

                    return typeof d.session_duration === 'number'
                        ? Math.max(0, Math.floor(d.session_duration))
                        : null;
                },
            );

            setAgents(updated);
            setLastUpdate(new Date());
            setError(null);

            onAgents(updated);
        } catch (err) {
            console.error('[ReleaseMonitor] Finesse combined error:', err);
            setError(err instanceof Error ? err.message : 'Terjadi kesalahan');
        } finally {
            fetchingRef.current = false;
            setLoading(false);
        }
    }, [onAgents]);

    useEffect(() => {
        fetchAgents();
        const interval = window.setInterval(fetchAgents, 5000);

        return () => window.clearInterval(interval);
    }, [fetchAgents]);

    const getMealElapsed = useCallback(
        /*
         * `at` = timestamp tick dari useTick(). Timer Makan WAJIB
         * dihitung dari prop tick agar nilainya berevolusi tepat
         * setiap render 1-detik, bukan bergantung polling.
         */
        (name: string, at: number = Date.now()): number | null => {
            const timer = mealTimers.current[name];

            if (!timer) {
                return null;
            }

            return timer.baseSeconds + Math.floor((at - timer.syncedAt) / 1000);
        },
        [],
    );

    const getDigitalElapsed = useCallback(
        (name: string): number | null => {
            const timer = digitalTimers.current[name];

            return timer
                ? timer.baseSeconds +
                      Math.floor((Date.now() - timer.syncedAt) / 1000)
                : null;
        },

        [],
    );

    return {
        agents,
        offered,
        loading,
        error,
        lastUpdate,
        getMealElapsed,
        getDigitalElapsed,
    };
}
