<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        // Ambil semua permission
        $permissions = Permission::all();


        // Buat role
        $roleAdmin = Role::firstOrCreate([
            'name' => 'admin',
            'guard_name' => 'web',
        ]);


        $roleUser = Role::firstOrCreate([
            'name' => 'user',
            'guard_name' => 'web',
        ]);


        // Admin dapat semua permission
        $roleAdmin->syncPermissions($permissions);


        // User biasa hanya lihat
        $roleUser->syncPermissions([
            'dashboard',
            'auth.info',
            'auth.password',
        ]);


        // Buat user admin
        $admin = User::updateOrCreate(
            [
                'email' => 'kholil@gmail.com',
            ],
            [
                'name' => 'Kholil',
                'password' => Hash::make('Tertawa'),
                'email_verified_at' => now(),
            ]
        );


        // Bersihkan role lama lalu pasang admin
        $admin->syncRoles([
            $roleAdmin
        ]);
    }
}