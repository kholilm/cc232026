import { usePage } from '@inertiajs/react';
import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import type { FlashMessage } from '@/types/custom';

type PageProps = {
    flash: {
        success: FlashMessage | null;
        error: FlashMessage | null;
    };
};

export default function FlashMessage() {
    const { flash } = usePage<PageProps>().props;
    const shownIds = useRef<Set<string>>(new Set());

    useEffect(() => {
        if (flash.success && !shownIds.current.has(flash.success.id)) {
            toast.success(flash.success.message, {
                position: 'top-right',
            });
            shownIds.current.add(flash.success.id);
        }

        if (flash.error && !shownIds.current.has(flash.error.id)) {
            toast.error(flash.error.message, {
                position: 'top-right',
                closeButton: true,
                dismissible: true,
            });
            shownIds.current.add(flash.error.id);
        }
    }, [flash]);

    return null;
}
