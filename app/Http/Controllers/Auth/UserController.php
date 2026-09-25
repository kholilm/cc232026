<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Inertia\Inertia;
use App\Models\User;
use Spatie\Permission\Models\Role;
use Illuminate\Support\Facades\Hash;

class UserController extends Controller
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

        $users = User::with('roles')
            ->when($search, function ($query, $search) {
                $query->where(function ($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%")
                        ->orWhereHas('roles', function ($role) use ($search) {
                            $role->where('name', 'like', "%{$search}%");
                        });
                });
            })
            ->orderBy($sort, $direction)
            ->paginate($limit)
            ->appends([
                'search' => $search,
                'limit' => $limit,
                'sort' => $sort,
                'direction' => $direction,
            ]);

        return Inertia::render('admin/user-index', [
            'users' => $users,
            'search' => $search,
            'limit' => $limit,
            'sort' => $sort,
            'direction' => $direction,
        ]);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        return Inertia::render('admin/user-create', [
            'roles' => Role::all()
        ]);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $data = $request->validate([
            'name'      => 'required',
            'email'     => 'required|unique:users',
            'password'  => 'required|confirmed',
            'roles'     => 'required|array',
            'roles.*'   => 'integer|exists:roles,id',
        ]);
        $user = User::create([
            'name'     => $data['name'],
            'email'    => $data['email'],
            'password' => Hash::make($data['password'])
        ]);

        $roles = Role::whereIn('id', $data['roles'])->pluck('name')->toArray();
        $user->assignRole($roles);
        return to_route('user.index')->with('success', 'User berhasil disimpan');
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
        return Inertia::render('admin/user-edit', [
            'user'  => User::with('roles')->findOrFail($id),
            'roles' => Role::all()
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, User $user)
    {
        $data = $request->validate([
            'name'      => 'required',
            'email'     => 'required|unique:users,email,' . $user->id,
            'password'  => 'nullable|confirmed',
            'roles'     => 'required|array',
            'roles.*'   => 'integer|exists:roles,id',
        ]);

        if ($request->password == '') {
            $user->update([
                'name'     => $data['name'],
                'email'    => $data['email'],
            ]);
        } else {
            $user->update([
                'name'     => $data['name'],
                'email'    => $data['email'],
                'password' => Hash::make($data['password'])
            ]);
        }
        $role = Role::whereIn('id', $data['roles'])->pluck('name')->toArray();
        $user->syncRoles($role);
        return to_route('user.index')->with('success', 'User berhasil diubah');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id)
    {
        User::findOrFail($id)->delete();
    }

    public function changepassword()
    {
        return Inertia::render('Auth/Users_changepassword', [
            'user' => auth()->user(),
        ]);
    }

    public function updatepassword(Request $request)
    {
        $request->validate([
            'current_password' => 'required|current_password',
            'password' => 'required|confirmed',
        ]);

        auth()->user()->update([
            'password' => Hash::make($request->password),
        ]);

        return back()->with('success', 'Password berhasil diubah.');
    }
}
