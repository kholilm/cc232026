import { router } from '@inertiajs/react';
import { Pencil, Trash2 } from 'lucide-react';
import DropdownAction from '@/components/common/dropdown-action';

type ActionDropdownProps<T> = {
    data: T;
    onEdit?: (data: T) => void;
    onDelete?: (data: T) => void;
    editUrl?: string;

    canEdit?: boolean;
    canDelete?: boolean;
};

export default function ActionDropdown<T>({
    data,
    onEdit,
    onDelete,
    editUrl,

    canEdit = true,
    canDelete = true,
}: ActionDropdownProps<T>) {
    const menu = [];

    if (canEdit && (onEdit || editUrl)) {
        menu.push({
            label: (
                <span className="flex items-center gap-2">
                    <Pencil className="h-4 w-4" />
                    Edit
                </span>
            ),
            action: () => {
                if (onEdit) {
                    return onEdit(data);
                }

                if (editUrl) {
                    return router.visit(editUrl);
                }
            },
        });
    }

    if (canDelete && onDelete) {
        menu.push({
            label: (
                <span className="flex items-center gap-2 text-red-500">
                    <Trash2 className="h-4 w-4" />
                    Delete
                </span>
            ),

            variant: 'destructive' as const,

            action: () => onDelete(data),
        });
    }

    if (!menu.length) {
        return null;
    }

    return <DropdownAction menu={menu} />;
}
