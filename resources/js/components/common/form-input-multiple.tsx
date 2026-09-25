'use client';

import InputError from '@/components/input-error';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

type Props = {
    label?: string;
    placeholder?: string;
    type?: string;

    value: string;
    onChange: (value: string) => void;

    error?: string;
    className?: string;
};

export default function FormInputMultiple({
    label,
    placeholder,
    type = 'text',
    value,
    onChange,
    error,
    className,
}: Props) {
    return (
        <div className={className}>
            <Label className="text-sm font-medium">{label}</Label>

            <Input
                type={type}
                placeholder={placeholder ?? label}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className={cn(error && 'border-red-500')}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        document.querySelector('form')?.requestSubmit();
                    }
                }}
            />

            <InputError message={error} className="mt-1" />
        </div>
    );
}
