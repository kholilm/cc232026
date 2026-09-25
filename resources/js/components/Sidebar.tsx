import MenuCard from '@/components/MenuCard';
import { menus } from '@/data/menus';

interface SidebarProps {
    onSelect?: (url: string, name: string) => void;
    activeUrl?: string | null;
}

export default function Sidebar({ onSelect, activeUrl }: SidebarProps) {
    return (
        <div className="flex flex-wrap justify-center gap-3">
            {menus.map((menu, i) => (
                <div
                    key={i}
                    className={
                        activeUrl && menu.links.some((l) => l.url === activeUrl)
                            ? 'rounded-2xl ring-2 ring-cyan-400'
                            : ''
                    }
                >
                    <MenuCard menu={menu} onSelect={onSelect} />
                </div>
            ))}
        </div>
    );
}
