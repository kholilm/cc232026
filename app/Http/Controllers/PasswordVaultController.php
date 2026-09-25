<?php

namespace App\Http\Controllers;

use App\Models\PasswordVault;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Crypt;
use Inertia\Inertia;

class PasswordVaultController extends Controller
{
    /**
     * Display a listing of the resource.
     */
  
public function index(Request $request)
{
    $search = $request->search;
    $limit = $request->limit ?? 10;

    $sort = $request->sort ?? 'app_name';
    $direction = $request->direction ?? 'asc';

    $vaults = PasswordVault::query()
        ->select([
            'id',
            'app_name',
            'username',
            'email',
            'notes',
        ])
        ->where('user_id', auth()->id())
        ->when($search, function ($query) use ($search) {
            $query->where('app_name', 'like', "%{$search}%");
        })
        ->orderBy($sort, $direction)
        ->paginate($limit)
        ->withQueryString();

    return Inertia::render('password/password-index', [
        'vaults' => $vaults,
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
        return Inertia::render('password/password-create');
    }

    /**
     * Store a newly created resource in storage.
     */
   public function store(Request $request)
{
    $request->validate([
        'app_name' => ['required'],
        'username' => ['nullable'],
        'email' => ['nullable', 'email'],
        'password' => ['required'],
        'notes' => ['nullable'],
        
    ]);

    PasswordVault::create([
        'user_id' => auth()->id(),
        'app_name' => $request->app_name,
        'username' => $request->username,
        'email' => $request->email,
        'password' => Crypt::encryptString($request->password),
        'notes' => $request->notes,
        
    ]);

    return redirect()
        ->route('vault.index')
        ->with('success', 'Data berhasil disimpan');
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
    public function edit($id)
    {
        $password = PasswordVault::findOrFail($id);

        abort_if(
            $password->user_id !== auth()->id(),
            403
        );

        return Inertia::render('password/password-edit', [
            'vault' => [
                'id' => $password->id,
                'app_name' => $password->app_name,
                'username' => $password->username,
                'email' => $password->email,
                'password' => Crypt::decryptString($password->password),
                'notes' => $password->notes,
            ],
        ]);
    }

   public function update(Request $request, $id)
    {
        
        $vault = PasswordVault::findOrFail($id);

        abort_if(
            $vault->user_id !== auth()->id(),
            403
        );

        $request->validate([
            'app_name' => ['required'],
            'username' => ['nullable'],
            'email' => ['nullable', 'email'],
            'password' => ['required'],
            'notes' => ['nullable'],
        ]);

        $vault->update([
            'app_name' => $request->app_name,
            'username' => $request->username,
            'email' => $request->email,
            'password' => Crypt::encryptString($request->password),
            'notes' => $request->notes,
        ]);

        return redirect()
            ->route('vault.index')
            ->with('success', 'Data berhasil diubah');
    }
    /**
     * Remove the specified resource from storage.
     */
   public function destroy(string $id)
    {
        $vault = PasswordVault::findOrFail($id);

        abort_if(
            $vault->user_id !== auth()->id(),
            403
        );

        $vault->delete();

        return redirect()
            ->route('vault.index')
            ->with('success', 'Data berhasil dihapus');
    }

    public function viewPassword( PasswordVault $passwordVault)
    {
        abort_if(
            $passwordVault->user_id !== auth()->id(),
            403
        );

        return response()->json([
            'password' => Crypt::decryptString(
                $passwordVault->password
            ),
        ]);
    }

}
