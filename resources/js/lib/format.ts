/**
 * ============================================================
 * FORMAT / PARSE HELPERS
 * ============================================================
 */

/** Parse "HH:MM:SS" menjadi detik. */
export function parseDurationToSeconds(
    duration: string | null | undefined,
): number | null {
    if (!duration) {
        return null;
    }

    const cleaned = String(duration).replace(/\s+/g, '').trim();

    if (!cleaned) {
        return null;
    }

    const parts = cleaned.split(':').map(Number);

    if (parts.length !== 3 || parts.some((v) => Number.isNaN(v))) {
        return null;
    }

    const [h, m, s] = parts;

    if (h < 0 || m < 0 || s < 0 || m > 59 || s > 59) {
        return null;
    }

    return h * 3600 + m * 60 + s;
}

/** Format detik menjadi "HH:MM:SS" (jam dihilangkan jika 0). */
export function formatDuration(
    totalSeconds: number | null | undefined,
): string {
    if (
        totalSeconds === null ||
        totalSeconds === undefined ||
        Number.isNaN(Number(totalSeconds))
    ) {
        return '-';
    }

    const seconds = Math.max(0, Math.floor(Number(totalSeconds)));
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;

    return [
        h > 0 ? String(h).padStart(2, '0') : null,
        String(m).padStart(2, '0'),
        String(s).padStart(2, '0'),
    ]
        .filter(Boolean)
        .join(':');
}

/** Format "Y-m-d H:i:s" menjadi "HH:MM" lokal. */
export function formatClock(value: string | null | undefined): string {
    if (!value) {
        return '-';
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return '-';
    }

    return date.toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
    });
}

/**
 * ============================================================
 * VOICE DURATION COLOR
 * ============================================================
 * <= 7 menit -> hijau, > 7 menit -> kuning, > 10 menit -> merah.
 */
export function getVoiceDurationClass(
    status: string | undefined,
    duration: string | null | undefined,
): string {
    if (status !== 'Talking') {
        return 'bg-slate-100 text-slate-700';
    }

    const seconds = parseDurationToSeconds(duration);

    if (seconds === null) {
        return 'bg-slate-100 text-slate-700';
    }

    if (seconds > 10 * 60) {
        return 'bg-red-50 text-red-700 ring-1 ring-red-200 animate-pulse';
    }

    if (seconds > 7 * 60) {
        return 'bg-yellow-50 text-amber-700 ring-1 ring-amber-200';
    }

    return 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200';
}

/** Timer lokal forward-only: base + elapsed sejak sync. */
export function elapsedSince(timer: {
    baseSeconds: number;
    syncedAt: number;
}): number {
    return Math.max(
        0,
        timer.baseSeconds + Math.floor((Date.now() - timer.syncedAt) / 1000),
    );
}

/**
 * Forward-only resync: hanya maju, tidak pernah mundur.
 * Return state baru bila drift >= 2 detik, selain itu null.
 */
export function resyncForward(
    timer: { baseSeconds: number; syncedAt: number },
    serverSeconds: number,
    receivedAt: number,
): { baseSeconds: number; syncedAt: number } | null {
    const estimated = elapsedSince(timer);

    return serverSeconds - estimated >= 2
        ? { baseSeconds: serverSeconds, syncedAt: receivedAt }
        : null;
}
