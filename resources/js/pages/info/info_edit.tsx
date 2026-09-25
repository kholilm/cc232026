import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { CircleX, LoaderCircle, Save, UploadCloud } from 'lucide-react';
import { useState } from 'react';

import ExcelViewer from '@/components/ExcelViewer';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

export default function Edit() {
    const { info } = usePage().props as any;

    const [dragActive, setDragActive] = useState(false);

    const { data, setData, put, processing, errors } = useForm({
        title: info.title,
        description: info.description,
        type: info.type,
        file: null as File | null,
        remove_file: false,
    });

    const fileUrl = info.file ? `/storage/${info.file}` : null;
    console.log(info.file);

    const handleFile = (file: File) => {
        if (file.size > 5 * 1024 * 1024) {
            alert('File max 5MB');

            return;
        }

        setData('file', file);
    };

    const isExcel = (file?: string) => {
        if (!file) {
return false;
}

        const ext = file.split('.').pop()?.toLowerCase();

        return ['xls', 'xlsx', 'csv'].includes(ext ?? '');
    };

    return (
        <>
            <Head title="Edit Info" />

            <div className="mx-auto mt-10 w-full max-w-lg px-4">
                <Card>
                    <CardHeader>
                        <CardTitle>Edit Informasi</CardTitle>
                    </CardHeader>

                    <form
                        onSubmit={(e) => {
                            e.preventDefault();

                            put(`/info/${info.id}`, {
                                forceFormData: true,
                            });
                        }}
                    >
                        <CardContent className="space-y-4">
                            {/* TITLE */}
                            <div>
                                <Label>Judul</Label>
                                <Input
                                    value={data.title}
                                    onChange={(e) =>
                                        setData('title', e.target.value)
                                    }
                                />
                                {errors.title && (
                                    <p className="text-sm text-red-500">
                                        {errors.title}
                                    </p>
                                )}
                            </div>

                            {/* DESCRIPTION */}
                            <div>
                                <Label>Deskripsi</Label>
                                <textarea
                                    value={data.description}
                                    onChange={(e) =>
                                        setData('description', e.target.value)
                                    }
                                    className="w-full rounded border p-3"
                                />
                            </div>

                            {/* TYPE */}
                            <Select
                                value={data.type}
                                onValueChange={(value) =>
                                    setData('type', value)
                                }
                            >
                                <SelectTrigger className="w-full rounded-lg">
                                    <SelectValue placeholder="Pilih tipe" />
                                </SelectTrigger>

                                <SelectContent>
                                    <SelectItem value="info">Info</SelectItem>
                                    <SelectItem value="warning">
                                        Warning
                                    </SelectItem>
                                    <SelectItem value="sop">Sop</SelectItem>
                                </SelectContent>
                            </Select>

                            {/* EXCEL */}

                            {/* 🔥 FILE LAMA */}
                            {fileUrl && !data.remove_file && !data.file && (
                                <div className="rounded border p-2 text-sm">
                                    <p className="mb-1 font-semibold">
                                        File saat ini:
                                    </p>

                                    {/* EXCEL */}
                                    {isExcel(info.file) && (
                                        <div className="h-75 border">
                                            <ExcelViewer
                                                key={fileUrl}
                                                fileUrl={fileUrl}
                                            />
                                        </div>
                                    )}

                                    {/* IMAGE */}
                                    {info.file.match(
                                        /\.(jpg|jpeg|png|webp)$/i,
                                    ) && (
                                        <img
                                            src={fileUrl}
                                            className="max-h-40 rounded"
                                        />
                                    )}

                                    {/* PDF */}
                                    {info.file.match(/\.pdf$/i) && (
                                        <iframe
                                            src={fileUrl}
                                            className="h-40 w-full"
                                        />
                                    )}

                                    {/* OTHER */}
                                    {!info.file.match(
                                        /\.(jpg|jpeg|png|webp|pdf|xls|xlsx|csv)$/i,
                                    ) && (
                                        <a
                                            href={fileUrl}
                                            target="_blank"
                                            className="text-blue-500 underline"
                                        >
                                            Lihat File
                                        </a>
                                    )}

                                    <button
                                        type="button"
                                        onClick={() =>
                                            setData('remove_file', true)
                                        }
                                        className="mt-2 text-xs text-red-500"
                                    >
                                        Hapus File
                                    </button>
                                </div>
                            )}

                            {/* 🔥 UPLOAD BARU */}
                            <div
                                onDragOver={(e) => {
                                    e.preventDefault();
                                    setDragActive(true);
                                }}
                                onDragLeave={() => setDragActive(false)}
                                onDrop={(e) => {
                                    e.preventDefault();
                                    setDragActive(false);
                                    const file = e.dataTransfer.files[0];

                                    if (file) {
handleFile(file);
}
                                }}
                                onClick={() =>
                                    document
                                        .getElementById('fileInput')
                                        ?.click()
                                }
                                className={`cursor-pointer rounded-xl border-2 border-dashed p-6 text-center transition ${
                                    dragActive
                                        ? 'border-purple-500 bg-purple-100 dark:bg-purple-900/30'
                                        : 'border-gray-400 hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-800'
                                }`}
                            >
                                <UploadCloud className="mx-auto mb-2" />

                                <p>
                                    {data.file
                                        ? data.file.name
                                        : 'Upload file baru (optional)'}
                                </p>

                                <input
                                    id="fileInput"
                                    type="file"
                                    hidden
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];

                                        if (file) {
handleFile(file);
}
                                    }}
                                />
                            </div>

                            {/* 🔥 PREVIEW FILE BARU */}
                            {data.file && (
                                <div className="rounded border p-2 text-sm">
                                    <p className="mb-1 font-semibold">
                                        Preview File Baru:
                                    </p>

                                    {/* EXCEL */}
                                    {isExcel(data.file.name) && (
                                        <div className="h-75 border">
                                            <ExcelViewer
                                                fileUrl={URL.createObjectURL(
                                                    data.file,
                                                )}
                                            />
                                        </div>
                                    )}

                                    {/* IMAGE */}
                                    {data.file.type.startsWith('image/') && (
                                        <img
                                            src={URL.createObjectURL(data.file)}
                                            className="max-h-40 rounded"
                                        />
                                    )}

                                    {/* PDF */}
                                    {data.file.type === 'application/pdf' && (
                                        <iframe
                                            src={URL.createObjectURL(data.file)}
                                            className="h-40 w-full"
                                        />
                                    )}

                                    <button
                                        type="button"
                                        onClick={() => setData('file', null)}
                                        className="mt-2 text-xs text-red-500"
                                    >
                                        Hapus File Baru
                                    </button>
                                </div>
                            )}
                        </CardContent>

                        <CardFooter className="mt-5 flex items-center justify-between border-t pt-4">
                            <Link href="/info">
                                <Button
                                    variant="outline"
                                    className="flex items-center gap-2"
                                >
                                    <CircleX size={16} /> Kembali
                                </Button>
                            </Link>

                            <Button
                                disabled={processing}
                                className="flex items-center gap-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white"
                            >
                                {processing ? (
                                    <LoaderCircle
                                        className="animate-spin"
                                        size={16}
                                    />
                                ) : (
                                    <Save size={16} />
                                )}
                                Simpan
                            </Button>
                        </CardFooter>
                    </form>
                </Card>
            </div>
        </>
    );
}
