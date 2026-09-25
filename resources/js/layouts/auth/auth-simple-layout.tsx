import { Link } from '@inertiajs/react';
import AppLogoIcon from '@/components/app-logo-icon';
import { home } from '@/routes';
import type { AuthLayoutProps } from '@/types';

export default function AuthSimpleLayout({
    children,
    title,
    description,
}: AuthLayoutProps) {
    return (
        <div className="relative flex min-h-svh items-center justify-center overflow-hidden bg-gradient-to-br from-blue-500 to-yellow-400">
            <img
                src="/images/logocc.png" // logo login awal
                alt="bg"
                className="pointer-events-none absolute top-10 right-10 w-100 opacity-30 select-none"
            />
            <div className="w-full max-w-sm rounded-xl border border-white/20 bg-white/30 p-6 shadow-xl backdrop-blur-lg">
                <div className="flex flex-col gap-8">
                    <div className="flex flex-col items-center gap-4">
                        <div className="space-y-2 text-center">
                            <h1 className="text-xl font-medium">{title}</h1>
                            <p className="text-center text-sm text-muted-foreground">
                                {description}
                            </p>
                        </div>
                    </div>
                    {children}
                </div>
            </div>
        </div>
    );
}
