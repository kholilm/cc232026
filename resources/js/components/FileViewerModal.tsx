import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { useEffect, useMemo, useState } from 'react';
import ExcelViewer from '@/components/ExcelViewer';

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogTitle,
} from '@/components/ui/dialog';


type Props = {
    isOpen: boolean;
    onClose: () => void;

    item?: {
        id: number;
        file?: string;
        title?: string;
    };
};

export default function FileViewerModal({ isOpen, onClose, item }: Props) {
    const [isFullscreen, setIsFullscreen] = useState(false);

    useEffect(() => {
        if (!isOpen) {
            setIsFullscreen(false);
        }
    }, [isOpen]);

    const fileUrl = item?.file ? `/storage/${item.file}` : '';

    const fileType = useMemo(() => {
        if (!item?.file) {
            return 'other';
        }

        const ext = item.file.split('.').pop()?.toLowerCase();

        if (['xls', 'xlsx', 'csv'].includes(ext ?? '')) {
            return 'excel';
        }

        if (ext === 'pdf') {
            return 'pdf';
        }

        if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext ?? '')) {
            return 'image';
        }

        if (['html', 'htm'].includes(ext ?? '')) {
            return 'html';
        }

        return 'other';
    }, [item?.file]);

    if (!item?.file) {
        return null;
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent
                className={
                    isFullscreen
                        ? `fixed inset-0 flex h-screen w-screen max-w-none translate-x-[-50%] translate-y-[-50%] flex-col rounded-none p-0`
                        : `flex h-[90vh] w-[90vw] max-w-[1200px] flex-col p-0`
                }
            >
                <VisuallyHidden>
                    <DialogTitle>Preview File {item.title}</DialogTitle>

                    <DialogDescription>
                        Preview file attachment
                    </DialogDescription>
                </VisuallyHidden>

                {/* HEADER */}
                <div className="flex shrink-0 items-center gap-4 border-b px-4 py-3">
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">
                        {item.title}
                    </span>

                    <div className="flex shrink-0 gap-2">
                        <a
                            href={fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded border px-3 py-1 text-sm hover:bg-muted"
                        >
                            Download
                        </a>

                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded border px-3 py-1 text-sm hover:bg-muted"
                        >
                            Close
                        </button>
                    </div>
                </div>

                {/* CONTENT */}
                <div className="min-h-0 flex-1 overflow-hidden">
                    {/* EXCEL */}
                    {fileType === 'excel' && (
                        <div className="h-full w-full overflow-auto">
                            <ExcelViewer fileUrl={fileUrl} />
                        </div>
                    )}

                    {/* PDF */}
                    {fileType === 'pdf' && (
                        <div className="h-full w-full bg-muted">
                            <iframe
                                src={`${fileUrl}#toolbar=1&navpanes=1`}
                                title={item.title ?? item.file}
                                className="h-full w-full border-0"
                            />
                        </div>
                    )}

                    {/* IMAGE */}
                    {fileType === 'image' && (
                        <div className="flex h-full w-full items-center justify-center overflow-auto bg-muted p-4">
                            <img
                                src={fileUrl}
                                alt={item.title ?? item.file}
                                loading="lazy"
                                className="max-h-full max-w-full rounded object-contain shadow"
                            />
                        </div>
                    )}

                    {/* HTML */}
                    {fileType === 'html' && (
                        <iframe
                            src={fileUrl}
                            title={item.title ?? item.file}
                            className="h-full w-full border-0"
                        />
                    )}

                    {/* OTHER */}
                    {fileType === 'other' && (
                        <div className="flex h-full items-center justify-center">
                            <a
                                href={fileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-500 underline"
                            >
                                Download File
                            </a>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
