import { useEffect, useMemo, useState } from 'react';
import ExcelViewer from '@/components/ExcelViewer';
import PdfViewer from '@/components/PdfViewer';

type Props = {
    file: string;
    title: string;
};

type ViewerKind = 'pdf' | 'image' | 'excel' | 'html' | 'text' | 'unknown';

function getExt(name?: string | null): string {
    if (!name) {
return '';
}

    const clean = name.split('?')[0].split('#')[0];
    const idx = clean.lastIndexOf('.');

    if (idx === -1) {
return '';
}

    return clean.substring(idx + 1).toLowerCase();
}

function getKind(file?: string | null): ViewerKind {
    const ext = getExt(file);

    if (ext === 'pdf') {
return 'pdf';
}

    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) {
return 'image';
}

    if (['xls', 'xlsx', 'csv'].includes(ext)) {
return 'excel';
}

    if (['html', 'htm'].includes(ext)) {
return 'html';
}

    if (ext === 'txt') {
return 'text';
}

    return 'unknown';
}

function TextViewer({ file }: { file: string }) {
    const [content, setContent] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        let mounted = true;
        const load = async () => {
            try {
                setLoading(true);
                setError('');
                const res = await fetch(file);

                if (!res.ok) {
throw new Error('Gagal memuat file');
}

                const text = await res.text();

                if (mounted) {
setContent(text);
}
            } catch (err) {
                console.error(err);

                if (mounted) {
setError('Gagal membaca file teks');
}
            } finally {
                if (mounted) {
setLoading(false);
}
            }
        };
        load();

        return () => {
            mounted = false;
        };
    }, [file]);

    if (loading) {
        return (
            <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
                Loading teks...
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex h-full w-full items-center justify-center text-sm text-red-500">
                {error}
            </div>
        );
    }

    return (
        <div className="h-full w-full overflow-auto bg-white p-4">
            <pre className="m-0 font-mono text-sm leading-relaxed break-words whitespace-pre-wrap text-gray-800">
                {content}
            </pre>
        </div>
    );
}

function HtmlViewer({ file, title }: { file: string; title: string }) {
    return (
        <iframe
            src={file}
            title={title}
            className="h-full w-full border-0 bg-white"
        />
    );
}

function ImageViewer({ file, title }: { file: string; title: string }) {
    return (
        <div className="flex h-full w-full items-center justify-center overflow-auto bg-gray-50 p-4">
            <img
                src={file}
                alt={title}
                className="max-h-full max-w-full rounded object-contain shadow"
            />
        </div>
    );
}

export default function FilePreview({ file, title }: Props) {
    const kind = useMemo(() => getKind(file), [file]);

    return (
        <div className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-gray-100">
            {/* CONTENT (no internal header - title is shown by the tab itself) */}
            <div className="min-h-0 flex-1 overflow-hidden">
                {kind === 'pdf' && <PdfViewer file={file} title={title} />}
                {kind === 'image' && <ImageViewer file={file} title={title} />}
                {kind === 'excel' && <ExcelViewer fileUrl={file} />}
                {kind === 'html' && <HtmlViewer file={file} title={title} />}
                {kind === 'text' && <TextViewer file={file} />}
                {kind === 'unknown' && (
                    <div className="flex h-full w-full flex-col items-center justify-center gap-2 p-4 text-center text-sm text-muted-foreground">
                        <p>Format file tidak dapat ditampilkan.</p>
                        <a
                            href={file}
                            target="_blank"
                            rel="noreferrer"
                            className="text-blue-500 underline"
                        >
                            Download / buka di tab baru
                        </a>
                    </div>
                )}
            </div>
        </div>
    );
}
