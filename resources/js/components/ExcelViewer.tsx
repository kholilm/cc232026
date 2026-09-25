import { useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';

type Props = {
    fileUrl: string;
};

export default function ExcelViewer({ fileUrl }: Props) {
    const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);

    const [activeSheet, setActiveSheet] = useState('');

    const [loading, setLoading] = useState(true);

    const [error, setError] = useState('');

    useEffect(() => {
        let mounted = true;

        const loadExcel = async () => {
            try {
                setLoading(true);
                setError('');

                const response = await fetch(fileUrl);

                if (!response.ok) {
                    throw new Error('Gagal memuat file');
                }

                const buffer = await response.arrayBuffer();

                const wb = XLSX.read(buffer, {
                    type: 'array',
                    cellDates: true,
                });

                if (!mounted) {
return;
}

                setWorkbook(wb);

                setActiveSheet(wb.SheetNames[0] ?? '');
            } catch (err) {
                console.error(err);

                if (mounted) {
                    setError('Gagal membaca file Excel');
                }
            } finally {
                if (mounted) {
                    setLoading(false);
                }
            }
        };

        loadExcel();

        return () => {
            mounted = false;
        };
    }, [fileUrl]);

    const rows = useMemo(() => {
        if (!workbook || !activeSheet) {
            return [];
        }

        const sheet = workbook.Sheets[activeSheet];

        return XLSX.utils.sheet_to_json(sheet, {
            header: 1,
            defval: '',
            blankrows: true,
        }) as (string | number | boolean | null)[][];
    }, [workbook, activeSheet]);

    const maxColumns = useMemo(() => {
        return Math.max(...rows.map((row) => row.length), 0);
    }, [rows]);

    if (loading) {
        return (
            <div className="flex h-full w-full items-center justify-center">
                Loading Excel...
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex h-full w-full items-center justify-center text-red-500">
                {error}
            </div>
        );
    }

    if (!workbook) {
        return (
            <div className="flex h-full w-full items-center justify-center">
                File tidak dapat dibuka
            </div>
        );
    }

    return (
        <div className="flex h-full min-h-0 w-full flex-col bg-background">
            {/* SHEET TAB */}
            {workbook.SheetNames.length > 1 && (
                <div className="flex shrink-0 gap-2 overflow-x-auto border-b p-2">
                    {workbook.SheetNames.map((sheetName) => (
                        <button
                            key={sheetName}
                            type="button"
                            onClick={() => setActiveSheet(sheetName)}
                            className={`rounded-md px-4 py-2 text-sm whitespace-nowrap ${
                                activeSheet === sheetName
                                    ? 'bg-primary text-primary-foreground'
                                    : 'border hover:bg-muted'
                            } `}
                        >
                            {sheetName}
                        </button>
                    ))}
                </div>
            )}

            {/* TABLE */}
            <div className="min-h-0 flex-1 overflow-auto">
                <table className="w-full border-collapse text-sm">
                    <tbody>
                        {rows.map((row, rowIndex) => (
                            <tr
                                key={rowIndex}
                                className={
                                    rowIndex === 0
                                        ? `sticky top-0 z-10 bg-muted font-semibold`
                                        : ''
                                }
                            >
                                {Array.from({
                                    length: maxColumns,
                                }).map((_, colIndex) => (
                                    <td
                                        key={`${rowIndex}-${colIndex}`}
                                        className="border px-3 py-2 align-top whitespace-pre-wrap"
                                    >
                                        {String(row[colIndex] ?? '')}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* FOOTER */}
            <div className="shrink-0 border-t px-3 py-2 text-xs text-muted-foreground">
                Sheet: {activeSheet}
                {' • '}
                {rows.length} baris
            </div>
        </div>
    );
}
