import FilePreview from '@/components/FilePreview';
type Info = {
    id: number;
    title: string;
    type: string;
    file?: string;
};
type Props = {
    item: Info;
};
export default function Show({ item }: Props) {
    const fileUrl = item.file ? `/storage/${item.file}` : '';

    return (
        <div className="flex h-full w-full flex-col bg-white text-black dark:bg-gray-900 dark:text-white">
            {item.file ? (
                <div className="min-h-0 flex-1">
                    <FilePreview file={fileUrl} title={item.title} />
                </div>
            ) : (
                <div className="p-4">
                    <h1 className="mb-4 text-xl font-bold">{item.title}</h1>
                    <p className="text-gray-700 dark:text-gray-300">
                        Tidak ada file
                    </p>
                </div>
            )}
        </div>
    );
}
