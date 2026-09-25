type Props = {
    file: string;
    title: string;
};

export default function PdfViewer({ file, title }: Props) {
    return (
        <div className="flex h-full w-full flex-col bg-gray-100">
            {/* HEADER */}
            <div className="flex h-12 items-center border-b bg-white px-4">
                <h2 className="truncate font-semibold">{title}</h2>
            </div>

            {/* PDF */}
            <div className="flex-1 overflow-hidden">
                <iframe
                    src={file}
                    title={title}
                    className="h-[calc(100vh-160px)] w-full border-0"
                />
            </div>
        </div>
    );
}
