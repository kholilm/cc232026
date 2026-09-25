import type { Menu } from '@/data/menus';

interface MenuCardProps {
    menu: Menu;
    onSelect?: (url: string, name: string) => void;
}

export default function MenuCard({ menu, onSelect }: MenuCardProps) {
    const Icon = menu.icon;

    return (
        <div
            className={`relative rounded-2xl bg-linear-to-br p-4 text-white shadow-lg ${menu.color} transition hover:scale-[1.02]`}
        >
            <div className="flex items-start justify-between">
                <h3 className="mr-2 text-sm leading-tight font-semibold">
                    {menu.title}
                </h3>
                <Icon className="opacity-70" />
            </div>

            <div className="mt-4 space-y-2">
                {menu.links.map((link, idx) => (
                    <a
                        key={idx}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => onSelect?.(link.url, link.name)}
                        className="block rounded-md bg-white/20 px-3 py-1 text-sm transition hover:bg-white/30"
                    >
                        {link.name}
                    </a>
                ))}
            </div>

            <div className="absolute -right-5 -bottom-5 h-24 w-24 rounded-full bg-white/20 blur-2xl"></div>
        </div>
    );
}
