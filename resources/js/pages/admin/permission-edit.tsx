import { Form, Head, Link } from '@inertiajs/react';
import { CircleX, LoaderCircle, Save } from 'lucide-react';
import PermissionController from '@/actions/App/Http/Controllers/Auth/PermissionController';
import FormInput from '@/components/common/form-input';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import type { Permission } from '@/types/custom';

export default function PermissionEdit({
    permission,
}: {
    permission: Permission;
}) {
    return (
        <>
            <Head title="Edit Permission" />
            <div className="mx-auto mt-10 w-full max-w-md px-4">
                <Card className="border border-muted shadow-lg">
                    <CardHeader className="space-y-1 text-center">
                        <CardTitle className="text-1xl font-semibold">
                            Edit Permission
                        </CardTitle>
                    </CardHeader>

                    <Form
                        {...PermissionController.update.form(permission.id)}
                        resetOnSuccess={['name']}
                    >
                        {({ processing, errors }) => (
                            <>
                                <CardContent className="px -mt-5 py-4">
                                    <div className="py-1">
                                        <FormInput
                                            label="Name"
                                            name="name"
                                            defaultValue={permission.name}
                                            errors={errors}
                                        />
                                    </div>
                                </CardContent>

                                <CardFooter className="flex flex-col-reverse items-stretch gap-2 border-t px-6 py-4 sm:flex-row sm:items-center sm:justify-end">
                                    <Link href={PermissionController.index()}>
                                        <Button
                                            type="button"
                                            size={'sm'}
                                            variant="outline"
                                            className="w-full sm:w-auto"
                                        >
                                            <CircleX />
                                            Kembali
                                        </Button>
                                    </Link>
                                    <Button
                                        type="submit"
                                        size={'sm'}
                                        disabled={processing}
                                        className="w-full sm:w-auto"
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

PermissionEdit.layout = {
    breadcrumbs: [
        { title: 'Permission', href: PermissionController.index() },
        { title: 'Edit', href: '#' },
    ],
};
