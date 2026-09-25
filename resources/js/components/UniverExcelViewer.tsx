import { useEffect, useRef } from 'react';

type Props = {
    fileUrl: string;
};

export default function UniverExcelViewer({ fileUrl }: Props) {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const init = async () => {
            if (!containerRef.current) {
return;
}

            containerRef.current.innerHTML = '';

            const response = await fetch(fileUrl);

            const buffer = await response.arrayBuffer();

            console.log('Excel Loaded', buffer.byteLength);

            containerRef.current.innerHTML = `
                <div
                    style="
                        height:100%;
                        display:flex;
                        align-items:center;
                        justify-content:center;
                        font-size:18px;
                    "
                >
                    File berhasil dimuat.
                    Selanjutnya kita aktifkan UniverJS.
                </div>
            `;
        };

        init();
    }, [fileUrl]);

    return <div ref={containerRef} className="h-full w-full" />;
}
