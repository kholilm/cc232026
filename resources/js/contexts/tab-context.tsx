import { router } from '@inertiajs/react';
import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
} from 'react';

export interface Tab {
    /** Unique identifier (we use the href) */
    key: string;
    /** Display title of the tab */
    title: string;
    /** Route href the tab points to */
    href: string;
    /** Optional icon component */
    icon?: React.ComponentType<{ className?: string }> | null;
    /** Whether the tab can be closed by the user */
    closable?: boolean;
    component?: React.ReactNode;
}

interface TabContextValue {
    tabs: Tab[];
    activeKey: string | null;
    storageRestored: boolean;
    openTab: (tab: Tab) => void;
    activateTab: (key: string) => void;
    closeTab: (key: string) => void;
    setTabs: React.Dispatch<React.SetStateAction<Tab[]>>;
    setActiveKey: React.Dispatch<React.SetStateAction<string | null>>;
}

const TabContext = createContext<TabContextValue | null>(null);
const STORAGE_KEY = 'app-tabs-v1';

function readStorage(): {
    tabs: Tab[];
    activeKey: string | null;
} {
    if (typeof window === 'undefined') {
        return { tabs: [], activeKey: null };
    }

    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);

        if (!raw) {
return { tabs: [], activeKey: null };
}

        const parsed = JSON.parse(raw) as {
            tabs?: Tab[];
            activeKey?: string | null;
        };
        const tabs = Array.isArray(parsed.tabs) ? parsed.tabs : [];
        const activeKey =
            parsed.activeKey && tabs.some((tab) => tab.key === parsed.activeKey)
                ? parsed.activeKey
                : (tabs[0]?.key ?? null);

        return { tabs, activeKey };
    } catch {
        return { tabs: [], activeKey: null };
    }
}

function writeStorage(tabs: Tab[], activeKey: string | null) {
    if (typeof window === 'undefined') {
return;
}

    try {
        // Icons and components are not serializable -> store as null
        const safe = tabs.map((t) => ({
            key: t.key,
            title: t.title,
            href: t.href,
            closable: t.closable,
        }));
        window.localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({ tabs: safe, activeKey }),
        );
    } catch {
        /* ignore quota / private mode */
    }
}

export function TabProvider({
    children,
    initialTabs,
    initialActiveKey,
}: {
    children: React.ReactNode;
    initialTabs?: Tab[];
    initialActiveKey?: string | null;
}) {
    const [tabs, setTabs] = useState<Tab[]>(initialTabs ?? []);
    const [activeKey, setActiveKey] = useState<string | null>(
        initialActiveKey ?? null,
    );
    const [storageRestored, setStorageRestored] = useState(false);

    useEffect(() => {
        if (initialTabs || initialActiveKey) {
            setStorageRestored(true);

            return;
        }

        const persisted = readStorage();

        setTabs(persisted.tabs);
        setActiveKey(persisted.activeKey);
        setStorageRestored(true);
    }, [initialTabs, initialActiveKey]);

    const navigate = useCallback((href: string) => {
        router.visit(href, {
            preserveState: true,
            preserveScroll: true,
        });
    }, []);

    const openTab = useCallback(
        (tab: Tab) => {
            setTabs((prev) => {
                const exists = prev.some((t) => t.key === tab.key);

                if (exists) {
return prev;
}

                return [...prev, tab];
            });
            setActiveKey(tab.key);
            navigate(tab.href);
        },
        [navigate],
    );
    const activateTab = useCallback(
        (key: string) => {
            setTabs((prev) => {
                const found = prev.find((t) => t.key === key);

                if (found) {
                    navigate(found.href);
                }

                return prev;
            });
            setActiveKey(key);
        },
        [navigate],
    );
    const closeTab = useCallback(
        (key: string) => {
            setTabs((prev) => {
                const idx = prev.findIndex((t) => t.key === key);

                if (idx === -1) {
return prev;
}

                const next = prev.filter((t) => t.key !== key);
                setActiveKey((current) => {
                    if (current !== key) {
return current;
}

                    const fallback = next[idx - 1] ?? next[idx] ?? null;

                    if (fallback) {
                        navigate(fallback.href);

                        return fallback.key;
                    }

                    return null;
                });

                return next;
            });
        },
        [navigate],
    );

    // Persist whenever tabs / activeKey change
    useEffect(() => {
        if (!storageRestored) {
return;
}

        writeStorage(tabs, activeKey);
    }, [storageRestored, tabs, activeKey]);

    const value = useMemo<TabContextValue>(
        () => ({
            tabs,
            activeKey,
            storageRestored,
            openTab,
            activateTab,
            closeTab,
            setTabs,
            setActiveKey,
        }),
        [tabs, activeKey, storageRestored, openTab, activateTab, closeTab],
    );

    return <TabContext.Provider value={value}>{children}</TabContext.Provider>;
}

export function useTabs(): TabContextValue {
    const ctx = useContext(TabContext);

    if (!ctx) {
        throw new Error('useTabs must be used within a TabProvider');
    }

    return ctx;
}
