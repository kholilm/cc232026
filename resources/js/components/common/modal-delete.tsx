import { LoaderCircle } from 'lucide-react';
import { Button } from '../ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '../ui/dialog';

export default function ModalDelete({
    isOpen,
    setIsOpen,
    title,
    handleDelete,
    isLoading,
}: {
    isOpen: boolean;
    setIsOpen: React.Dispatch<React.SetStateAction<boolean>>;
    title: string;
    handleDelete: () => void;
    isLoading: boolean;
}) {
    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle className="text-center">
                        Konfirmasi Hapus
                    </DialogTitle>
                    <DialogDescription className="text-center"></DialogDescription>
                </DialogHeader>
                <div className="py-2 text-center">
                    Apakah kamu yakin ingin menghapus{' '}
                    <span className="font-semibold">{title}</span> ?
                </div>
                <DialogFooter className="mt-4">
                    <Button variant="outline" onClick={() => setIsOpen(false)}>
                        Batal
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={handleDelete}
                        disabled={isLoading}
                    >
                        {isLoading && (
                            <LoaderCircle className="h-4 w-4 animate-spin" />
                        )}
                        Hapus
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
