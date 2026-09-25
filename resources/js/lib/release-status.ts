/**
 * ============================================================
 * RELEASE STATUS CONFIG
 * ============================================================
 * Aturan warna (konsisten dengan schedule-index):
 *
 * 🟦 Cyan   = RELEASE SEDANG BERJALAN
 * 🟢 Hijau  = RELEASE SELESAI
 * 🟠 Orange = TOLERANSI / menunggu release
 * 🔴 Merah  = TIDAK RELEASE / missed
 * 🟣 Ungu   = OVERTIME
 */

export interface StatusConfig {
    label: string;
    dotClass: string;
    badgeClass: string;
    cellClass: string;
}

const DEFAULT_CONFIG: StatusConfig = {
    label: '-',
    dotClass: 'bg-slate-400',
    badgeClass: 'border-slate-200 bg-slate-50 text-slate-600',
    cellClass: 'bg-white',
};

export const RELEASE_STATUS_CONFIG: Record<string, StatusConfig> = {
    upcoming: {
        label: 'BELUM MASUK',
        dotClass: 'bg-slate-400',
        badgeClass: 'border-slate-200 bg-slate-50 text-slate-600',
        cellClass: 'bg-white',
    },
    tolerance: {
        label: 'MENUNGGU RELEASE',
        dotClass: 'bg-orange-500',
        badgeClass: 'border-orange-200 bg-orange-50 text-orange-700',
        cellClass: 'bg-orange-50/40',
    },
    releasing: {
        label: 'SEDANG RELEASE',
        dotClass: 'bg-cyan-500',
        badgeClass: 'border-cyan-200 bg-cyan-50 text-cyan-700',
        cellClass: 'bg-cyan-50/40',
    },
    released: {
        label: 'RELEASE SELESAI',
        dotClass: 'bg-emerald-500',
        badgeClass: 'border-emerald-200 bg-emerald-50 text-emerald-700',
        cellClass: 'bg-emerald-50/40',
    },
    overtime: {
        label: 'OVERTIME',
        dotClass: 'bg-purple-500',
        badgeClass: 'border-purple-200 bg-purple-50 text-purple-700',
        cellClass: 'bg-purple-50/40',
    },
    missed: {
        label: 'TIDAK RELEASE',
        dotClass: 'bg-red-500',
        badgeClass: 'border-red-200 bg-red-50 text-red-700',
        cellClass: 'bg-red-50/40',
    },
};

export function getReleaseStatusConfig(
    status: string | undefined | null,
): StatusConfig {
    return RELEASE_STATUS_CONFIG[status ?? ''] ?? DEFAULT_CONFIG;
}
