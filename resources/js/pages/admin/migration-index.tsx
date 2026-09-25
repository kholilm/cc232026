import { Head, Link, router } from '@inertiajs/react';
import { ArrowDownToLine, DatabaseBackup } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import MigrationController from '@/actions/App/Http/Controllers/Auth/MigrationController';
import ActionDropdown from '@/components/common/action-dropdown';
import DataTable from '@/components/common/data-table';
import type {Column} from '@/components/common/data-table';
import FlashMessage from '@/components/common/flash-message';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { Migration, Paginated } from '@/types/custom';

type Props = {
    migrations: Paginated<Migration>;
    search?: string;
    limit?: number;
    sort?: string;
    direction?: 'asc' | 'desc';
};
export default function MigrationIndex({
    migrations,
    limit: initialLimit,
    search: initialSearch,
    sort: initialSort = 'name',
    direction: initialDirection = 'asc',
}: Props) {
    const [search, setSearch] = useState(initialSearch ?? '');
    const [limit, setLimit] = useState(initialLimit ?? 10);
    const [sort, setSort] = useState(initialSort);
    const [direction, setDirection] = useState<'asc' | 'desc'>(
        initialDirection,
    );
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (search === initialSearch) {
            return;
        }

        const delayDebounce = setTimeout(() => {
            setIsLoading(true);

            router.get(
                MigrationController.index().url,
                {
                    search,
                    limit,
                },
                {
                    preserveState: true,
                    replace: true,
                    onFinish: () => setIsLoading(false),
                },
            );
        }, 500);

        return () => clearTimeout(delayDebounce);
    }, [search, initialSearch, limit]);

    const columns: Column[] = [
        {
            label: 'No',
            sortable: false,
        },
        {
            label: 'Migration',
            field: 'migration',
            sortable: true,
        },
        {
            label: 'Batch',
            field: 'batch',
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
            limit: number;
            sort: string;
            direction: 'asc' | 'desc';
        }> = {},
    ) => {
        router.get(
            MigrationController.index().url,
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

    const tableData = useMemo(
        () =>
            migrations.data.map((migration, index) => [
                migrations.from + index,
                migration.migration,
                migration.batch,
                <ActionDropdown
                    key={migration.id}
                    data={migration}
                    editUrl={MigrationController.edit(migration.id).url}
                />,
            ]),
        [migrations.data, migrations.from],
    );

    const handleLimitChange = (newLimit: number) => {
        setLimit(newLimit);

        reloadData({
            limit: newLimit,
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

    return (
        <>
            <Head title="Migration" />
            <FlashMessage />
            <div className="w-full px-4">
                <div className="flex flex-col gap-2 py-2 md:flex-row md:items-center md:justify-between">
                    <div className="flex flex-col gap-2 md:flex-row">
                        <Link href={MigrationController.create().url}>
                            <Button size="sm" type="button">
                                <DatabaseBackup className="h-4 w-4" />
                                Backup Database
                            </Button>
                        </Link>

                        <a href={MigrationController.download().url}>
                            <Button size="sm" type="button">
                                <ArrowDownToLine className="h-4 w-4" />
                                Download Database
                            </Button>
                        </a>
                    </div>

                    <Input
                        placeholder="Search..."
                        className="h-8 w-full md:max-w-sm"
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
                    links={migrations.links}
                    from={migrations.from}
                    to={migrations.to}
                    total={migrations.total}
                    limit={limit}
                    onLimitChange={handleLimitChange}
                    length={[10, 50, 100]}
                />
            </div>
        </>
    );
}

MigrationIndex.layout = {
    breadcrumbs: [
        {
            title: 'Migration',
            href: MigrationController.index(),
        },
    ],
};
