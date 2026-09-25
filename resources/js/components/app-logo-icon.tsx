import type { SVGAttributes } from 'react';

export default function AppLogoIcon(
    props: React.ImgHTMLAttributes<HTMLImageElement>,
) {
    return (
        <img
            src="/images/logocc.png" // logo login
            alt="Logo"
            className="object-contain"
            {...props}
        />
    );
}
