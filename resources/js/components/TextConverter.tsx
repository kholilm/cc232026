import {
    ArrowDown,
    ArrowUp,
    Copy,
    Trash,
    Type,
    CaseSensitive,
} from 'lucide-react';
import { useState } from 'react';

async function copyText(value: string) {
    if (!value) {
return;
}

    if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(value);

        return;
    }

    const textarea = document.createElement('textarea');
    textarea.value = value;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';

    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
}

const toUpper = (text: string) => text.toUpperCase();

const toLower = (text: string) => text.toLowerCase();

const toCapitalCase = (text: string) =>
    text
        .toLowerCase()
        .split(/\s+/)
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');

const toSentenceCase = (text: string) =>
    text
        .toLowerCase()
        .replace(/(^\s*\w|[.!?]\s+\w)/g, (char) => char.toUpperCase());

export default function TextConverter() {
    const [text, setText] = useState('');

    const handleTransform = (transform: (text: string) => string) => {
        const result = transform(text);
        setText(result);
        copyText(result);
    };

    return (
        <div className="rounded-2xl border border-white/20 bg-white/10 p-5 text-white shadow-xl backdrop-blur-md">
            <h3 className="mb-4 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-xl font-bold text-transparent dark:from-blue-400 dark:via-purple-400 dark:to-pink-400">
                ✨ Text Converter
            </h3>

            <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Tulis teks di sini..."
                className="h-32 w-full rounded-lg border border-gray-300 bg-white/80 p-3 text-black outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900/80 dark:text-white"
            />

            <div className="mt-4 flex flex-wrap gap-2">
                <button
                    onClick={() => handleTransform(toUpper)}
                    className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-violet-600 to-purple-500 px-4 py-2 text-white shadow transition hover:scale-105"
                >
                    <ArrowUp size={16} />
                    UPPER
                </button>

                <button
                    onClick={() => handleTransform(toLower)}
                    className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-violet-600 to-purple-500 px-4 py-2 text-white shadow transition hover:scale-105"
                >
                    <ArrowDown size={16} />
                    lower
                </button>

                <button
                    onClick={() => handleTransform(toCapitalCase)}
                    className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-indigo-600 to-violet-500 px-4 py-2 text-white shadow transition hover:scale-105"
                >
                    <Type size={16} />
                    Capital Case
                </button>

                <button
                    onClick={() => handleTransform(toSentenceCase)}
                    className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-sky-600 to-cyan-500 px-4 py-2 text-white shadow transition hover:scale-105"
                >
                    <CaseSensitive size={16} />
                    Sentence case
                </button>

                <button
                    onClick={() => copyText(text)}
                    className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-green-500 to-emerald-400 px-4 py-2 text-white shadow transition hover:scale-105"
                >
                    <Copy size={16} />
                    Copy
                </button>

                <button
                    onClick={() => setText('')}
                    className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-rose-500 to-pink-500 px-4 py-2 text-white shadow transition hover:scale-105"
                >
                    <Trash size={16} />
                    Clear
                </button>
            </div>
        </div>
    );
}
