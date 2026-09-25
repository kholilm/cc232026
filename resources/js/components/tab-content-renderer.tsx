import { useTabs } from '@/contexts/tab-context';

export function TabContentRenderer() {
    const { activeTab } = useTabs();

    if (!activeTab) {
return null;
}

    return (
        <div className="h-full w-full">
            {/* INERTIA STYLE LOAD PAGE VIA IFRAME (OPTIONAL) */}
            <iframe src={activeTab.url} className="h-full w-full border-0" />
        </div>
    );
}
