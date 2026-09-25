import { useState } from 'react';
import InputError from '@/components/input-error';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

type Props = {
    name: string;
    label: string;
    placeholder?: string;
    errors?: Record<string, string>;
    className?: string;
    value?: number;
    defaultValue?: number | string | null;
    readOnly?: boolean;
    onValueChange?: (value: number) => void;
};

export default function FormNumber({
    name,
    label,
    placeholder,
    errors = {},
    className,
    value,
    defaultValue,
    readOnly = false,
    onValueChange,
}: Props) {
    const [internal, setInternal] = useState(
        defaultValue !== null && defaultValue !== undefined
            ? String(defaultValue)
            : '',
    );
    const rawValue = value !== undefined ? String(value) : internal;

    return (
        <div className="py-1">
            <Label>{label}</Label>
            <input type="hidden" name={name} value={rawValue || 0} />
            <Input
                type="text"
                inputMode="numeric"
                value={formatNumber(rawValue)}
                readOnly={readOnly}
                placeholder={placeholder ?? label}
                onChange={(e) => {
                    const raw = e.target.value.replace(/\D/g, '');

                    if (value === undefined) {
                        setInternal(raw);
                    }

                    onValueChange?.(Number(raw || 0));
                }}
                className={cn(
                    'w-full font-normal',
                    errors[name] && 'border-red-500',
                    className,
                )}
            />

            <InputError
                message={errors[name]}
                className="text-sm text-destructive"
            />
        </div>
    );
}

function formatNumber(value: string) {
    if (!value) {
return '';
}

    const number = Number(value);

    if (isNaN(number)) {
return '';
}

    return new Intl.NumberFormat('id-ID').format(number);
}
