import { Head, Link, usePage } from '@inertiajs/react';
import { Download, FileText } from 'lucide-react';
import { useState } from 'react';
import Carousel from '@/components/carousel';
import FileViewerModal from '@/components/FileViewerModal';
import ImageConverter from '@/components/ImageConverter';
import Sidebar from '@/components/Sidebar';
import TextConverter from '@/components/TextConverter';
import { Badge } from '@/components/ui/badge';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogTitle,
} from '@/components/ui/dialog';

export default function Dashboard() {
    const [selectedInfo, setSelectedInfo] = useState<any>(null);
    const [previewItem, setPreviewItem] = useState<any>(null);
    const [activeUrl, setActiveUrl] = useState<string | null>(null);
    const { infos } = usePage().props as any;

    const handleSelect = (url: string, _name: string) => {
        setActiveUrl(url);
    };

    const formatDateTime = (date: string) => {
        if (!date) {
return '-';
}

        const d = new Date(date);

        return d.toLocaleString('id-ID', {
            day: '2-digit',
            month: 'long',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const timeAgo = (date: string) => {
        const now = new Date();
        const past = new Date(date);
        const diff = Math.floor((now.getTime() - past.getTime()) / 1000);

        if (diff < 60) {
return 'Baru saja';
}

        if (diff < 3600) {
return `${Math.floor(diff / 60)} menit lalu`;
}

        if (diff < 86400) {
return `${Math.floor(diff / 3600)} jam lalu`;
}

        if (diff < 172800) {
return 'Kemarin';
}

        return past.toLocaleDateString('id-ID', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
        });
    };

    const getTypeStyle = (type: string) => {
        switch (type) {
            case 'warning':
                return {
                    badge: 'bg-yellow-500 hover:bg-yellow-600',
                    card: 'from-yellow-100 to-yellow-50 border-yellow-300 dark:from-yellow-950/40 dark:to-yellow-900/20 dark:border-yellow-700/40',
                    ring: 'ring-yellow-400/40',
                };
            case 'sop':
                return {
                    badge: 'bg-purple-500 hover:bg-purple-600',
                    card: 'from-purple-100 to-purple-50 border-purple-300 dark:from-purple-950/40 dark:to-purple-900/20 dark:border-purple-700/40',
                    ring: 'ring-purple-400/40',
                };
            default:
                return {
                    badge: 'bg-blue-500 hover:bg-blue-600',
                    card: 'from-blue-100 to-blue-50 border-blue-300 dark:from-blue-950/40 dark:to-blue-900/20 dark:border-blue-700/40',
                    ring: 'ring-blue-400/40',
                };
        }
    };

    return (
        <>
            <Head title="Dashboard" />
            <div className="space-y-6 p-6">
                <h3 className="mb-3 bg-linear-to-r from-slate-600 via-cyan-600 bg-clip-text text-xl font-bold text-transparent dark:from-blue-400 dark:via-purple-400 dark:to-pink-400 dark:drop-shadow-[0_0_10px_rgba(168,85,247,0.7)]">
                    Apps
                </h3>
                {/* link Apps di menu.ts */}
                <Sidebar onSelect={handleSelect} activeUrl={activeUrl} />

                <div className="mt-6">
                    <div className="mb-4 flex items-center justify-between">
                        <h2 className="text-xl font-bold text-slate-800 dark:text-white">
                            📢 Informasi Terbaru
                        </h2>
                        <Link
                            href="/info"
                            className="text-sm text-blue-500 hover:underline"
                        >
                            Lihat Semua →
                        </Link>
                    </div>
                    <div className="grid gap-4 md:grid-cols-3">
                        {infos.map((item: any) => {
                            const style = getTypeStyle(item.type);

                            return (
                                <div
                                    key={item.id}
                                    onClick={() => setSelectedInfo(item)}
                                    className={`relative cursor-pointer overflow-hidden rounded-xl border bg-gradient-to-br p-4 shadow-md ${style.card} ${style.ring} ring-1 transition-all duration-300 hover:scale-[1.03] hover:shadow-xl`}
                                >
                                    <span
                                        className={`absolute top-3 right-3 rounded-full px-3 py-1 text-[10px] font-semibold text-white shadow ${style.badge}`}
                                    >
                                        {item.type}
                                    </span>
                                    <div className="absolute -top-6 -right-6 h-20 w-20 rounded-full bg-white/40 blur-2xl"></div>
                                    <div className="flex items-start justify-between pr-16">
                                        <div>
                                            <h3 className="font-semibold text-gray-800 dark:text-gray-100">
                                                {item.title}
                                            </h3>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                                {timeAgo(item.created_at)}
                                            </p>
                                        </div>
                                    </div>
                                    <p className="mt-3 line-clamp-3 text-sm text-gray-700 dark:text-gray-300">
                                        {item.description}
                                    </p>
                                    {item.file && (
                                        <div className="mt-3 flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400">
                                            <FileText className="h-3 w-3" />
                                            <span>Ada lampiran</span>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Detail Modal (Info-style) */}
                <Dialog
                    open={!!selectedInfo}
                    onOpenChange={(open) => !open && setSelectedInfo(null)}
                >
                    <DialogContent className="!w-[600px] !max-w-[600px]">
                        <div className="flex flex-col gap-4">
                            <div className="flex flex-col gap-2 border-b pb-4">
                                <div className="flex items-start justify-between gap-3">
                                    <DialogTitle className="text-lg leading-snug font-bold text-gray-900 dark:text-white">
                                        {selectedInfo?.title ??
                                            'Detail Informasi'}
                                    </DialogTitle>
                                    {selectedInfo?.type && (
                                        <Badge
                                            className={
                                                getTypeStyle(selectedInfo.type)
                                                    .badge
                                            }
                                        >
                                            {selectedInfo.type}
                                        </Badge>
                                    )}
                                </div>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    Dibuat:{' '}
                                    {formatDateTime(selectedInfo?.created_at)}
                                </p>
                            </div>

                            <DialogDescription className="sr-only">
                                Detail informasi
                            </DialogDescription>

                            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm leading-relaxed whitespace-pre-line text-gray-700 dark:border-gray-700 dark:bg-gray-800/50 dark:text-gray-200">
                                {selectedInfo?.description ?? '-'}
                            </div>

                            {selectedInfo?.file && (
                                <div className="flex flex-col gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-800/50 dark:bg-blue-950/30">
                                    <div className="flex items-center gap-2 text-sm font-medium text-blue-700 dark:text-blue-300">
                                        <FileText className="h-4 w-4" />
                                        Lampiran
                                    </div>
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="truncate text-xs text-blue-600 dark:text-blue-400">
                                            {selectedInfo.file.split('/').pop()}
                                        </span>
                                        <div className="flex shrink-0 gap-2">
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setPreviewItem(selectedInfo)
                                                }
                                                className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition-colors hover:bg-blue-700"
                                            >
                                                Lihat File
                                            </button>
                                            <a
                                                href={`/storage/${selectedInfo.file}`}
                                                download
                                                className="inline-flex items-center gap-1 rounded-md border border-blue-300 bg-white px-3 py-1.5 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-50 dark:border-blue-700 dark:bg-transparent dark:text-blue-300 dark:hover:bg-blue-950/50"
                                            >
                                                <Download className="h-3 w-3" />
                                                Download
                                            </a>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="mt-2 flex justify-end">
                                <button
                                    type="button"
                                    onClick={() => setSelectedInfo(null)}
                                    className="rounded-md bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
                                >
                                    Tutup
                                </button>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>

                {/* File Viewer Modal (PDF / Image / Excel) */}
                <FileViewerModal
                    isOpen={!!previewItem}
                    item={previewItem}
                    onClose={() => setPreviewItem(null)}
                />

                {/* TOOLS SECTION */}
                <div className="mt-9 grid gap-6 md:grid-cols-2">
                    <TextConverter />
                    <ImageConverter />
                </div>

                {/* Carousel */}
                <div className="mt-8">
                    <Carousel />
                </div>
            </div>
        </>
    );
}
