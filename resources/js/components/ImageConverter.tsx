import { ImageIcon } from 'lucide-react';
import { useState } from 'react';

export default function ImageConverter() {
    const [preview, setPreview] = useState<string | null>(null);
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [dragActive, setDragActive] = useState<boolean>(false);

    const handleFile = (selected: File | null) => {
        if (!selected || !selected.name.toLowerCase().endsWith('.heic')) {
            alert('File harus HEIC');

            return;
        }

        setFile(selected);
    };

    const convertImage = async () => {
        if (!file) {
return;
}

        setLoading(true);

        try {
            const heic2any = (await import('heic2any')).default;
            const result = await heic2any({
                blob: file,
                toType: 'image/jpeg',
                quality: 0.9,
            });
            const jpgBlob = Array.isArray(result) ? result[0] : result;
            const url = URL.createObjectURL(jpgBlob);
            setPreview(url);
            const a = document.createElement('a');
            a.href = url;
            a.download = file.name.replace(/\.heic$/i, '.jpg');
            a.click();
        } catch (e) {
            alert('Gagal convert');
            console.error(e);
        }

        setLoading(false);
    };

    return (
        <div className="rounded-2xl border border-white/20 bg-white/10 p-5 text-white shadow-xl backdrop-blur-md">
            <h3 className="mb-3 flex items-center gap-3 text-xl font-bold">
                <div className="rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 p-2">
                    <ImageIcon className="h-5 w-5 text-white" />
                </div>
                <span className="font-semibold text-blue-600 dark:text-cyan-400">
                    HEIC → JPG Converter
                </span>
            </h3>

            <div
                onClick={() => document.getElementById('fileInput')?.click()}
                onDragOver={(e) => {
                    e.preventDefault();
                    setDragActive(true);
                }}
                onDragLeave={() => setDragActive(false)}
                onDrop={(e) => {
                    e.preventDefault();
                    setDragActive(false);
                    const droppedFile = e.dataTransfer.files[0];
                    handleFile(droppedFile);
                }}
                className={`cursor-pointer rounded-xl border-2 border-dashed p-6 text-center transition ${
                    dragActive
                        ? 'scale-105 border-purple-500 bg-purple-500/20'
                        : 'border-gray-400 hover:bg-gray-100 dark:border-white/30 dark:hover:bg-white/10'
                }`}
            >
                <p
                    className={`truncate font-semibold ${
                        file
                            ? 'text-green-600 dark:text-green-400'
                            : 'text-gray-800 dark:text-white'
                    }`}
                >
                    {file ? `📄 ${file.name}` : 'Drag & Drop / Klik file HEIC'}
                </p>

                <input
                    id="fileInput"
                    type="file"
                    accept=".heic"
                    hidden
                    onChange={(e) => handleFile(e.target.files?.[0] || null)}
                />
            </div>

            <button
                onClick={convertImage}
                disabled={!file || loading}
                className="mt-4 w-full rounded-lg bg-linear-to-r from-blue-500 to-cyan-500 py-2 disabled:opacity-50"
            >
                {loading ? 'Converting...' : 'Convert & Download'}
            </button>

            {preview && (
                <img
                    src={preview}
                    className="mt-4 rounded-lg shadow-lg"
                    alt="preview"
                />
            )}
        </div>
    );
}
