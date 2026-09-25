import { useCallback, useRef } from 'react';

/**
 * Tracks one external popup window per URL.
 *
 * Behavior:
 * - If a window for the URL is still open -> focus it (no new window)
 * - If the window was closed or never opened -> open a new one
 * - Cleans up the tracking entry when the window is closed
 */
export function useExternalWindow() {
    const windowsRef = useRef<Map<string, Window | null>>(new Map());

    const open = useCallback((url: string, target = '_blank') => {
        const existing = windowsRef.current.get(url);

        if (existing && !existing.closed) {
            try {
                existing.focus();
            } catch {
                /* cross-origin, ignore */
            }

            return existing;
        }

        const win = window.open(url, target);
        windowsRef.current.set(url, win);

        if (win) {
            const tick = setInterval(() => {
                if (win.closed) {
                    clearInterval(tick);

                    if (windowsRef.current.get(url) === win) {
                        windowsRef.current.delete(url);
                    }
                }
            }, 1000);
        }

        return win;
    }, []);

    return { open };
}
