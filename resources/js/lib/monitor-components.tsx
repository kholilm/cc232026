/**
 * ============================================================
 * SHARED BADGES & CARD
 * ============================================================
 */

import type { ReactNode } from 'react';
import {
    getStatusConfig,
    DIGITAL_STATUS_CONFIG,
    VOICE_STATUS_CONFIG,
} from './agent-status';
import { getReleaseStatusConfig } from './release-status';
import type { DigitalData } from './release-types';

function Badge({
    label,
    dotClass,
    badgeClass,
    pulse = false,
}: {
    label: string;
    dotClass: string;
    badgeClass: string;
    pulse?: boolean;
}) {
    return (
        <span
            className={`inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold tracking-wide ${badgeClass}`}
        >
            <span
                className={`h-2 w-2 rounded-full ${dotClass} ${pulse ? 'animate-pulse' : ''}`}
            />
            {label}
        </span>
    );
}

export function ReleaseStatusBadge({
    monitorStatus,
    label,
}: {
    monitorStatus: string;
    label?: string;
}) {
    const config = getReleaseStatusConfig(monitorStatus);

    return (
        <Badge
            label={label || config.label}
            dotClass={config.dotClass}
            badgeClass={config.badgeClass}
            pulse={monitorStatus === 'releasing'}
        />
    );
}

export function VoiceStatusBadge({ status }: { status: string }) {
    const config = getStatusConfig(VOICE_STATUS_CONFIG, status);

    return (
        <Badge
            label={config.label}
            dotClass={config.dotClass}
            badgeClass={config.badgeClass}
        />
    );
}

export function DigitalStatusBadge({
    digital,
}: {
    digital: DigitalData | null;
}) {
    if (!digital) {
        return (
            <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-400">
                <span className="h-2 w-2 rounded-full bg-slate-300" />
                NO DIGITAL
            </span>
        );
    }

    const config = getStatusConfig(DIGITAL_STATUS_CONFIG, digital.status);

    return (
        <Badge
            label={config.label}
            dotClass={config.dotClass}
            badgeClass={config.badgeClass}
        />
    );
}

export function SummaryCard({
    title,
    value,
    description,
    icon,
    iconClass,
    cardClass,
}: {
    title: string;
    value: number;
    description: string;
    icon: ReactNode;
    iconClass: string;
    cardClass: string;
}) {
    return (
        <div
            className={`group relative overflow-hidden rounded-2xl border p-5 shadow-sm transition-shadow duration-200 hover:shadow-md ${cardClass}`}
        >
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-xs font-semibold tracking-wider text-slate-500 uppercase">
                        {title}
                    </p>
                    <p className="mt-2 text-3xl font-bold tracking-tight text-slate-800">
                        {String(value).padStart(2, '0')}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">{description}</p>
                </div>
                <div
                    className={`flex h-11 w-11 items-center justify-center rounded-xl ${iconClass}`}
                >
                    {icon}
                </div>
            </div>
        </div>
    );
}
