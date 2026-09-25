import { Head, Link, router } from '@inertiajs/react';
import { PlusCircleIcon } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import RoleController from '@/actions/App/Http/Controllers/Auth/RoleController';
import ActionDropdown from '@/components/common/action-dropdown';
import DataTable from '@/components/common/data-table';
import type {Column} from '@/components/common/data-table';
import FlashMessage from '@/components/common/flash-message';
import ModalDelete from '@/components/common/modal-delete';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { Paginated, Role } from '@/types/custom';

type Props = {
    roles: Paginated<Role>;
    search?: string;
    limit?: number;
    sort?: string;
    direction?: 'asc' | 'desc';
};
export default function RoleIndex({
    roles,
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
    const [deleteRole, setDeleteRole] = useState<Role | null>(null);

    const columns: Column[] = [
        {
            label: 'No',
            sortable: false,
        },
        {
            label: 'Opsi',
            sortable: false,
        },
        {
            label: 'Name',
            field: 'name',
            sortable: true,
        },
        {
            label: 'Permission',
            field: 'permission',
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
                RoleController.index(),
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

    const handleDeleteConfirm = (role: Role) => {
        setDeleteRole(role);
        setModalDelete(true);
    };

    const handleDelete = () => {
        if (!deleteRole) {
            return;
        }

        setIsDelete(true);
        router.delete(RoleController.destroy(deleteRole.id), {
            onFinish: () => {
                setModalDelete(false);
                setDeleteRole(null);
                setIsDelete(false);
            },
        });
    };
    const tableData = useMemo(
        () =>
            roles.data.map((role, index) => [
                roles.from + index,
                <ActionDropdown
                    key={role.id}
                    data={role}
                    editUrl={RoleController.edit(role.id).url}
                    onDelete={handleDeleteConfirm}
                />,
                role.name,
                <div className="flex flex-wrap gap-1">
                    {role.permissions.map((permission) => (
                        <Badge key={permission.id}>{permission.name}</Badge>
                    ))}
                </div>,
            ]),
        [roles.data, roles.from],
    );

    const reloadData = (
        params: Partial<{
            search: string;
            limit: number;
            sort: string;
            direction: 'asc' | 'desc';
        }> = {},
    ) => {
        router.get(
            RoleController.index().url,
            {
                search,
                limit,
                sort,
                direction,
                ...params,
            },
            {
                preserveState: true,
                replace: true,
            },
        );
    };

    const handleSort = (field: string, dir: 'asc' | 'desc') => {
        setSort(field);
        setDirection(dir);

        reloadData({
            sort: field,
            direction: dir,
        });
    };

    const handleLimitChange = (newLimit: number) => {
        setLimit(newLimit);

        reloadData({
            limit: newLimit,
        });
    };

    return (
        <>
            <Head title="Role" />
            <FlashMessage />
            <div className="w-full px-4">
                <div className="flex items-center justify-between gap-4 py-2">
                    <Link href={RoleController.create()}>
                        <Button size={'sm'} type="button">
                            <PlusCircleIcon className="h-8" /> Tambah
                        </Button>
                    </Link>
                    <Input
                        placeholder="Search..."
                        className="h-8 w-full md:w-80"
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
                    links={roles.links}
                    from={roles.from}
                    to={roles.to}
                    total={roles.total}
                    limit={limit}
                    onLimitChange={handleLimitChange}
                    length={[5, 10, 50, 100]}
                />
            </div>

            <ModalDelete
                isOpen={modalDelete}
                setIsOpen={setModalDelete}
                title={deleteRole?.name ?? ''}
                handleDelete={handleDelete}
                isLoading={isDelete}
            />
        </>
    );
}

RoleIndex.layout = {
    breadcrumbs: [
        {
            title: 'Role',
            href: RoleController.index(),
        },
    ],
};
