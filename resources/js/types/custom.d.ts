import type { LucideIcon } from 'lucide-react';
import type { Ziggy } from 'ziggy-js';

export type Permission = {
    id: number;
    name: string;
    guard_name: string;
};

export type Role = {
    id: number;
    name: string;
    guard_name: string;
    permissions: Permission[];
};

export type Migration = {
    id: number;
    migration: string;
    batch: number;
};

export type User = {
    id: number;
    name: string;
    email: string;
    password: string;
    password_confirmation: string;
    roles: Role[];
};

export interface PasswordVault {
    id: number;
    app_name: string;
    username: string | null;
    email: string | null;
    password?: string;
    notes?: string;
}

export type Session = {
    id: number;
    user_id: number;
    ip_address: string;
    user_agent: string;
    payload: string;
    last_activity: number;
    user: User;
};

export interface PaginationType {
    url: string | null;
    label: string;
    active: boolean;
}

export type Paginated<T> = {
    data: T[];
    from: number;
    to: number;
    total: number;
    current_page: number;
    per_page: number;
    links: PaginationType[];
};

export type FlashProps = {
    success?: string;
    error?: string;
};

export interface NavItem {
    title: string;
    href: string;
    icon?: LucideIcon | null;
    isActive?: boolean;
    permission?: string | null;
}

export interface PageProps {
    [key: string]: unknown;

    name: string;
    quote: {
        message: string;
        author: string;
    };
    auth: {
        user: User | null;
        permissions: string[];
    };
    ziggy: Ziggy & { location: string };
    sidebarOpen: boolean;
    flash: {
        success?: string;
        error?: string;
    };
}

export type Preview = {
    src?: string;
    file?: File | null;
    displayUrl: string | null;
};
export type FlashMessage = {
    message: string;
    id: string;
};
export type Log = {
    id: number;
    level: string;
    logger?: string | null;
    message?: string | null;
    ts: number;
    remote_ip?: string | null;
    client_ip?: string | null;
    method?: string | null;
    host?: string | null;
    uri?: string | null;
    status: number;
    bytes_read?: number | null;
    size?: number | null;
    duration?: number | null;
    request?: Record<string> | null;
    resp_headers?: Record<string> | null;
    tls?: Record<string> | null;
    batch_no: number;
};
