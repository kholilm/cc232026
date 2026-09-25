import { Head, Link, router, usePage } from '@inertiajs/react';
import { FileText } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import InfoController from '@/actions/App/Http/Controllers/InfoController';
import ActionDropdown from '@/components/common/action-dropdown';
import DataTable from '@/components/common/data-table';
import type {Column} from '@/components/common/data-table';
import FlashMessage from '@/components/common/flash-message';
import ModalDelete from '@/components/common/modal-delete';


import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useTabs } from '@/contexts/tab-context';

type Props = {
    infos: any;
    search?: string;
    type?: string;
    limit?: number;
    sort?: string;
    direction?: 'asc' | 'desc';
};

const TYPE_OPTIONS = [
    { value: '', label: 'Semua' },
    { value: 'info', label: 'Info' },
    { value: 'sop', label: 'SOP' },
    { value: 'warning', label: 'Warning' },
];

export default function InfoIndex({
    infos,
    search: initialSearch,
    type: initialType = '',
    limit: initialLimit = 10,
    sort: initialSort = 'created_at',
    direction: initialDirection = 'desc',
}: Props) {
    const initialSearchValue = initialSearch ?? '';
    const initialTypeValue = initialType ?? '';
    const [search, setSearch] = useState(initialSearchValue);
    const [type, setType] = useState(initialTypeValue);

    const [limit, setLimit] = useState(initialLimit);
    const [sort, setSort] = useState(initialSort);
    const [direction, setDirection] = useState<'asc' | 'desc'>(
        initialDirection,
    );

    const [isLoading, setIsLoading] = useState(false);

    const [modalDelete, setModalDelete] = useState(false);
    const [isDelete, setIsDelete] = useState(false);
    const [deleteItem, setDeleteItem] = useState<any>(null);

    const { props } = usePage<any>();
    const { openTab } = useTabs();

    const permissions = props.auth?.permissions ?? [];

    const canCreate = permissions.includes('auth.info.create');
    const canUpdate = permissions.includes('auth.info.update');
    const canDelete = permissions.includes('auth.info.delete');

    const columns: Column[] = [
        {
            label: 'No',
            sortable: false,
        },
        {
            label: 'Judul',
            field: 'title',
            sortable: true,
        },
        {
            label: 'Tipe',
            field: 'type',
            sortable: true,
        },
        {
            label: 'File',
            sortable: false,
        },
        {
            label: 'Opsi',
            sortable: false,
        },
    ];

    const reloadData = (
        params: Partial<{
            search: string;
            type: string;
            limit: number;
            sort: string;
            direction: 'asc' | 'desc';
        }> = {},
    ) => {
        setIsLoading(true);

        router.get(
            InfoController.index().url,
            {
                search,
                type,
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

    useEffect(() => {
        if (search === initialSearchValue && type === initialTypeValue) {
            return;
        }

        const timer = setTimeout(() => {
            reloadData({
                search,
                type,
            });
        }, 500);

        return () => clearTimeout(timer);
    }, [search, type]);

    const handleTypeChange = (value: string) => {
        setType(value);

        reloadData({
            type: value,
        });
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

    const handleDeleteConfirm = (item: any) => {
        setDeleteItem(item);
        setModalDelete(true);
    };

    const handleDelete = () => {
        if (!deleteItem) {
            return;
        }

        setIsDelete(true);

        router.delete(InfoController.destroy(deleteItem.id).url, {
            onFinish: () => {
                setModalDelete(false);
                setDeleteItem(null);
                setIsDelete(false);
            },
        });
    };

    const tableData = useMemo(
        () =>
            infos.data.map((item: any, index: number) => [
                infos.from + index,

                item.title,

                <Badge
                    key={item.id}
                    className={
                        item.type === 'warning'
                            ? 'bg-yellow-500'
                            : item.type === 'sop'
                              ? 'bg-purple-500'
                              : 'bg-blue-500'
                    }
                >
                    {item.type}
                </Badge>,

                item.file ? (
                    <button
                        type="button"
                        className="text-blue-500 underline"
                        onClick={() =>
                            openTab({
                                key: `file-${item.id}`,
                                title: item.title,
                                href: `/info/${item.id}`,
                                icon: FileText,
                            })
                        }
                    >
                        Lihat
                    </button>
                ) : (
                    '-'
                ),

                <ActionDropdown
                    key={item.id}
                    data={item}
                    editUrl={InfoController.edit(item.id).url}
                    onDelete={handleDeleteConfirm}
                    canEdit={canUpdate}
                    canDelete={canDelete}
                />,
            ]),
        [infos.data, infos.from, canUpdate, canDelete, openTab],
    );

    return (
        <>
            <Head title="Info" />

            <FlashMessage />

            <div className="w-full px-4">
                <div className="flex items-center justify-between gap-4 py-2">
                    {canCreate && (
                        <Link href={InfoController.create().url}>
                            <Button>Tambah</Button>
                        </Link>
                    )}

                    <div className="flex items-center gap-2">
                        <Input
                            placeholder="Search..."
                            className="h-8 max-w-sm"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />

                        <select
                            value={type ?? ''}
                            onChange={(e) => handleTypeChange(e.target.value)}
                            className="h-8 rounded-md border border-input bg-background px-2 text-sm shadow-sm focus:ring-1 focus:ring-ring focus:outline-none"
                        >
                            {TYPE_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <DataTable
                    header={columns}
                    data={tableData}
                    isLoading={isLoading}
                    links={infos.links}
                    from={infos.from}
                    to={infos.to}
                    total={infos.total}
                    limit={limit}
                    length={[5, 10, 50, 100]}
                    onLimitChange={handleLimitChange}
                    sort={sort}
                    direction={direction}
                    onSortChange={handleSort}
                />
            </div>

            <ModalDelete
                isOpen={modalDelete}
                setIsOpen={setModalDelete}
                title={deleteItem?.title ?? ''}
                handleDelete={handleDelete}
                isLoading={isDelete}
            />
        </>
    );
}

InfoIndex.layout = {
    breadcrumbs: [
        {
            title: 'Info',
            href: InfoController.index(),
        },
    ],
};
