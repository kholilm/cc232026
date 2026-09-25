import { useEffect } from 'react';
import { useTabs  } from '@/contexts/tab-context';
import type {Tab} from '@/contexts/tab-context';
import { dashboard } from '@/routes';
interface InitialTabsProps {
    /**
     * The currently active route (from Inertia's usePage). Used to ensure
     * the active tab always reflects the current page.
     */
    currentHref?: string;
}
/**
 * Mounts the "default first tab" if no tabs are persisted yet, and keeps
 * the active tab in sync with the current Inertia URL.
 */
export function InitialTabs({ currentHref }: InitialTabsProps) {
    const { tabs, setTabs, setActiveKey, activeKey, storageRestored } =
        useTabs();

    useEffect(() => {
        if (!storageRestored) {
return;
}

        // If user has no tabs at all, open Dashboard as the first one
        if (tabs.length === 0) {
            const dashboardHref =
                typeof dashboard === 'string'
                    ? dashboard
                    : (dashboard() as unknown as string);
            const initial: Tab = {
                key: dashboardHref,
                title: 'Dashboard',
                href: dashboardHref,
                closable: false,
            };
            setTabs([initial]);
            setActiveKey(dashboardHref);
        }
    }, [storageRestored, tabs.length, setTabs, setActiveKey]);

    // Keep activeKey in sync with the actual browser URL (handles back/forward,
    // direct navigation, and any non-tab navigation).
    useEffect(() => {
        if (!storageRestored) {
return;
}

        if (!currentHref) {
return;
}

        const exists = tabs.some((t) => t.key === currentHref);

        if (exists) {
            if (activeKey !== currentHref) {
                setActiveKey(currentHref);
            }

            return;
        }

        // Don't auto-create tabs for unknown URLs (auth, settings, etc.)
        if (
            currentHref.startsWith('/login') ||
            currentHref.startsWith('/register') ||
            currentHref.startsWith('/forgot-password') ||
            currentHref.startsWith('/settings') ||
            currentHref.startsWith('/two-factor') ||
            currentHref.startsWith('/verify-email')
        ) {
            return;
        }
    }, [storageRestored, currentHref, tabs, activeKey, setActiveKey]);

    return null;
}
