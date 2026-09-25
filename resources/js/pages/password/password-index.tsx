import { Head, Link, router } from '@inertiajs/react';
import axios from 'axios';
import { PlusCircleIcon, Eye, EyeOff } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import PasswordVaultController from '@/actions/App/Http/Controllers/PasswordVaultController';
import ActionDropdown from '@/components/common/action-dropdown';
import type { Column } from '@/components/common/data-table';
import DataTable from '@/components/common/data-table';
import FlashMessage from '@/components/common/flash-message';
import ModalDelete from '@/components/common/modal-delete';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import type { PasswordVault } from '@/types/custom';


type Props = {
    vaults?: any;
    search?: string;
    limit?: number;
    sort?: string;
    direction?: 'asc' | 'desc';
};

export default function PasswordIndex({
    vaults,
    search: initialSearch = '',
    limit: initialLimit = 10,
    sort: initialSort = 'app_name',
    direction: initialDirection = 'asc',
}: Props) {
    // SAFE DATA GUARD
    const safeVaults = vaults ?? {
        data: [],
        links: [],
        from: 0,
        to: 0,
        total: 0,
    };

    const [search, setSearch] = useState<string>(initialSearch ?? '');
    const [limit, setLimit] = useState<number>(initialLimit ?? 10);
    const [sort, setSort] = useState<string>(initialSort ?? 'app_name');
    const [direction, setDirection] = useState<'asc' | 'desc'>(
        initialDirection ?? 'asc',
    );

    const [selectedVault, setSelectedVault] = useState<PasswordVault | null>(
        null,
    );
    const [openPassword, setOpenPassword] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const [deleteUser, setDeleteUser] = useState<PasswordVault | null>(null);
    const [modalDelete, setModalDelete] = useState(false);
    const [isDelete, setIsDelete] = useState(false);

    // SEARCH (DEBOUNCE SAFE)
    useEffect(() => {
        const delay = setTimeout(() => {
            router.get(
                '/password',
                { search },
                {
                    preserveState: true,
                    replace: true,
                },
            );
        }, 400);

        return () => clearTimeout(delay);
    }, [search]);

    const handleDeleteConfirm = (user: PasswordVault) => {
        setDeleteUser(user);
        setModalDelete(true);
    };

    const handleDelete = () => {
        if (!deleteUser) {
return;
}

        setIsDelete(true);

        router.delete(`/password/${deleteUser.id}`, {
            onFinish: () => {
                setModalDelete(false);
                setDeleteUser(null);
                setIsDelete(false);
            },
        });
    };

    // TABLE DATA (FIXED SAFE + KEY CLEAN)
    const tableData = useMemo(() => {
        return safeVaults.data.map((v: PasswordVault, i: number) => [
            safeVaults.from + i,

            <ActionDropdown
                key={`action-${v.id}`}
                data={v}
                editUrl={`/password/${v.id}/edit`}
                onDelete={handleDeleteConfirm}
            />,

            v.app_name ?? '',
            v.username ?? '',
            v.email ?? '',

            <Button
                key={`view-${v.id}`}
                size="sm"
                variant="ghost"
                onClick={async () => {
                    try {
                        const res = await axios.get(
                            `/password/${v.id}/view-password`,
                        );

                        setSelectedVault({
                            ...v,
                            password: String(res.data.password ?? ''),
                        });

                        setOpenPassword(true);
                        setShowPassword(false);
                    } catch (err) {
                        console.error(err);
                    }
                }}
            >
                <Eye className="h-4 w-4" />
            </Button>,

            v.notes ?? '',
        ]);
    }, [safeVaults.data]);

    const columns: Column[] = [
        { label: 'No' },
        { label: 'Opsi', sortable: false },
        { label: 'App Name', field: 'app_name', sortable: true },
        { label: 'Username', field: 'username', sortable: false },
        { label: 'Email', field: 'email', sortable: false },
        { label: 'Password', sortable: false },
        { label: 'Notes', sortable: false },
    ];

    return (
        <>
            <Head title="Password Vault" />
            <FlashMessage />

            {/* HEADER */}
            <div className="flex justify-between p-4">
                <Link href="/password/create">
                    <Button>
                        <PlusCircleIcon className="h-4 w-4" />
                        Tambah
                    </Button>
                </Link>

                <Input
                    className="max-w-sm"
                    value={search ?? ''}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search..."
                />
            </div>

            {/* TABLE */}
            <DataTable
                header={columns}
                data={tableData}
                isLoading={false}
                links={safeVaults.links}
                from={safeVaults.from}
                to={safeVaults.to}
                total={safeVaults.total}
                limit={limit}
                sort={sort}
                direction={direction}
                onSortChange={(field, dir) => {
                    setSort(field);
                    setDirection(dir);

                    router.get(
                        '/password',
                        {
                            search,
                            sort: field,
                            direction: dir,
                            limit,
                        },
                        {
                            preserveState: true,
                            replace: true,
                        },
                    );
                }}
                onLimitChange={(l) => {
                    setLimit(l);

                    router.get(
                        '/password',
                        {
                            limit: l,
                            search,
                            sort,
                            direction,
                        },
                        {
                            preserveState: true,
                            replace: true,
                        },
                    );
                }}
            />

            {/* DELETE MODAL */}
            <ModalDelete
                isOpen={modalDelete}
                setIsOpen={setModalDelete}
                title={deleteUser?.app_name ?? ''}
                handleDelete={handleDelete}
                isLoading={isDelete}
            />

            {/* PASSWORD MODAL */}
            <Dialog open={openPassword} onOpenChange={setOpenPassword}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Password</DialogTitle>
                        <DialogDescription>
                            Lihat password vault
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex gap-2">
                        <Input
                            ref={(el) => {
                                if (el && showPassword) {
                                    setTimeout(() => {
                                        el.select();
                                    }, 50);
                                }
                            }}
                            type={showPassword ? 'text' : 'password'}
                            value={String(selectedVault?.password ?? '')}
                            readOnly
                        />
                        <Button
                            size="icon"
                            onClick={() => setShowPassword(!showPassword)}
                        >
                            {showPassword ? <EyeOff /> : <Eye />}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}

PasswordIndex.layout = {
    breadcrumbs: [
        {
            title: 'Password',
            href: PasswordVaultController.index(),
        },
    ],
};
