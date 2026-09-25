import { Head, Link, router } from '@inertiajs/react';
import { PlusCircleIcon } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import UserController from '@/actions/App/Http/Controllers/Auth/UserController';
import ActionDropdown from '@/components/common/action-dropdown';
import DataTable from '@/components/common/data-table';
import type {Column} from '@/components/common/data-table';
import FlashMessage from '@/components/common/flash-message';
import ModalDelete from '@/components/common/modal-delete';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { Paginated, User } from '@/types/custom';

type Props = {
    users: Paginated<User>;
    search?: string;
    limit?: number;
    sort?: string;
    direction?: 'asc' | 'desc';
};
export default function UserIndex({
    users,
    search: initialSearch,
    limit: initialLimit,
    sort: initialSort = 'name',
    direction: initialDirection = 'asc',
}: Props) {
    const [search, setSearch] = useState(initialSearch ?? '');
    const [limit, setLimit] = useState(initialLimit);
    const [sort, setSort] = useState(initialSort);
    const [direction, setDirection] = useState<'asc' | 'desc'>(
        initialDirection,
    );

    const [isLoading, setIsLoading] = useState(false);
    const [modalDelete, setModalDelete] = useState(false);
    const [isDelete, setIsDelete] = useState(false);
    const [deleteUser, setDeleteUser] = useState<User | null>(null);

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
            label: 'Email',
            field: 'email',
            sortable: false,
        },
        {
            label: 'Role',
            field: 'role',
            sortable: false,
        },
        {
            label: 'Opsi',
            sortable: false,
        },
    ];

    useEffect(() => {
        if (search === (initialSearch ?? '')) {
            return;
        }

        const timer = setTimeout(() => {
            reloadData({
                search,
                page: 1, // search selalu mulai dari halaman pertama
            });
        }, 500);

        return () => clearTimeout(timer);
    }, [search]);

    const handleDeleteConfirm = (user: User) => {
        setDeleteUser(user);
        setModalDelete(true);
    };

    const handleDelete = () => {
        if (!deleteUser) {
            return;
        }

        setIsDelete(true);
        router.delete(UserController.destroy(deleteUser.id), {
            onFinish: () => {
                setModalDelete(false);
                setDeleteUser(null);
                setIsDelete(false);
            },
        });
    };

    const tableData = useMemo(
        () =>
            users.data.map((user, index) => [
                users.from + index,
                user.name,
                user.email,
                <div className="flex flex-wrap gap-1">
                    {user.roles.map((role) => (
                        <Badge key={role.id}>{role.name}</Badge>
                    ))}
                </div>,
                <ActionDropdown
                    key={user.id}
                    data={user}
                    editUrl={UserController.edit(user.id).url}
                    onDelete={handleDeleteConfirm}
                />,
            ]),
        [users.data, users.from, handleDeleteConfirm],
    );

    const reloadData = (
        params: Partial<{
            search: string;
            limit: number;
            sort: string;
            direction: 'asc' | 'desc';
            page: number;
        }> = {},
    ) => {
        setIsLoading(true);

        router.get(
            UserController.index().url,
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
                onFinish: () => setIsLoading(false),
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
            <Head title="User" />
            <FlashMessage />
            <div className="w-full px-4">
                <div className="flex flex-col gap-2 py-2 md:flex-row md:items-center md:justify-between">
                    <Link href={UserController.create()}>
                        <Button size={'sm'} type="button">
                            <PlusCircleIcon className="h-8" /> Tambah
                        </Button>
                    </Link>
                    <Input
                        placeholder="Search..."
                        className="h-8 md:max-w-sm"
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
                    links={users.links}
                    from={users.from}
                    to={users.to}
                    total={users.total}
                    limit={limit}
                    onLimitChange={handleLimitChange}
                    length={[5, 10, 50, 100]}
                />
            </div>
            <ModalDelete
                isOpen={modalDelete}
                setIsOpen={setModalDelete}
                title={deleteUser?.name ?? ''}
                handleDelete={handleDelete}
                isLoading={isDelete}
            />
        </>
    );
}

UserIndex.layout = {
    breadcrumbs: [
        {
            title: 'User',
            href: UserController.index(),
        },
    ],
};
