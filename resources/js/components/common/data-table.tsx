import { Link } from '@inertiajs/react';
import type { ReactNode } from 'react';

import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Label } from '../ui/label';

import {
    Pagination,
    PaginationContent,
    PaginationItem,
} from '../ui/pagination';

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '../ui/table';

import TableLimitSelect from './table-llimit-select';

type Props = {
    header: Column[];
    data: (string | ReactNode)[][];
    isLoading: boolean;

    links: {
        url: string | null;
        label: string;
        active: boolean;
    }[];

    from: number;
    to: number;
    total: number;

    limit?: number;
    length?: number[];

    onLimitChange?: (limit: number) => void;

    // TAMBAHAN SORT
    sort?: string;
    direction?: 'asc' | 'desc';
    onSortChange?: (field: string, direction: 'asc' | 'desc') => void;
};

export type Column = {
    label: string;
    field?: string;
    sortable?: boolean;
};
export default function DataTable({
    header,
    data,
    isLoading,
    links,
    from,
    to,
    total,
    limit,
    length,
    onLimitChange,

    sort,
    direction,
    onSortChange,
}: Props) {
    const renderPagination = () => {
        return links.map((link, index) => {
            const label = link.label;
            const isDisabled = !link.url;

            const isPrev = label.includes('Previous');
            const isNext = label.includes('Next');

            if (isPrev || isNext) {
                return (
                    <PaginationItem key={index}>
                        <Link href={link.url ?? '#'}>
                            <Button
                                size="icon"
                                variant="outline"
                                className="h-8 w-8 px-0"
                                disabled={isDisabled}
                            >
                                {isPrev ? '‹' : '›'}
                            </Button>
                        </Link>
                    </PaginationItem>
                );
            }

            return (
                <PaginationItem key={index}>
                    <Link href={link.url ?? '#'}>
                        <Button
                            size="icon"
                            variant={link.active ? 'default' : 'outline'}
                            className="h-8 w-8 px-0 text-sm"
                        >
                            {label}
                        </Button>
                    </Link>
                </PaginationItem>
            );
        });
    };

    return (
        <>
            <Card className="p-0">
                <div className="max-h-[60vh] overflow-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                {header.map((column, i) => (
                                    <TableHead
                                        key={i}
                                        onClick={() => {
                                            if (
                                                !column.sortable ||
                                                !column.field
                                            ) {
                                                return;
                                            }

                                            const next =
                                                sort === column.field &&
                                                direction === 'asc'
                                                    ? 'desc'
                                                    : 'asc';

                                            onSortChange?.(column.field, next);
                                        }}
                                        className={
                                            column.sortable
                                                ? 'cursor-pointer select-none'
                                                : ''
                                        }
                                    >
                                        {column.label}

                                        {sort === column.field && (
                                            <span className="ml-1">
                                                {direction === 'asc'
                                                    ? '↑'
                                                    : '↓'}
                                            </span>
                                        )}
                                    </TableHead>
                                ))}
                            </TableRow>
                        </TableHeader>

                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={header.length}>
                                        Loading...
                                    </TableCell>
                                </TableRow>
                            ) : data.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={header.length}>
                                        No Data
                                    </TableCell>
                                </TableRow>
                            ) : (
                                data.map((row, i) => (
                                    <TableRow key={i}>
                                        {row.map((cell, j) => (
                                            <TableCell key={j}>
                                                {cell}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </Card>

            {!isLoading && data.length > 0 && (
                <div className="mt-2 flex items-center justify-between">
                    <Label>
                        Showing {from} to {to} of {total}
                    </Label>

                    <div className="flex items-center gap-2">
                        {limit && onLimitChange && (
                            <TableLimitSelect
                                value={limit}
                                onChange={onLimitChange}
                                options={length || [10, 25, 50]}
                            />
                        )}

                        <Pagination>
                            <PaginationContent>
                                {renderPagination()}
                            </PaginationContent>
                        </Pagination>
                    </div>
                </div>
            )}
        </>
    );
}
