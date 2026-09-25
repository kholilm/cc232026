import { Head, router } from '@inertiajs/react';
import { useEffect, useMemo, useState } from 'react';
import SessionController from '@/actions/App/Http/Controllers/Auth/SessionController';
import DataTable from '@/components/common/data-table';
import type {Column} from '@/components/common/data-table';
import FlashMessage from '@/components/common/flash-message';
import { Input } from '@/components/ui/input';
import type { Paginated, Session } from '@/types/custom';

type Props = {
    sessions: Paginated<Session>;
    search?: string;
    limit?: number;
    sort?: string;
    direction?: 'asc' | 'desc';
};
export default function SessionIndex({
    sessions,
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
                SessionController.index().url,
                {
                    search,
                    limit,
                    sort,
                    direction,
                },
                {
                    preserveState: true,
                    replace: true,
                    onFinish: () => setIsLoading(false),
                },
            );
        }, 500);

        return () => clearTimeout(delayDebounce);
    }, [search, initialSearch, limit, sort, direction]);

    const columns: Column[] = [
        {
            label: 'No',
            sortable: false,
        },
        {
            label: 'User',
            field: 'user',
            sortable: false,
        },
        {
            label: 'IP Address',
            field: 'ip_address',
            sortable: true,
        },
        {
            label: 'Last Active',
            field: 'last_activity',
            sortable: true,
        },
        {
            label: 'Via',
            field: 'user_agent',
            sortable: false,
        },
    ];

    const tableData = useMemo(
        () =>
            sessions.data.map((session, i) => [
                sessions.from + i,
                session.user?.name,
                session.ip_address,
                new Date(session.last_activity * 1000).toLocaleString('id-ID', {
                    dateStyle: 'medium',
                    timeStyle: 'medium',
                }),
                session.user_agent,
            ]),
        [sessions.data, sessions.from],
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
            SessionController.index().url,
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
            <Head title="Session" />
            <FlashMessage />
            <div className="w-full px-4">
                <div className="flex flex-col gap-2 py-2 md:flex-row md:items-center">
                    <Input
                        placeholder="Search..."
                        className="h-8 w-full md:w-125"
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
                    links={sessions.links}
                    from={sessions.from}
                    to={sessions.to}
                    total={sessions.total}
                    limit={limit}
                    onLimitChange={handleLimitChange}
                    length={[10, 25, 50, 100]}
                />
            </div>
        </>
    );
}

SessionIndex.layout = {
    breadcrumbs: [
        {
            title: 'Session',
            href: SessionController.index(),
        },
    ],
};
