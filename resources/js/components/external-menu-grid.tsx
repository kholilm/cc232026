import { menus  } from '@/data/menus';
import type {Menu} from '@/data/menus';
import { useExternalWindow } from '@/hooks/use-external-window';
import { cn } from '@/lib/utils';

function MenuCard({ menu }: { menu: Menu }) {
    const { open } = useExternalWindow();
    const Icon = menu.icon;

    return (
        <div className="bg-card text-card-foreground rounded-lg border shadow-sm">
            <div className="flex items-center gap-3 border-b px-4 py-3">
                <div
                    className={cn(
                        'flex h-9 w-9 items-center justify-center rounded-md bg-gradient-to-br text-white',
                        menu.color,
                    )}
                >
                    <Icon className="h-5 w-5" />
                </div>
                <h3 className="text-base font-semibold">{menu.title}</h3>
            </div>
            <div className="flex flex-col p-2">
                {menu.links.map((link) => (
                    <button
                        key={link.url}
                        type="button"
                        onClick={() => open(link.url, link.name)}
                        className="hover:bg-muted flex items-center justify-between rounded-md px-3 py-2 text-left text-sm transition-colors"
                    >
                        <span>{link.name}</span>
                        <span className="text-muted-foreground text-xs">
                            ↗
                        </span>
                    </button>
                ))}
            </div>
        </div>
    );
}

export function ExternalMenuGrid() {
    return (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {menus.map((menu) => (
                <MenuCard key={menu.title} menu={menu} />
            ))}
        </div>
    );
}
