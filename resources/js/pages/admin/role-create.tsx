import { Form, Head, Link } from '@inertiajs/react';
import { CircleX, LoaderCircle, Save } from 'lucide-react';
import RoleController from '@/actions/App/Http/Controllers/Auth/RoleController';
import FormInput from '@/components/common/form-input';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import type { Permission } from '@/types/custom';

export default function RoleCreate({
    permissions,
}: {
    permissions: Permission[];
}) {
    return (
        <>
            <Head title="Tambah Role" />

            <div className="mx-auto mt-10 w-full max-w-full px-4">
                <Card className="border border-muted shadow-lg">
                    <CardHeader className="text-center">
                        <CardTitle className="text-xl font-semibold">
                            Tambah Role
                        </CardTitle>
                    </CardHeader>

                    <Form
                        {...RoleController.store.form()}
                        resetOnSuccess={['name', 'permissions']}
                    >
                        {({ processing, errors }) => (
                            <>
                                <CardContent className="-mt-5 px-6 py-4">
                                    <FormInput
                                        label="Name"
                                        name="name"
                                        errors={errors}
                                    />

                                    <div className="mt-4">
                                        <Label className="mb-3 block">
                                            Permissions
                                        </Label>

                                        {errors.permissions && (
                                            <p className="mb-3 text-sm text-red-600">
                                                {errors.permissions}
                                            </p>
                                        )}

                                        <div className="max-h-[50vh] overflow-y-auto pr-1">
                                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                                                {permissions.map(
                                                    (permission) => (
                                                        <div
                                                            key={permission.id}
                                                            className="flex items-center gap-2"
                                                        >
                                                            <Checkbox
                                                                name="permissions[]"
                                                                value={
                                                                    permission.id
                                                                }
                                                                id={`permission-${permission.id}`}
                                                            />
                                                            <Label
                                                                htmlFor={`permission-${permission.id}`}
                                                            >
                                                                {
                                                                    permission.name
                                                                }
                                                            </Label>
                                                        </div>
                                                    ),
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>

                                <CardFooter className="flex flex-col-reverse gap-2 border-t px-6 py-4 sm:flex-row sm:justify-end">
                                    <Link href={RoleController.index()}>
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

RoleCreate.layout = {
    breadcrumbs: [
        { title: 'Role', href: RoleController.index() },
        { title: 'Create', href: '#' },
    ],
};
