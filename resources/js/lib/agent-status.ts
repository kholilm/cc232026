/**
 * ============================================================
 * VOICE / DIGITAL / ACTIVITY CONFIG
 * ============================================================
 * Warna voice & digital dari data Finesse.
 * 🔵 Biru = VOICE TALKING. Cyan hanya untuk release.
 */

import type { Agent, DigitalData } from './release-types';

export const VOICE_STATUS_CONFIG: Record<
    string,
    { label: string; dotClass: string; badgeClass: string }
> = {
    Ready: {
        label: 'READY',
        dotClass: 'bg-emerald-500',
        badgeClass: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    },
    Talking: {
        label: 'TALKING',
        dotClass: 'bg-blue-500',
        badgeClass: 'border-blue-200 bg-blue-50 text-blue-700',
    },
    'Not Ready': {
        label: 'NOT READY',
        dotClass: 'bg-red-500',
        badgeClass: 'border-red-200 bg-red-50 text-red-700',
    },
};

export const DIGITAL_STATUS_CONFIG: Record<
    string,
    { label: string; dotClass: string; badgeClass: string }
> = {
    RESERVED: {
        label: 'DIGITAL ACTIVE',
        dotClass: 'bg-violet-500',
        badgeClass: 'border-violet-200 bg-violet-50 text-violet-700',
    },
    AVAILABLE: {
        label: 'DIGITAL READY',
        dotClass: 'bg-emerald-500',
        badgeClass: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    },
    NOTAVAILABLE: {
        label: 'DIGITAL NOT READY',
        dotClass: 'bg-slate-400',
        badgeClass: 'border-slate-200 bg-slate-50 text-slate-600',
    },
};

export function getStatusConfig(
    map: Record<
        string,
        { label: string; dotClass: string; badgeClass: string }
    >,
    status: string | undefined | null,
) {
    return (
        map[status ?? ''] ?? {
            label: status || '-',
            dotClass: 'bg-slate-400',
            badgeClass: 'border-slate-200 bg-slate-50 text-slate-600',
        }
    );
}

/** CSO sedang digital aktif? (RESERVED + call in progress) */
export function isDigitalActive(digital: DigitalData | null): boolean {
    return Boolean(
        digital &&
        digital.active === true &&
        digital.status === 'RESERVED' &&
        (digital.call_in_progress ?? 0) > 0,
    );
}

/** CSO sedang Voice Talking? */
export function isVoiceTalking(voice: { status: string } | null): boolean {
    return voice?.status === 'Talking';
}

/** Channel digital aktif (CHAT MOBILE / CHAT / EMAIL). */
export function getDigitalChannel(digital: DigitalData | null): string {
    if (!digital) {
        return '-';
    }

    if (digital.chat_mobile === 'YES' && digital.chat === 'YES') {
        return 'CHAT MOBILE';
    }

    if (digital.chat === 'YES') {
        return 'CHAT';
    }

    if (digital.email === 'YES') {
        return 'EMAIL';
    }

    return '-';
}

export interface MainActivity {
    label: string;
    description: string;
    className: string;
}

/** Aktivitas utama CSO (digital > voice talking > ready > aux). */
export function getMainActivity(agent: Agent): MainActivity {
    const { voice, digital } = agent;

    if (isDigitalActive(digital)) {
        return {
            label: 'DIGITAL',
            description: getDigitalChannel(digital),
            className: 'border-violet-200 bg-violet-50 text-violet-700',
        };
    }

    if (isVoiceTalking(voice)) {
        return {
            label: 'VOICE',
            description: 'Sedang Call',
            className: 'border-blue-200 bg-blue-50 text-blue-700',
        };
    }

    const reason = voice?.reason?.toLowerCase() ?? '';

    if (voice?.status === 'Not Ready' && reason.includes('makan')) {
        return {
            label: 'MAKAN',
            description: 'Makan dulu',
            className: 'border-cyan-200 bg-cyan-50 text-cyan-700',
        };
    }

    if (voice?.status === 'Ready') {
        return {
            label: 'READY',
            description: 'Menunggu Call',
            className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
        };
    }

    if (voice?.status === 'Not Ready' && reason.includes('digital')) {
        return {
            label: 'DIGITAL',
            description: getDigitalChannel(digital),
            className: 'border-violet-200 bg-violet-50 text-violet-700',
        };
    }

    if (voice?.status === 'Not Ready') {
        return {
            label: 'AUX',
            description: voice.reason || 'Not Ready',
            className: 'border-red-200 bg-red-50 text-red-700',
        };
    }

    return {
        label: '-',
        description: '-',
        className: 'border-slate-200 bg-slate-50 text-slate-500',
    };
}
