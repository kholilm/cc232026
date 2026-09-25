import { Form, Head, Link } from '@inertiajs/react';
import { CircleX, LoaderCircle, Save, Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';
import PasswordVaultController from '@/actions/App/Http/Controllers/PasswordVaultController';
import FormInput from '@/components/common/form-input';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
type Props = {
    vault: {
        id: number;
        app_name: string;
        username: string;
        email: string;
        password: string;
        notes: string;
    };
};

export default function PasswordEdit({ vault }: Props) {
    const [showPassword, setShowPassword] = useState(false);

    return (
        <>
            <Head title="Edit Password" />

            <div className="mx-auto mt-10 w-full max-w-md px-4">
                <Card className="border border-muted shadow-lg">
                    <CardHeader className="text-center">
                        <CardTitle className="text-xl font-semibold">
                            Edit User Agent
                        </CardTitle>
                    </CardHeader>

                    <Form action={`/password/${vault.id}`} method="put">
                        {({ processing, errors }) => (
                            <>
                                <CardContent className="-mt-5 px-6">
                                    <FormInput
                                        label="Nama Aplikasi"
                                        name="app_name"
                                        defaultValue={vault.app_name}
                                        errors={errors}
                                    />

                                    <FormInput
                                        label="Username"
                                        name="username"
                                        defaultValue={vault.username}
                                        errors={errors}
                                    />

                                    <FormInput
                                        label="Email"
                                        name="email"
                                        type="email"
                                        defaultValue={vault.email}
                                        errors={errors}
                                    />

                                    <FormInput
                                        label="Password"
                                        name="password"
                                        type={
                                            showPassword ? 'text' : 'password'
                                        }
                                        defaultValue={vault.password}
                                        errors={errors}
                                        rightIcon={
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setShowPassword(
                                                        !showPassword,
                                                    )
                                                }
                                            >
                                                {showPassword ? (
                                                    <EyeOff className="h-4 w-4" />
                                                ) : (
                                                    <Eye className="h-4 w-4" />
                                                )}
                                            </button>
                                        }
                                    />
                                    <FormInput
                                        label="Notes"
                                        name="notes"
                                        defaultValue={vault.notes}
                                        errors={errors}
                                    />
                                </CardContent>

                                <CardFooter className="flex flex-col-reverse items-stretch gap-2 border-t px-6 py-4 sm:flex-row sm:justify-end">
                                    <Link
                                        href={PasswordVaultController.index()}
                                    >
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="outline"
                                        >
                                            <CircleX />
                                            Kembali
                                        </Button>
                                    </Link>

                                    <Button
                                        type="submit"
                                        size="sm"
                                        disabled={processing}
                                    >
                                        {processing ? (
                                            <LoaderCircle className="animate-spin" />
                                        ) : (
                                            <Save />
                                        )}
                                        Update
                                    </Button>
                                </CardFooter>
                            </>
                        )}
                    </Form>
                </Card>
            </div>
        </>
    );
}

PasswordEdit.layout = {
    breadcrumbs: [
        {
            title: 'Password',
            href: PasswordVaultController.index(),
        },
        {
            title: 'Edit',
            href: '#',
        },
    ],
};
