'use client';

import { FileImage } from 'lucide-react';
import { cn, getImageData } from '@/lib/utils';
import type { Preview } from '@/types/custom';
import InputError from '../input-error';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Input } from '../ui/input';
import { Label } from '../ui/label';

// Field yang digunakan untuk form image harus berupa string | File | null
export type ImageFieldValue = string | File | null;

// Constraint untuk memastikan bahwa T punya key id dengan tipe image
type ImageForm<T> = {
    [K in keyof T]: T[K];
};

type Props<T extends ImageForm<T>> = {
    label: string;
    id: keyof T & string;
    data: T;
    setData: (key: keyof T & string, value: T[keyof T]) => void;
    errors?: Partial<Record<keyof T & string, string>>;
    processing?: boolean;
    preview?: Preview;
    setPreview?: (preview: Preview) => void;
    className?: string;
    tabIndex?: number;
};

export default function FormImage<T extends ImageForm<T>>({
    label,
    id,
    data,
    setData,
    errors = {},
    processing = false,
    preview,
    setPreview,
    className,
    tabIndex,
}: Props<T>) {
    const inputId = `file-input-${id}`;

    return (
        <div className={className}>
            <Label htmlFor={inputId}>{label}</Label>
            <div className="flex items-center gap-2">
                <Avatar className="h-9 w-9 rounded-lg">
                    <AvatarImage
                        src={preview?.displayUrl ?? ''}
                        alt="preview"
                        className="object-cover"
                    />
                    <AvatarFallback className="rounded-lg">
                        <FileImage className="h-4 w-4" />
                    </AvatarFallback>
                </Avatar>

                <Input
                    id={inputId}
                    type="file"
                    accept="image/*"
                    disabled={processing}
                    tabIndex={tabIndex}
                    className={cn(
                        'w-full justify-between font-normal',
                        !data[id] && 'text-muted-foreground',
                        errors[id] && 'border-red-500',
                        className,
                    )}
                    onChange={(event) => {
                        const { file, displayUrl } = getImageData(event);

                        if (file) {
                            setData(id, file as T[keyof T]);
                            setPreview?.({ file, displayUrl });
                        }
                    }}
                />
            </div>

            <InputError
                message={errors[id]}
                className="text-sm text-destructive"
            />
        </div>
    );
}
