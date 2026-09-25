import type { ReactNode } from 'react';
import InputError from '@/components/input-error';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

type Props = {
    name: string;
    label: string;
    type?: string;
    placeholder?: string;
    errors?: Record<string, string>;
    className?: string;
    rightIcon?: ReactNode;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'name' | 'type'>;

export default function FormInput({
    name,
    label,
    type = 'text',
    placeholder,
    errors = {},
    className,
    rightIcon,
    ...props
}: Props) {
    return (
        <div className="py-1">
            <Label htmlFor={name}>{label}</Label>

            <div className="relative">
                <Input
                    id={name}
                    name={name}
                    type={type}
                    placeholder={placeholder ?? label}
                    className={cn(
                        errors[name] && 'border-red-500',
                        rightIcon && 'pr-10',
                        className,
                    )}
                    {...props}
                />

                {rightIcon && (
                    <div className="absolute top-1/2 right-3 -translate-y-1/2">
                        {rightIcon}
                    </div>
                )}
            </div>

            <InputError
                message={errors[name]}
                className="text-sm text-destructive"
            />
        </div>
    );
}
