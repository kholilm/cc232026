'use client';

import React from 'react';
import InputError from '@/components/input-error';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

type Props = {
    label?: string;
    placeholder?: string;

    value: string | number;
    onChange: (value: string | number) => void;

    error?: string;
    className?: string;
};

export default function FormNumberMultiple({
    label,
    placeholder,
    value,
    onChange,
    error,
    className,
}: Props) {
    const display = formatNumber(value);

    // Handle input change (only digits allowed)
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const raw = e.target.value.replace(/\D/g, ''); // remove non-digits
        const numericValue = raw === '' ? '' : parseInt(raw, 10);
        onChange(numericValue);
    };

    return (
        <div className={className}>
            <Label className="text-sm font-medium">{label}</Label>

            <Input
                type="text"
                inputMode="numeric"
                placeholder={placeholder ?? label}
                value={display}
                onChange={handleChange}
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

// --------------------------------------------------
// Format Rupiah friendly number: 12000 → "12.000"
// --------------------------------------------------
function formatNumber(value: string | number) {
    if (value === '' || value === null || value === undefined) {
return '';
}

    const num =
        typeof value === 'number'
            ? value
            : parseInt(String(value).replace(/\D/g, ''), 10);

    if (isNaN(num)) {
return '';
}

    return new Intl.NumberFormat('id-ID').format(num);
}
