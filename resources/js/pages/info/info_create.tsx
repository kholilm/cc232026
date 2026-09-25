import { Head, Link } from '@inertiajs/react';
import { useForm } from '@inertiajs/react';
import { CircleX, LoaderCircle, Save, UploadCloud } from 'lucide-react';
import {  useState } from 'react';
import type {ChangeEvent} from 'react';

import InfoController from '@/actions/App/Http/Controllers/InfoController';
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

type HtmlResourceFile = File & {
    webkitRelativePath?: string;
};

export default function InfoCreate() {
    const [dragActive, setDragActive] = useState(false);
    const [isHtmlFile, setIsHtmlFile] = useState(false);
    const [htmlResources, setHtmlResources] = useState<HtmlResourceFile[]>([]);
    const [resourceUploadProgress, setResourceUploadProgress] = useState<
        string | null
    >(null);

    const { data, setData, post, processing, errors, reset } = useForm({
        title: '',
        description: '',
        type: 'info',
        file: null as File | null,
        html_files: [] as File[],
        html_file_paths: [] as string[],
    });

    const clearHtmlResources = () => {
        setHtmlResources([]);
        setData('html_files', []);
        setData('html_file_paths', []);
        setResourceUploadProgress(null);
    };

    const handleFile = (file: File) => {
        if (file.size > 50 * 1024 * 1024) {
            alert('File terlalu besar (maksimal 5 MB)');

            return;
        }

        const ext = file.name.split('.').pop()?.toLowerCase();

        const html = ext === 'html' || ext === 'htm';

        setIsHtmlFile(html);
        clearHtmlResources();
        setData('file', file);
    };

    const handleHtmlFolder = (e: ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files) {
return;
}

        const files = Array.from(e.target.files) as HtmlResourceFile[];
        const paths = files.map((file) => file.webkitRelativePath || file.name);

        setHtmlResources(files);
        setData('html_files', files);
        setData('html_file_paths', paths);

        e.target.value = '';
    };

    const getCsrfToken = () =>
        document
            .querySelector<HTMLMetaElement>('meta[name="csrf-token"]')
            ?.getAttribute('content') ?? '';

    const getCookie = (name: string) => {
        const value = document.cookie
            .split('; ')
            .find((row) => row.startsWith(`${name}=`))
            ?.split('=')[1];

        return value ? decodeURIComponent(value) : '';
    };

    const appendCsrfToken = (formData: FormData) => {
        const token = getCsrfToken();

        if (token) {
            formData.append('_token', token);
        }
    };

    const csrfHeaders = () => {
        const token = getCsrfToken();
        const xsrfToken = getCookie('XSRF-TOKEN');

        return {
            Accept: 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            ...(token ? { 'X-CSRF-TOKEN': token } : {}),
            ...(xsrfToken ? { 'X-XSRF-TOKEN': xsrfToken } : {}),
        };
    };

    const assertUploadSucceeded = async (
        response: Response,
        fallbackMessage: string,
    ) => {
        if (response.ok) {
return;
}

        const body = await response.text();
        const message = body.trim() || fallbackMessage;

        throw new Error(
            response.status === 419
                ? `${fallbackMessage} Sesi/CSRF tidak valid. Muat ulang halaman lalu coba lagi.`
                : message,
        );
    };

    const uploadHtmlResources = async (infoId: number) => {
        const chunkSize = 10;

        for (let start = 0; start < htmlResources.length; start += chunkSize) {
            const chunk = htmlResources.slice(start, start + chunkSize);
            const formData = new FormData();

            chunk.forEach((file) => {
                formData.append('html_files[]', file, file.name);
                formData.append(
                    'html_file_paths[]',
                    file.webkitRelativePath || file.name,
                );
            });

            appendCsrfToken(formData);

            setResourceUploadProgress(
                `Mengupload file resource ${Math.min(
                    start + chunk.length,
                    htmlResources.length,
                )}/${htmlResources.length}`,
            );

            const response = await fetch(`/info/${infoId}/html-resources`, {
                method: 'POST',
                headers: csrfHeaders(),
                credentials: 'include',
                body: formData,
            });

            await assertUploadSucceeded(
                response,
                'Gagal mengupload resource HTML.',
            );
        }
    };

    const submitWithChunkedResources = async () => {
        if (!data.file) {
            post('/info', { forceFormData: true });

            return;
        }

        const formData = new FormData();
        formData.append('title', data.title);
        formData.append('description', data.description ?? '');
        formData.append('type', data.type);
        formData.append('file', data.file, data.file.name);
        appendCsrfToken(formData);

        setResourceUploadProgress('Menyimpan file utama HTML...');

        const response = await fetch('/info', {
            method: 'POST',
            headers: csrfHeaders(),
            credentials: 'include',
            body: formData,
        });

        await assertUploadSucceeded(
            response,
            'Gagal menyimpan file utama HTML.',
        );

        const result = (await response.json()) as { info: { id: number } };

        await uploadHtmlResources(result.info.id);

        window.location.href = '/info';
    };

    return (
        <>
            <Head title="Tambah Info" />

            <div className="mx-auto mt-10 w-full max-w-lg px-4">
                <Card>
                    <CardHeader>
                        <CardTitle>Tambah Informasi</CardTitle>
                    </CardHeader>

                    <form
                        onSubmit={(e) => {
                            e.preventDefault();

                            if (isHtmlFile && htmlResources.length > 0) {
                                submitWithChunkedResources().catch((error) => {
                                    console.error(error);
                                    setResourceUploadProgress(null);
                                    alert(
                                        error instanceof Error
                                            ? error.message
                                            : 'Upload resource HTML gagal.',
                                    );
                                });

                                return;
                            }

                            post('/info', {
                                forceFormData: true,

                                onSuccess: () => {
                                    reset();

                                    setIsHtmlFile(false);
                                    clearHtmlResources();
                                },
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

                            {/* 🔥 DRAG DROP */}

                            {isHtmlFile && (
                                <div className="rounded-lg border border-amber-300 bg-amber-50 p-4">
                                    <p className="font-semibold text-amber-700">
                                        HTML Resource Folder
                                    </p>

                                    <p className="mb-3 text-sm text-gray-600">
                                        Pilih folder
                                        <strong> _files </strong>
                                        yang dibuat bersamaan dengan file HTML.
                                    </p>

                                    <input
                                        type="file"
                                        multiple
                                        {...{ webkitdirectory: 'true' }}
                                        className="disabled:cursor-not-allowed disabled:opacity-50 dark:text-gray-100 dark:file:border-gray-300 dark:file:bg-gray-100 dark:file:text-gray-950 dark:hover:file:bg-white dark:focus-visible:outline dark:focus-visible:outline-2 dark:focus-visible:outline-offset-2 dark:focus-visible:outline-amber-400"
                                        onChange={handleHtmlFolder}
                                    />

                                    {htmlResources.length > 0 && (
                                        <>
                                            <p className="mt-2 text-sm text-green-600">
                                                ✓ {htmlResources.length} file
                                                dipilih
                                            </p>
                                            <ul className="mt-2 max-h-32 space-y-1 overflow-auto rounded border bg-white p-2 text-xs text-gray-600">
                                                {htmlResources.map((file) => (
                                                    <li
                                                        key={
                                                            file.webkitRelativePath ||
                                                            file.name
                                                        }
                                                    >
                                                        {file.webkitRelativePath ||
                                                            file.name}
                                                    </li>
                                                ))}
                                            </ul>
                                        </>
                                    )}

                                    {resourceUploadProgress && (
                                        <p className="mt-2 text-sm text-blue-600">
                                            {resourceUploadProgress}
                                        </p>
                                    )}
                                </div>
                            )}

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

                                <p className="text-sm">
                                    {data.file
                                        ? data.file.name
                                        : 'Drag & Drop / Klik Upload'}
                                </p>

                                <input
                                    id="fileInput"
                                    type="file"
                                    hidden
                                    accept="
                                            .pdf,
                                            .jpg,
                                            .jpeg,
                                            .png,
                                            .webp,
                                            .xls,
                                            .xlsx,
                                            .csv,
                                            .html,
                                            .htm,
                                            .txt
                                            "
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];

                                        if (file) {
handleFile(file);
}
                                    }}
                                />
                            </div>

                            {/* 🔥 PREVIEW FILE */}
                            {data.file && (
                                <div className="rounded border p-2 text-sm">
                                    <p className="mb-1 font-semibold">
                                        Preview:
                                    </p>

                                    {data.file.type.startsWith('image/') && (
                                        <img
                                            src={URL.createObjectURL(data.file)}
                                            className="max-h-40 rounded"
                                        />
                                    )}

                                    {data.file.type === 'application/pdf' && (
                                        <iframe
                                            src={URL.createObjectURL(data.file)}
                                            className="h-40 w-full"
                                        />
                                    )}

                                    {!data.file.type.includes('image') &&
                                        data.file.type !==
                                            'application/pdf' && (
                                            <p>{data.file.name}</p>
                                        )}

                                    {/* REMOVE FILE */}
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setData('file', null);

                                            setIsHtmlFile(false);

                                            clearHtmlResources();
                                        }}
                                        className="mt-2 text-xs text-red-500"
                                    >
                                        Hapus File
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
                                disabled={
                                    processing ||
                                    resourceUploadProgress !== null
                                }
                                className="flex items-center gap-2 bg-linear-to-r from-purple-500 to-pink-500 text-white"
                            >
                                {processing || resourceUploadProgress ? (
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

InfoCreate.layout = {
    breadcrumbs: [
        { title: 'Info', href: InfoController.index() },
        { title: 'Create', href: '#' },
    ],
};
