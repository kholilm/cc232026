import type { InertiaLinkProps } from '@inertiajs/react';
import { clsx } from 'clsx';
import type { ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function toUrl(url: NonNullable<InertiaLinkProps['href']>): string {
    return typeof url === 'string' ? url : url.url;
}

export function getImageData(event: React.ChangeEvent<HTMLInputElement>): {
    file: File | null;
    displayUrl: string | null;
} {
    const input = event.target;
    const file = input.files?.[0] || null;

    if (!file) {
        return { file: null, displayUrl: null };
    }

    // Generate URL untuk preview
    const displayUrl = URL.createObjectURL(file);

    return { file, displayUrl };
}
