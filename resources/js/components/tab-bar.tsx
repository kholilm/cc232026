import { X } from 'lucide-react';
import { useTabs } from '@/contexts/tab-context';
import { cn } from '@/lib/utils';

export function TabBar() {
    const { tabs, activeKey, activateTab, closeTab } = useTabs();

    if (tabs.length === 0) {
        return null;
    }

    return (
        <div
            className="flex items-end gap-1 overflow-x-auto border-b border-sidebar-border/50 bg-background px-2 pt-2"
            role="tablist"
            aria-label="Open tabs"
        >
            {tabs.map((tab) => {
                const isActive = tab.key === activeKey;
                const Icon = tab.icon;

                return (
                    <div
                        key={tab.key}
                        role="tab"
                        aria-selected={isActive}
                        className={cn(
                            'group flex max-w-[200px] cursor-pointer items-center gap-2 rounded-t-md border border-transparent px-3 py-1.5 text-sm transition-colors',
                            isActive
                                ? 'border-sidebar-border/50 bg-muted text-foreground'
                                : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground',
                        )}
                        onClick={() => activateTab(tab.key)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                activateTab(tab.key);
                            }
                        }}
                        tabIndex={0}
                    >
                        {Icon && <Icon className="h-3.5 w-3.5 shrink-0" />}
                        <span className="truncate">{tab.title}</span>
                        {tab.closable !== false && (
                            <button
                                type="button"
                                aria-label={`Close ${tab.title}`}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    closeTab(tab.key);
                                }}
                                className={cn(
                                    'ml-1 rounded-sm p-0.5 transition-colors',
                                    'hover:bg-destructive/20 hover:text-destructive',
                                    isActive
                                        ? 'opacity-70'
                                        : 'opacity-50 group-hover:opacity-100',
                                )}
                            >
                                <X className="h-3 w-3" />
                            </button>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
