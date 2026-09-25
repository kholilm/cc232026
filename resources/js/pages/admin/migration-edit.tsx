import { Form, Head, Link } from '@inertiajs/react';
import { CircleX, LoaderCircle, Save } from 'lucide-react';
import MigrationController from '@/actions/App/Http/Controllers/Auth/MigrationController';
import FormInput from '@/components/common/form-input';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import type { Migration } from '@/types/custom';

export default function MigrationEdit({ migration }: { migration: Migration }) {
    return (
        <>
            <Head title="Update Migration" />

            <div className="mx-auto mt-10 w-full max-w-md px-4">
                <Card className="border border-muted shadow-lg">
                    <CardHeader className="space-y-1 text-center">
                        <CardTitle className="text-1xl font-semibold">
                            Update Migration
                        </CardTitle>
                    </CardHeader>

                    <Form
                        {...MigrationController.update.form(migration.id)}
                        resetOnSuccess={['batch']}
                    >
                        {({ processing, errors }) => (
                            <>
                                <CardContent className="px -mt-5 py-4">
                                    {/* MIGRATION NAME (READ ONLY) */}
                                    <FormInput
                                        label="Name"
                                        name="migration"
                                        defaultValue={migration.migration}
                                        errors={errors}
                                        readOnly
                                    />

                                    {/* BATCH */}
                                    <FormInput
                                        label="Batch"
                                        name="batch"
                                        type="number"
                                        defaultValue={migration.batch}
                                        errors={errors}
                                    />
                                </CardContent>

                                <CardFooter className="flex flex-col-reverse items-stretch gap-2 border-t px-6 py-4 sm:flex-row sm:items-center sm:justify-end">
                                    <Link href={MigrationController.index()}>
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="outline"
                                            className="w-full sm:w-auto"
                                        >
                                            <CircleX />
                                            Kembali
                                        </Button>
                                    </Link>
                                    <Button
                                        type="submit"
                                        size="sm"
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

MigrationEdit.layout = {
    breadcrumbs: [
        { title: 'Migration', href: MigrationController.index() },
        { title: 'Edit', href: '#' },
    ],
};
