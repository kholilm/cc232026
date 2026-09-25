<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class RoleController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
{
    $search = request()->search;

    $sort = request()->sort ?? 'name';
    $direction = request()->direction ?? 'asc';
    $limit = request()->limit ?? 10;

    $roles = Role::with('permissions')
        ->when($search, function ($roles) use ($search) {
            $roles->where('name', 'like', '%' . $search . '%')
                ->orWhereHas('permissions', function ($query) use ($search) {
                    $query->where('name', 'like', '%' . $search . '%');
                });
        })
        ->orderBy('roles.' . $sort, $direction)
        ->paginate($limit)
        ->appends([
            'search' => $search,
            'sort' => $sort,
            'direction' => $direction,
            'limit' => $limit,
        ]);

    return Inertia::render('admin/role-index', [
        'roles' => $roles,
        'search' => $search ?? '',
        'sort' => $sort,
        'direction' => $direction,
        'limit' => $limit,
    ]);
}

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        return Inertia::render('admin/role-create', [
            'permissions' => Permission::orderBy('name', 'asc')->get(),
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => 'required|string|max:255',
            'permissions' => 'required|array',
            'permissions.*' => 'integer|exists:permissions,id',
        ]);
        $role = Role::create(['name' => $data['name']]);

        $permissions = Permission::whereIn('id', $data['permissions'])->pluck('name')->toArray();
        $role->givePermissionTo($permissions);
        return to_route('role.index')->with('success', 'Role berhasil disimpan');
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id)
    {
        //
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(string $id)
    {
        return Inertia::render('admin/role-edit', [
            'role'        => Role::with('permissions')->findOrFail($id),
            'permissions' => Permission::orderBy('name', 'asc')->get(),
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Role $role)
    {
        $data = $request->validate([
            'name'          => 'required|string|unique:roles,name,' . $role->id,
            'permissions'   => 'required|array',
            'permissions.*' => 'integer|exists:permissions,id',
        ]);

        $role->update(['name' => $data['name']]);
        $permissionNames = Permission::whereIn('id', $data['permissions'])->pluck('name')->toArray();
        $role->syncPermissions($permissionNames);

        return to_route('role.index')->with('success', 'Role berhasil diubah');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id)
    {
        Role::findOrFail($id)->delete();
        return to_route('role.index')->with('success', 'Role berhasil dihapus');
    }
    public function coba()
    {
        $request = request()->search;
        $roles = Role::with('permissions')->when($request, function ($roles, $request) {
            $roles = $roles->where('name', 'like', '%' . $request . '%');
            $roles->orWhereHas('permissions', function ($roles) use ($request) {
                $roles = $roles->where('name', 'like', '%' . $request . '%');
            });
        })->orderBy('roles.name', 'asc')->paginate(5)->appends(['search' => $request]);

        return Inertia::render('admin/role-index', [
            'roles'  => $roles,
            'search' => request()->search ?? '',
        ]);
    }
}
