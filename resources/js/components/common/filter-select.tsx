import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

type Option<T extends string> = {
    label: string;
    value: T;
};

type Props<T extends string> = {
    value: T | '';
    onChange: (value: T | '') => void;
    options: Option<T>[];
    width?: string;
    className?: string;
    placeholder?: string;
};

export default function FilterSelect<T extends string>({
    value,
    onChange,
    options,
    width,
    className,
    placeholder,
}: Props<T>) {
    return (
        <div className={`flex items-center gap-2 ${className || ''}`}>
            <Select value={value} onValueChange={onChange}>
                <SelectTrigger
                    className={`${width} h-8 rounded-md border px-2 py-1`}
                >
                    <SelectValue placeholder={placeholder} />
                </SelectTrigger>

                <SelectContent>
                    <SelectGroup>
                        <div className="flex items-center justify-center py-1">
                            {value && (
                                <Button
                                    variant="outline"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        onChange('');
                                    }}
                                    className="h-5 px-2 text-xs"
                                >
                                    Clear
                                </Button>
                            )}
                        </div>

                        {options.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                            </SelectItem>
                        ))}
                    </SelectGroup>
                </SelectContent>
            </Select>
        </div>
    );
}
