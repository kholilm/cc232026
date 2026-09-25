<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Spatie\Permission\Models\Permission;

class PermissionController extends Controller
{
    /**
     * Display a listing of the resource.
     */
   public function index(Request $request)
{
    $query = Permission::query();


    // SEARCH
    if ($request->search) {
        $query->where(
            'name',
            'like',
            '%' . $request->search . '%'
        );
    }


    // SORT AMAN
    $allowedSort = [
        'name',
        'guard_name',
        'created_at',
    ];

    $sort = in_array($request->sort, $allowedSort)
        ? $request->sort
        : 'name';


    $direction = $request->direction === 'desc'
        ? 'desc'
        : 'asc';


    // PAGINATION
    $limit = $request->limit ?? 5;


    $permissions = $query
        ->orderBy($sort, $direction)
        ->paginate($limit)
        ->withQueryString();


    return Inertia::render('admin/permission-index', [
        'permissions' => $permissions,

        'search' => $request->search ?? '',

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
        return Inertia::render('admin/permission-create');
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $this->validasi($request);
        Permission::create([
            'name' => $request->name
        ]);
        return to_route('permission.index')->with('success', 'Permission berhasil disimpan');
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
        return Inertia::render('admin/permission-edit', [
            'permission' => Permission::findOrFail($id)
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id)
    {
        $this->validasi($request, $id);
        Permission::findOrFail($id)->update([
            'name' => $request->name,
        ]);
        return to_route('permission.index')->with('success', 'Permission berhasil diupdate');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id)
    {
        Permission::findOrFail($id)->delete();
        return to_route('permission.index')->with('success', 'Permission berhasil dihapus');
    }
    protected function validasi(Request $request, $id = null)
    {
        $request->validate([
            'name' => ['required', 'string', Rule::unique('permissions', 'name')->ignore($id)],
        ]);
    }
}
