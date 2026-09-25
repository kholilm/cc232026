import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Label } from '../ui/label';

type TableLimitSelectProps = {
    id?: string;
    value: number;
    onChange: (value: number) => void;
    options: number[];
    className?: string;
};

export default function TableLimitSelect({
    value,
    onChange,
    options,
}: TableLimitSelectProps) {
    return (
        <div
            className={`flex w-full items-center justify-center gap-2 md:w-auto`}
        >
            <Label>Limit</Label>

            <Select
                value={String(value)}
                onValueChange={(val) => onChange(Number(val))}
            >
                <SelectTrigger className="h-8 w-20 rounded-md border px-2 py-1">
                    <SelectValue placeholder="Limit" />
                </SelectTrigger>
                <SelectContent side="bottom" avoidCollisions>
                    <SelectGroup>
                        {options.map((l) => (
                            <SelectItem key={l} value={String(l)}>
                                {l}
                            </SelectItem>
                        ))}
                    </SelectGroup>
                </SelectContent>
            </Select>
        </div>
    );
}
