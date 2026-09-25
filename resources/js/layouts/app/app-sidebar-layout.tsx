import { usePage } from '@inertiajs/react';
import { AppContent } from '@/components/app-content';
import { AppShell } from '@/components/app-shell';
import { AppSidebar } from '@/components/app-sidebar';
import { InitialTabs } from '@/components/initial-tabs';
import { TabBar } from '@/components/tab-bar';
import type { AppLayoutProps } from '@/types';

export default function AppSidebarLayout({
    children,
    breadcrumbs = [],
}: AppLayoutProps) {
    const { url } = usePage();

    return (
        <AppShell variant="sidebar">
            <div className="release-monitor-sidebar">
                <AppSidebar />
            </div>

            <AppContent variant="sidebar" className="overflow-x-hidden">
                <div className="release-monitor-tabs">
                    <TabBar />
                    <InitialTabs currentHref={url} />
                </div>

                {children}
            </AppContent>
        </AppShell>
    );
}
