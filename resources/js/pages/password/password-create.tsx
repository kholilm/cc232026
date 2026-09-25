import { Form, Head, Link } from '@inertiajs/react';
import { CircleX, LoaderCircle, Save } from 'lucide-react';
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

export default function PasswordCreate() {
    return (
        <>
            <Head title="Tambah Username" />

            <div className="mx-auto mt-10 w-full max-w-md px-4">
                <Card className="border border-muted shadow-lg">
                    <CardHeader className="text-center">
                        <CardTitle className="text-xl font-semibold">
                            Tambah User Agent
                        </CardTitle>
                    </CardHeader>

                    <Form
                        {...PasswordVaultController.store.form()}
                        resetOnSuccess={[
                            'app_name',
                            'username',
                            'email',
                            'password',
                            'notes',
                        ]}
                    >
                        {({ processing, errors }) => (
                            <>
                                <CardContent className="-mt-5 px-6">
                                    <FormInput
                                        label="Nama Aplikasi"
                                        name="app_name"
                                        errors={errors}
                                    />
                                    <FormInput
                                        label="Username"
                                        name="username"
                                        errors={errors}
                                    />
                                    <FormInput
                                        label="Email"
                                        name="email"
                                        type="email"
                                        errors={errors}
                                    />
                                    <FormInput
                                        label="Password"
                                        name="password"
                                        type="password"
                                        errors={errors}
                                    />
                                    <FormInput
                                        label="Notes"
                                        name="notes"
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
                                        Simpan
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

PasswordCreate.layout = {
    breadcrumbs: [
        {
            title: 'Password',
            href: PasswordVaultController.index(),
        },
        {
            title: 'Create',
            href: '#',
        },
    ],
};
