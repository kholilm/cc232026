import { EllipsisVertical } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from '../ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '../ui/dropdown-menu';

export default function DropdownAction({
    menu,
}: {
    menu: {
        label: string | ReactNode;
        variant?: 'default' | 'destructive';
        action?: () => void;
        type?: 'button' | 'link';
    }[];
}) {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    className="size-8 text-muted-foreground"
                    size="icon"
                >
                    <EllipsisVertical />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-32">
                {menu.map((item, index) => (
                    <DropdownMenuItem
                        key={`dropdown-action-${index}`}
                        variant={item.variant || 'default'}
                        asChild={item.type === 'link'}
                        onClick={item.action}
                    >
                        {item.label}
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
