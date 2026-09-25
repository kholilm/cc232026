import {
    SidebarGroup,
    // SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import { useTabs } from '@/contexts/tab-context';
import { useCurrentUrl } from '@/hooks/use-current-url';
import { cn } from '@/lib/utils';
import type { NavItem } from '@/types';

export function NavMain({ items = [] }: { items: NavItem[] }) {
    const { openTab, activeKey } = useTabs();

    return (
        <SidebarGroup className="px-2 py-0">
            {/* <SidebarGroupLabel>Platform</SidebarGroupLabel> */}
            <SidebarMenu>
                {items.map((item) => {
                    const href = String(item.href);
                    const isActive = activeKey === href;
                    const Icon = item.icon;

                    return (
                        <SidebarMenuItem key={item.title}>
                            <SidebarMenuButton
                                isActive={isActive}
                                tooltip={{ children: item.title }}
                                onClick={() =>
                                    openTab({
                                        key: href,
                                        title: item.title,
                                        href,
                                        icon: Icon ?? null,
                                    })
                                }
                                className={cn(
                                    'cursor-pointer',
                                    !isActive && 'hover:bg-muted/50',
                                )}
                            >
                                {Icon && <Icon />}
                                <span>{item.title}</span>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    );
                })}
            </SidebarMenu>
        </SidebarGroup>
    );
}
