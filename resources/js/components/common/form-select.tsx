import InputError from '@/components/input-error';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

type SelectOption = {
    value: string;
    label: string;
    disabled?: boolean;
};

type Props = {
    name: string;
    label: string;
    selectItem: SelectOption[];
    defaultValue?: string | number | null;
    placeholder?: string;
    errors?: Record<string, string>;
    className?: string;
};

export default function FormSelect({
    name,
    label,
    selectItem,
    defaultValue,
    placeholder,
    errors = {},
    className,
}: Props) {
    return (
        <div className="py-1">
            <Label htmlFor={name}>{label}</Label>

            <Select
                name={name}
                defaultValue={
                    defaultValue !== undefined && defaultValue !== null
                        ? String(defaultValue)
                        : undefined
                }
            >
                <SelectTrigger
                    id={name}
                    className={cn(
                        'w-full justify-between font-normal',
                        errors[name] && 'border-red-500',
                        className,
                    )}
                >
                    <SelectValue
                        placeholder={placeholder ?? `Pilih ${label}`}
                    />
                </SelectTrigger>

                <SelectContent>
                    {selectItem.map((item) => (
                        <SelectItem
                            key={item.value}
                            value={item.value}
                            disabled={item.disabled}
                        >
                            {item.label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>

            <InputError
                message={errors[name]}
                className="text-sm text-destructive"
            />
        </div>
    );
}
