import { cn } from '@/lib/utils';
import InputError from '../input-error';
import { Checkbox } from '../ui/checkbox';
import { Label } from '../ui/label';

type Props<T extends Record<string, unknown>> = {
    id: keyof T & string;
    label: string;

    data: T;
    setData: (key: keyof T & string, value: T[keyof T]) => void;

    errors?: Record<string, string>;
    processing?: boolean;
    className?: string;
};

export default function FormCheckbox<T extends Record<string, unknown>>({
    id,
    label,
    data,
    setData,
    errors = {},
    processing = false,
    className,
}: Props<T>) {
    const value = Boolean(data[id]);

    return (
        <div className={cn('space-y-1', className)}>
            <div className="flex items-center gap-2">
                <Checkbox
                    id={id}
                    checked={value}
                    onCheckedChange={(checked) =>
                        setData(id, Boolean(checked) as T[keyof T])
                    }
                    disabled={processing}
                />

                <Label
                    htmlFor={id}
                    className="text-sm leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                    {label}
                </Label>
            </div>

            <InputError
                message={errors[id]}
                className="text-sm text-destructive"
            />
        </div>
    );
}
