<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;

class PermissionSeeder extends Seeder
{
    public function run(): void
    {
        $permissions = [

            // Dashboard
            'dashboard',

            // Administrator
            'auth.permission',
            'auth.role',
            'auth.user',
            'auth.migration',
            'auth.session',
            'auth.log',

            // Info
            'auth.info',
            'auth.info.create',
            'auth.info.update',
            'auth.info.delete',

            // Password
            'auth.password',

            // Release Schedule
            'auth.release-schedule',
            'auth.release-schedule.create',
            'auth.release-schedule.update',
            'auth.release-schedule.delete',

        ];


        foreach ($permissions as $permission) {

            Permission::firstOrCreate([
                'name' => $permission,
                'guard_name' => 'web',
            ]);
        }
    }
}
