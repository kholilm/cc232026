import { Link, usePage } from '@inertiajs/react';

import {
    ChartGantt,
    ChevronDown,
    ChevronRight,
    Circle,
    CircleStop,
    Clock10Icon,
    KeyIcon,
    LayoutGrid,
    SettingsIcon,
    ShieldIcon,
    Users2,
    FileText,
    Server,
    LockKeyhole,
    MonitorCheck,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useState } from 'react';
import AppLogo from '@/components/app-logo';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import { useTabs } from '@/contexts/tab-context';
import { dashboard } from '@/routes';
import type { NavItem, PageProps } from '@/types/custom';

const NAV_ITEMS: NavItem[] = [
    {
        title: 'Dashboards',
        href: '/dashboard',
        icon: LayoutGrid,
    },
    {
        title: 'CSO Monitor',
        href: '/finesse/release-monitor',
        icon: MonitorCheck,
    },
    {
        title: 'Release Schedule',
        href: '/release-schedule',
        icon: MonitorCheck,
    },
];
const ADMINISTRATOR: NavItem[] = [
    {
        title: 'Permission',
        href: '/permission',
        permission: 'auth.permission',
        icon: KeyIcon,
    },
    { title: 'Role', href: '/role', permission: 'auth.role', icon: ShieldIcon },
    { title: 'User', href: '/user', permission: 'auth.user', icon: Users2 },
    {
        title: 'Migration',
        href: '/migration',
        permission: 'auth.migration',
        icon: ChartGantt,
    },
    {
        title: 'Session',
        href: '/session',
        permission: 'auth.session',
        icon: Clock10Icon,
    },

    // {
    //     title: 'Log Akses',
    //     href: '/log',
    //     permission: 'auth.log',
    //     icon: RotateCcw,
    // },
];

const infoTerbaru: NavItem[] = [
    {
        title: 'Info',
        href: '/info',
        icon: FileText,
    },
    // {
    //     title: 'SOP',
    //     href: '/sop',
    //     icon: ChartGantt,
    // },
];

const Password: NavItem[] = [
    {
        title: 'Password',
        href: '/password',
        permission: 'auth.password',
        icon: LockKeyhole,
    },
];

function SidebarSection({
    title,
    icon: SectionIcon,
    items,
    open,
    setOpen,
    activeIconOnly = false,
}: {
    title: string;
    icon: LucideIcon;
    items: NavItem[];
    open: boolean;
    setOpen: (v: boolean) => void;
    activeIconOnly?: boolean;
}) {
    const { openTab, activeKey } = useTabs();

    if (items.length === 0) {
        return null;
    }

    return (
        <SidebarMenu className="px-2 py-0">
            <SidebarMenuItem>
                <SidebarMenuButton
                    onClick={() => setOpen(!open)}
                    className="flex items-center justify-between"
                >
                    <div className="flex items-center gap-2">
                        <SectionIcon className="h-4 w-4" />
                        <span className="truncate whitespace-nowrap">
                            {title}
                        </span>
                    </div>
                    {open ? (
                        <ChevronDown className="h-4 w-4" />
                    ) : (
                        <ChevronRight className="h-4 w-4" />
                    )}
                </SidebarMenuButton>
            </SidebarMenuItem>

            {open && (
                <div className="flex flex-col">
                    {items.map(({ href, title, icon: Icon }) => {
                        const hrefStr = String(href);
                        const isActive = activeKey === hrefStr;

                        if (!Icon) {
                            return null;
                        }

                        const RenderIcon =
                            activeIconOnly && Icon === Circle && isActive
                                ? CircleStop
                                : Icon;

                        return (
                            <SidebarMenuItem key={hrefStr}>
                                <SidebarMenuButton
                                    className={`flex cursor-pointer items-center gap-3 pl-6 ${
                                        isActive
                                            ? 'bg-muted font-medium'
                                            : 'hover:bg-muted/50'
                                    }`}
                                    onClick={() =>
                                        openTab({
                                            key: hrefStr,
                                            title,
                                            href: hrefStr,
                                            icon: Icon ?? null,
                                        })
                                    }
                                >
                                    <RenderIcon className="h-4 w-4 shrink-0" />
                                    <span>{title}</span>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        );
                    })}
                </div>
            )}
        </SidebarMenu>
    );
}

export function AppSidebar() {
    const { props, url } = usePage<PageProps>();
    const user = props.auth?.user;
    const permissions = props.auth?.permissions ?? [];
    const filterByPermission = (items: NavItem[]) =>
        items.filter(
            (i) => !i.permission || permissions.includes(i.permission),
        );

    const filteredNav = filterByPermission(NAV_ITEMS);
    const filteredAdmin = filterByPermission(ADMINISTRATOR);
    const filteredinfoTerbaru = filterByPermission(infoTerbaru);
    const filteredPass = filterByPermission(Password);

    const [openAdmin, setOpenAdmin] = useState(() =>
        filteredAdmin.some((item) => url.startsWith(item.href)),
    );
    const [openinfoTerbaru, setOpeninfoTerbaru] = useState(() =>
        filteredinfoTerbaru.some((item) => url.startsWith(item.href)),
    );

    return (
        <Sidebar
            collapsible="icon"
            variant="inset"
            className="bg-sidebar text-sidebar-foreground"
        >
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href={dashboard()} prefetch>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <NavMain items={filteredNav} />
                <SidebarSection
                    title="Administrator"
                    icon={SettingsIcon}
                    items={filteredAdmin}
                    open={openAdmin}
                    setOpen={setOpenAdmin}
                />
                <SidebarSection
                    title="Info"
                    icon={Server}
                    items={filteredinfoTerbaru}
                    open={openinfoTerbaru}
                    setOpen={setOpeninfoTerbaru}
                />
                <NavMain items={filteredPass} />{' '}
            </SidebarContent>

            <SidebarFooter>
                {user ? (
                    <NavUser />
                ) : (
                    <div className="p-3">
                        <Link href="/login">
                            <SidebarMenuButton className="w-full justify-center bg-linear-to-r from-blue-500 to-yellow-400 text-white hover:opacity-90">
                                Login
                            </SidebarMenuButton>
                        </Link>
                    </div>
                )}
            </SidebarFooter>
        </Sidebar>
    );
}
