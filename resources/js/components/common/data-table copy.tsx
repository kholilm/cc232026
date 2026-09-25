import { Link } from '@inertiajs/react';
import type { ReactNode } from 'react';

import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Label } from '../ui/label';
import {
    Pagination,
    PaginationContent,
    PaginationEllipsis,
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

export type FooterSumConfig = {
    [columnIndex: number]: {
        label?: string;
        valueKey?: string;
        format?: (v: number) => string;
    };
};

type Props = {
    header: string[];
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
    footerSummary?: Record<string, number>;
    footerConfig?: FooterSumConfig;
    numericColumns?: number[];
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
    footerSummary,
    footerConfig,
    numericColumns = [],
}: Props) {
    const maxVisible = 1;
    const currentPage = parseInt(links.find((l) => l.active)?.label ?? '1');
    const numericLinks = links.filter((l) => !isNaN(Number(l.label)));

    const totalPages = numericLinks.length;
    const renderFooter = () => {
        if (!footerSummary || !footerConfig) {
            return null;
        }

        return (
            <TableRow className="bg-gray-100 font-semibold dark:bg-gray-800">
                {header.map((_, colIndex) => {
                    const cfg = footerConfig[colIndex];

                    if (!cfg) {
                        return <TableCell key={colIndex}></TableCell>;
                    }

                    // Label footer (TOTAL)
                    if (cfg.label) {
                        return (
                            <TableCell
                                key={colIndex}
                                className="text-center"
                                style={{ minWidth: 80 }}
                            >
                                {cfg.label}
                            </TableCell>
                        );
                    }

                    const val = footerSummary[cfg.valueKey ?? ''] ?? 0;

                    const display = cfg.format
                        ? cfg.format(val)
                        : val.toLocaleString('id-ID');

                    return (
                        <TableCell
                            key={colIndex}
                            className={
                                numericColumns.includes(colIndex)
                                    ? 'text-right'
                                    : 'text-left'
                            }
                            style={{
                                minWidth: 80,
                                whiteSpace: 'nowrap',
                            }}
                        >
                            {display}
                        </TableCell>
                    );
                })}
            </TableRow>
        );
    };

    const renderPagination = () => {
        let lastShown = 0;

        return links.map((link, index) => {
            const label = link.label;
            const pageNumber = parseInt(label);
            const isPrevious = label === '&laquo; Previous';
            const isNext = label === 'Next &raquo;';
            const isDisabled = !link.url;

            if (isPrevious || isNext) {
                if (isDisabled) {
                    return null;
                }

                return (
                    <PaginationItem key={index}>
                        <Link
                            href={link.url ?? '#'}
                            className={
                                isDisabled
                                    ? 'pointer-events-none opacity-50'
                                    : ''
                            }
                        >
                            <Button
                                size="icon"
                                variant="outline"
                                className="h-8 w-8 px-0"
                                title={isPrevious ? 'Sebelumnya' : 'Berikutnya'}
                            >
                                {isPrevious ? '‹' : '›'}
                            </Button>
                        </Link>
                    </PaginationItem>
                );
            }

            if (!isNaN(pageNumber)) {
                const showPage =
                    pageNumber === 1 ||
                    pageNumber === totalPages ||
                    Math.abs(pageNumber - currentPage) <= maxVisible;

                if (!showPage) {
                    if (lastShown !== -1) {
                        lastShown = -1;

                        return (
                            <PaginationItem key={`ellipsis-${index}`}>
                                <PaginationEllipsis />
                            </PaginationItem>
                        );
                    }

                    return null;
                }

                lastShown = pageNumber;

                return (
                    <PaginationItem key={index}>
                        <Link href={link.url ?? '#'}>
                            <Button
                                variant={link.active ? 'default' : 'outline'}
                                size="icon"
                                className="h-8 w-8 px-0 text-sm"
                                dangerouslySetInnerHTML={{ __html: label }}
                            />
                        </Link>
                    </PaginationItem>
                );
            }

            return null;
        });
    };

    return (
        <>
            <Card className="p-0">
                <Table className="w-full overflow-hidden rounded-lg">
                    <TableHeader className="sticky top-0 z-10 bg-muted">
                        <TableRow>
                            {header.map((column) => (
                                <TableHead
                                    key={`th-${column}`}
                                    className="px-2 py-1"
                                >
                                    {column}
                                </TableHead>
                            ))}
                        </TableRow>
                    </TableHeader>

                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell
                                    colSpan={header.length}
                                    className="h-6 py-6 text-center"
                                >
                                    Loading...
                                </TableCell>
                            </TableRow>
                        ) : data.length === 0 ? (
                            <TableRow>
                                <TableCell
                                    colSpan={header.length}
                                    className="h-6 py-6 text-center"
                                >
                                    No Result Data
                                </TableCell>
                            </TableRow>
                        ) : (
                            data.map((row, rowIndex) => (
                                <TableRow key={`tr-${rowIndex}`}>
                                    {row.map((column, columnIndex) => (
                                        <TableCell
                                            key={`tc-${rowIndex}-${columnIndex}`}
                                            className="h-7 px-2 py-0"
                                        >
                                            {column}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        )}
                        {renderFooter()}
                    </TableBody>
                </Table>
            </Card>
            {!isLoading && data?.length > 0 && (
                <div className="mt-1 mb-2 flex flex-col items-center gap-1 md:mt-2 md:flex-row md:justify-between">
                    <div className="text-center text-sm md:text-left">
                        <Label>
                            Showing {from} to {to} from {total} entries
                        </Label>
                    </div>

                    <div className="flex items-center gap-2">
                        {limit && onLimitChange && (
                            <TableLimitSelect
                                value={limit}
                                onChange={onLimitChange}
                                options={length || [10, 50, 100]}
                            />
                        )}

                        <Pagination>
                            <PaginationContent className="gap-1">
                                {renderPagination()}
                            </PaginationContent>
                        </Pagination>
                    </div>
                </div>
            )}
        </>
    );
}
