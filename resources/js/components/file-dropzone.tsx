import { useState } from 'react';

type Props = {
    onFileChange: (file: File | null) => void;
};

export default function FileDropzone({ onFileChange }: Props) {
    const [dragActive, setDragActive] = useState(false);
    const [fileName, setFileName] = useState<string | null>(null);
    const [preview, setPreview] = useState<string | null>(null);

    const handleFile = (file: File | null) => {
        if (!file) {
return;
}

        // validasi
        const allowed = [
            'image/png',
            'image/jpeg',
            'application/pdf',
            'application/vnd.ms-excel', // .xls
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
        ];

        if (!allowed.includes(file.type)) {
            alert('Hanya PDF / JPG / PNG');

            return;
        }

        setFileName(file.name);
        onFileChange(file);

        // preview image
        if (file.type.startsWith('image')) {
            setPreview(URL.createObjectURL(file));
        } else {
            setPreview(null);
        }
    };

    return (
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
                handleFile(e.dataTransfer.files[0]);
            }}
            className={`cursor-pointer rounded-xl border-2 border-dashed p-6 text-center transition ${
                dragActive
                    ? 'scale-105 border-purple-500 bg-purple-500/20'
                    : 'border-gray-400 hover:bg-gray-100 dark:border-white/30 dark:hover:bg-white/10'
            }`}
        >
            <p className="font-semibold text-gray-700 dark:text-white">
                {fileName ? `📄 ${fileName}` : 'Drag & Drop / Klik Upload'}
            </p>

            {/* PREVIEW */}
            {preview && (
                <img
                    src={preview}
                    className="mx-auto mt-3 h-24 rounded object-cover"
                />
            )}

            {fileName && fileName.endsWith('.pdf') && (
                <p className="mt-2 text-sm text-blue-500">
                    📄 PDF siap diupload
                </p>
            )}

            <input
                id="fileInput"
                type="file"
                hidden
                accept=".pdf,image/png,image/jpeg"
                onChange={(e) => handleFile(e.target.files?.[0] || null)}
            />
        </div>
    );
}
