'use client';

import { Check, ChevronsUpDown } from 'lucide-react';
import * as React from 'react';

import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from '@/components/ui/command';
import { Label } from '@/components/ui/label';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

type ComboboxItem = {
    value: string;
    label: string;
    disabled?: boolean;
};

type Props = {
    name: string;
    label: string;
    selectItem: ComboboxItem[];
    errors?: Record<string, string>;
    className?: string;
    tabIndex?: number;
    placeholder?: string;
    defaultValue?: string | number | null;
    disabled?: boolean;
    onSearchChange?: (search: string) => void;
};

export default function FormCombobox({
    name,
    label,
    selectItem,
    errors = {},
    className,
    tabIndex,
    placeholder,
    defaultValue,
    disabled = false,
    onSearchChange,
}: Props) {
    const [open, setOpen] = React.useState(false);
    const [value, setValue] = React.useState<string>('');

    React.useEffect(() => {
        if (defaultValue !== undefined && defaultValue !== null) {
            setValue(String(defaultValue));
        }
    }, [defaultValue]);

    const selectedItem = selectItem.find((item) => item.value === value);

    return (
        <div className="py-1">
            <Label htmlFor={`combobox-${name}`}>{label}</Label>

            <input type="hidden" name={name} value={value} />
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={open}
                        id={`combobox-${name}`}
                        disabled={disabled}
                        tabIndex={tabIndex}
                        className={cn(
                            'w-full justify-between font-normal',
                            !value && 'text-muted-foreground',
                            errors[name] && 'border-red-500',
                            className,
                        )}
                    >
                        {selectedItem?.label ?? placeholder ?? `Pilih ${label}`}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                </PopoverTrigger>

                <PopoverContent className="w-full p-0">
                    <Command>
                        <CommandInput
                            placeholder={`Cari ${label}...`}
                            onValueChange={(val) => onSearchChange?.(val)}
                        />
                        <CommandList>
                            <CommandEmpty>Tidak ada data</CommandEmpty>

                            <CommandGroup>
                                <CommandItem
                                    className="justify-center text-muted-foreground"
                                    onSelect={() => {
                                        setValue('');
                                        setOpen(false);
                                    }}
                                >
                                    Pilih {label}
                                </CommandItem>

                                {selectItem.map((item) => (
                                    <CommandItem
                                        key={item.value}
                                        value={item.label}
                                        disabled={item.disabled}
                                        onSelect={() => {
                                            setValue(item.value);
                                            setOpen(false);
                                        }}
                                    >
                                        {item.label}
                                        <Check
                                            className={cn(
                                                'ml-auto h-4 w-4',
                                                item.value === value
                                                    ? 'opacity-100'
                                                    : 'opacity-0',
                                            )}
                                        />
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>

            <InputError
                message={errors[name]}
                className="text-sm text-destructive"
            />
        </div>
    );
}
