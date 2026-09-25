import { Form, Head, usePage } from '@inertiajs/react';
import { useEffect } from 'react';
import { toast } from 'sonner';

import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
import TextLink from '@/components/text-link';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { store } from '@/routes/login';
import { request } from '@/routes/password';
type PageProps = {
    errors: Record<string, string>;
};

type Props = {
    status?: string;
    canResetPassword: boolean;
    canRegister: boolean;
};
export default function Login({
    status,
    canResetPassword,
    canRegister,
}: Props) {
    return (
        <>
            <Head title="Login" />

            <Form
                {...store.form()}
                resetOnSuccess={['password']}
                className="flex flex-col gap-6"
                onError={(errors) => {
                    const errorMessage =
                        errors.login ||
                        errors.email ||
                        errors.password ||
                        Object.values(errors)[0];

                    if (errorMessage) {
                        toast.error(
                            errorMessage ===
                                'These credentials do not match our records.'
                                ? 'Username atau password salah.'
                                : errorMessage,
                            {
                                position: 'top-right',
                            },
                        );
                    }
                }}
            >
                {({ processing, errors }) => (
                    <>
                        <div className="grid gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="email">
                                    Email atau Username
                                </Label>

                                <Input
                                    id="email"
                                    type="text"
                                    name="email"
                                    autoFocus
                                    tabIndex={1}
                                    placeholder="Email atau Username"
                                />

                                <InputError message={errors.login} />
                            </div>

                            <div className="grid gap-2">
                                <div className="flex items-center">
                                    <Label
                                        htmlFor="password"
                                        className="text-black"
                                    >
                                        Password
                                    </Label>
                                    {canResetPassword && (
                                        <TextLink
                                            href={request()}
                                            className="ml-auto text-sm text-black transition-colors duration-300 hover:text-blue-500"
                                            tabIndex={5}
                                        >
                                            Forgot password?
                                        </TextLink>
                                    )}
                                </div>
                                <PasswordInput
                                    id="password"
                                    name="password"
                                    required
                                    tabIndex={2}
                                    autoComplete="current-password"
                                    placeholder="Password"
                                />
                                <InputError message={errors.password} />
                            </div>

                            <Button className="w-full bg-gradient-to-r from-blue-500 to-yellow-400 font-semibold text-black transition-all duration-300 hover:brightness-110">
                                Log in
                            </Button>
                        </div>
                    </>
                )}
            </Form>

            {status && (
                <div className="mb-4 text-center text-sm font-medium text-green-600">
                    {status}
                </div>
            )}
        </>
    );
}

Login.layout = {
    title: 'Log in to your account',
    description: 'Enter your email and password below to log in',
};
