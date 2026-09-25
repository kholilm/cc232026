/**
 * ============================================================
 * RELEASE TYPES
 * ============================================================
 * Tipe data bersama untuk ReleaseMonitor & schedule-index.
 */

export interface VoiceData {
    status: string;
    reason: string | null;
    duration: string | null;
    ready: string | null;
    not_ready: string | null;
    handled: number;
    extension: string | null;
}

export interface DigitalData {
    status: string;
    reason: string | null;
    duration: number;
    chat: string;
    chat_mobile: string;
    email: string;
    call_in_progress: number;
    active?: boolean;
    session_active?: boolean;
    session_duration?: number | null;
}

export interface Agent {
    name: string;
    voice: VoiceData | null;
    digital: DigitalData | null;
    auxiliary?: {
        toilet_minutes: number;
        makan_minutes: number;
        sholat_minutes: number;
        total_aux_minutes: number;
        sisa_aux_minutes: number;
        quota_minutes: number;
    } | null;
}

export interface ReleaseSessionInfo {
    id: number;
    actual_start: string | null;
    actual_end: string | null;
    duration_used_seconds: number;
    status: string;
    allowed_duration_seconds: number;
    remaining_seconds: number;
}

export interface ReleaseInfo {
    schedule_id: number;
    type: string;
    is_flexible: boolean;
    scheduled_start: string | null;
    duration_minutes: number;
    carry_over_minutes: number;
    monitor_status: string;
    status_label: string;
    session: ReleaseSessionInfo | null;
}

export interface ReleaseSyncResult {
    agent_name: string;
    action?: string;
    status?: string;
    release?: ReleaseInfo;
}

export interface ReleaseSyncResponse {
    success: boolean;
    message?: string;
    synced?: number;
    results?: ReleaseSyncResult[];
}

export interface FinesseResponse {
    success: boolean;
    unit: number;
    total: number;
    agents: Agent[];
    timestamp: string;
    message?: string;
}

/** Basis timer lokal (forward-only sync terhadap server). */
export interface TimerState {
    baseSeconds: number;
    syncedAt: number;
}
