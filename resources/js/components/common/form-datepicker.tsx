'use client';

import { CalendarIcon } from 'lucide-react';
import * as React from 'react';

import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Label } from '@/components/ui/label';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

type Props = {
    name: string;
    label: string;
    placeholder?: string;
    className?: string;
    defaultValue?: string; // yyyy-mm-dd
    disabled?: boolean;
    showClearButton?: boolean;
    errors?: Record<string, string>;

    /** optional controlled callback */
    onChange?: (value: string) => void;
};

/* ================= utils ================= */

function formatDateIndo(date: Date) {
    return new Intl.DateTimeFormat('id-ID', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
    }).format(date);
}

function formatDateLocal(date: Date) {
    const d = String(date.getDate()).padStart(2, '0');
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const y = date.getFullYear();

    return `${y}-${m}-${d}`;
}

/* ================= component ================= */

export default function FormDatePicker({
    name,
    label,
    placeholder,
    className,
    defaultValue,
    disabled = false,
    showClearButton = true,
    errors = {},
    onChange,
}: Props) {
    const [open, setOpen] = React.useState(false);
    const [value, setValue] = React.useState(defaultValue ?? '');

    const date = value ? new Date(value) : undefined;
    const fieldId = `datepicker-${name}`;

    const handleSelect = (selected?: Date) => {
        if (!selected) {
return;
}

        const formatted = formatDateLocal(selected);
        setValue(formatted);
        onChange?.(formatted);
        setOpen(false);
    };

    const handleClear = () => {
        setValue('');
        onChange?.('');
        setOpen(false);
    };

    return (
        <div className="space-y-1">
            <Label htmlFor={fieldId}>{label}</Label>
            <input type="hidden" name={name} value={value} />
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        id={fieldId}
                        type="button"
                        variant="outline"
                        disabled={disabled}
                        aria-haspopup="dialog"
                        className={cn(
                            'w-full justify-between font-normal',
                            !date && 'text-muted-foreground',
                            errors[name] && 'border-red-500',
                            className,
                        )}
                    >
                        {date ? formatDateIndo(date) : (placeholder ?? label)}
                        <CalendarIcon className="h-4 w-4 opacity-50" />
                    </Button>
                </PopoverTrigger>

                <PopoverContent
                    className="w-auto overflow-hidden p-0"
                    align="start"
                >
                    <div className="flex flex-col gap-1 p-2">
                        <Calendar
                            mode="single"
                            selected={date}
                            captionLayout="dropdown"
                            onSelect={handleSelect}
                        />

                        {date && showClearButton && (
                            <Button
                                type="button"
                                variant="ghost"
                                className="w-full justify-center text-red-600 hover:bg-red-50"
                                onClick={handleClear}
                            >
                                Clear Tanggal
                            </Button>
                        )}
                    </div>
                </PopoverContent>
            </Popover>

            <InputError
                message={errors[name]}
                className="text-sm text-destructive"
            />
        </div>
    );
}
