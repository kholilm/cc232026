import { Form, Head, Link } from '@inertiajs/react';
import { CircleX, LoaderCircle, Save } from 'lucide-react';
import UserController from '@/actions/App/Http/Controllers/Auth/UserController';
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
import type { Role, User } from '@/types/custom';

export default function UserEdit({
    user,
    roles,
}: {
    user: User;
    roles: Role[];
}) {
    return (
        <>
            <Head title="Update User" />

            <div className="mx-auto mt-10 w-full max-w-md px-4">
                <Card className="border border-muted shadow-lg">
                    <CardHeader className="text-center">
                        <CardTitle className="text-xl font-semibold">
                            Update User
                        </CardTitle>
                    </CardHeader>

                    <Form
                        {...UserController.update.form(user.id)}
                        resetOnSuccess={[
                            'name',
                            'email',
                            'password',
                            'password_confirmation',
                            'roles',
                        ]}
                    >
                        {({ processing, errors }) => (
                            <>
                                <CardContent className="-mt-5 px-6">
                                    {/* NAME */}
                                    <FormInput
                                        label="Name"
                                        name="name"
                                        defaultValue={user.name}
                                        errors={errors}
                                    />

                                    {/* EMAIL */}
                                    <FormInput
                                        label="Email"
                                        name="email"
                                        type="email"
                                        defaultValue={user.email}
                                        errors={errors}
                                    />

                                    {/* PASSWORD */}
                                    <FormInput
                                        label="Password"
                                        name="password"
                                        type="password"
                                        errors={errors}
                                    />

                                    {/* PASSWORD CONFIRMATION */}
                                    <FormInput
                                        label="Password Confirmation"
                                        name="password_confirmation"
                                        type="password"
                                        errors={errors}
                                    />

                                    {/* ROLES */}
                                    <div className="mt-3">
                                        <Label className="mb-3 block">
                                            Roles
                                        </Label>

                                        {errors.roles && (
                                            <p className="mb-3 text-sm text-red-600">
                                                {errors.roles}
                                            </p>
                                        )}

                                        <div className="mb-2 grid grid-cols-2 gap-2">
                                            {roles.map((role) => {
                                                const checked =
                                                    user.roles?.some(
                                                        (r) => r.id === role.id,
                                                    );

                                                return (
                                                    <div
                                                        key={role.id}
                                                        className="flex items-center gap-2"
                                                    >
                                                        <Checkbox
                                                            id={`role-${role.id}`}
                                                            name="roles[]"
                                                            value={role.id}
                                                            defaultChecked={
                                                                checked
                                                            }
                                                        />
                                                        <Label
                                                            htmlFor={`role-${role.id}`}
                                                        >
                                                            {role.name}
                                                        </Label>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </CardContent>

                                <CardFooter className="flex flex-col-reverse items-stretch gap-2 border-t px-6 py-4 sm:flex-row sm:justify-end">
                                    <Link href={UserController.index()}>
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

UserEdit.layout = {
    breadcrumbs: [
        { title: 'User', href: UserController.index() },
        { title: 'Edit', href: '#' },
    ],
};
