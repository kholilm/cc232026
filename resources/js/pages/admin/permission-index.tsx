import { Head, Link, router } from '@inertiajs/react';
import { Pencil, PlusCircleIcon, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import PermissionController from '@/actions/App/Http/Controllers/Auth/PermissionController';
import DataTable from '@/components/common/data-table';
import type {Column} from '@/components/common/data-table';
import DropdownAction from '@/components/common/dropdown-action';
import FlashMessage from '@/components/common/flash-message';
import ModalDelete from '@/components/common/modal-delete';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { Paginated, Permission } from '@/types/custom';

type Props = {
    permissions: Paginated<Permission>;
    search?: string;
    limit?: number;
    sort?: string;
    direction?: 'asc' | 'desc';
};
export default function PermissionIndex({
    permissions,
    limit: initalLimit,
    search: initialSearch,
    sort: initialSort = 'name',
    direction: initialDirection = 'asc',
}: Props) {
    const [search, setSearch] = useState(initialSearch ?? '');
    const [limit, setLimit] = useState(initalLimit);
    const [sort, setSort] = useState(initialSort);
    const [direction, setDirection] = useState<'asc' | 'desc'>(
        initialDirection,
    );
    const [isLoading, setIsLoading] = useState(false);
    const [modalDelete, setModalDelete] = useState(false);
    const [isDelete, setIsDelete] = useState(false);
    const [deletePermission, setdeletePermission] = useState<Permission | null>(
        null,
    );

    const columns: Column[] = [
        {
            label: 'No',
            sortable: false,
        },
        {
            label: 'Name',
            field: 'name',
            sortable: true,
        },
        {
            label: 'Guard',
            field: 'guard_name',
            sortable: false,
        },
        {
            label: 'Opsi',
            sortable: false,
        },
    ];

    useEffect(() => {
        if (search === initialSearch) {
            return;
        }

        const delayDebounce = setTimeout(() => {
            setIsLoading(true);
            router.get(
                PermissionController.index(),
                { search },
                {
                    preserveState: true,
                    replace: true,
                    onFinish: () => setIsLoading(false),
                },
            );
        }, 500);

        return () => clearTimeout(delayDebounce);
    }, [search, initialSearch]);

    const handleDeleteConfirm = (permission: Permission) => {
        setdeletePermission(permission);
        setModalDelete(true);
    };

    const handleDelete = () => {
        if (!deletePermission) {
            return;
        }

        setIsDelete(true);
        router.delete(PermissionController.destroy(deletePermission.id), {
            onFinish: () => {
                setModalDelete(false);
                setdeletePermission(null);
                setIsDelete(false);
            },
        });
    };

    const limitPage = (newLimit: number) => {
        setLimit(newLimit);
        setIsLoading(true);
        router.get(
            PermissionController.index().url,
            { limit: newLimit, search },
            {
                preserveState: true,
                replace: true,
                onFinish: () => setIsLoading(false),
            },
        );
    };
    const tableData = useMemo(
        () =>
            permissions.data.map((permission, index) => [
                permissions.from + index,
                permission.name,
                permission.guard_name,
                <DropdownAction
                    key={permission.id}
                    menu={[
                        {
                            label: (
                                <span className="flex items-center gap-2">
                                    <Pencil className="h-4 w-4" />
                                    Edit
                                </span>
                            ),
                            action: () =>
                                router.visit(
                                    PermissionController.edit(permission.id)
                                        .url,
                                ),
                        },
                        {
                            label: (
                                <span className="flex items-center gap-2 text-red-500">
                                    <Trash2 className="h-4 w-4" />
                                    Delete
                                </span>
                            ),
                            variant: 'destructive',
                            action: () => handleDeleteConfirm(permission),
                        },
                    ]}
                />,
            ]),
        [permissions.data, permissions.from],
    );

    const handleSort = (field: string, dir: 'asc' | 'desc') => {
        setSort(field);
        setDirection(dir);

        router.get(
            PermissionController.index().url,
            {
                search,
                limit,
                sort: field,
                direction: dir,
            },
            {
                preserveState: true,
                replace: true,
            },
        );
    };

    return (
        <>
            <Head title="Permission" />
            <FlashMessage />
            <div className="w-full px-4">
                <div className="flex items-center justify-between gap-4 py-2">
                    <Link href={PermissionController.create()}>
                        <Button size={'sm'} type="button">
                            <PlusCircleIcon className="h-8" /> Tambah
                        </Button>
                    </Link>
                    <Input
                        placeholder="Search..."
                        className="h-8 max-w-sm"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <DataTable
                    header={columns}
                    data={tableData}
                    sort={sort}
                    direction={direction}
                    onSortChange={handleSort}
                    isLoading={isLoading}
                    links={permissions.links}
                    from={permissions.from}
                    to={permissions.to}
                    total={permissions.total}
                    limit={limit}
                    onLimitChange={limitPage}
                    length={[5, 10, 50, 100]}
                />
            </div>
            <ModalDelete
                isOpen={modalDelete}
                setIsOpen={setModalDelete}
                title={deletePermission?.name ?? ''}
                handleDelete={handleDelete}
                isLoading={isDelete}
            />
        </>
    );
}

PermissionIndex.layout = {
    breadcrumbs: [
        {
            title: 'Permission',
            href: PermissionController.index(),
        },
    ],
};
