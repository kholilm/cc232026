<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Support\Facades\DB;
use Ifsnop\Mysqldump\Mysqldump;

class MigrationController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        $search = request()->search;
        $limit = request()->limit ?? 10;
        $sort = request()->sort ?? 'batch';
        $direction = request()->direction ?? 'desc';

        $migrations = DB::table('migrations')
            ->when($search, function ($query) use ($search) {
                $query->where(
                    'migration',
                    'like',
                    '%' . $search . '%'
                );
            })
            ->orderBy($sort, $direction)
            ->paginate($limit)
            ->appends([
                'search' => $search,
                'limit' => $limit,
                'sort' => $sort,
                'direction' => $direction,
            ]);

        return Inertia::render('admin/migration-index', [
            'migrations' => $migrations,
            'search' => $search ?? '',
            'limit' => $limit,
            'sort' => $sort,
            'direction' => $direction,
        ]);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create(Request $request)
    {

        try {
            $database = config('database.connections.mysql.database');
            $username = config('database.connections.mysql.username');
            $password = config('database.connections.mysql.password');
            $host     = config('database.connections.mysql.host');
            $backupFile = storage_path('app/database/backupdatabase.sql');

            $dump = new Mysqldump("mysql:host=$host;dbname=$database", $username, $password);
            $dump->start($backupFile);
            return redirect()
                ->route('migration.index')
                ->with('success', 'Backup database berhasil dibuat! Silakan download file.');
        } catch (\Exception $e) {
            return redirect()
                ->back()
                ->withErrors([
                    'backup' => 'Backup database gagal! ' . $e->getMessage(),
                ]);
        }
    }



    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        //
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
        return Inertia::render('admin/migration-edit', [
            'migration' => DB::table('migrations')->where('id', $id)->first(),
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id)
    {
        $request->validate([
            'batch' => 'required|integer',
        ]);
        DB::table('migrations')->where('id', $id)->update([
            'batch' => $request->batch
        ]);
        return to_route('migration.index')->with('success', 'Migration berhasil diubah');
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id)
    {
        //
    }
    public function download()
    {
        $filePath = storage_path('app/database/backupdatabase.sql');
        if (!file_exists($filePath)) {
            return redirect()
                ->route('migration.index')
                ->with('error', 'File backup tidak ditemukan!');
        }
        return response()->download(
            $filePath,
            date('Y-m-d') . '-backupdb.sql'
        )->deleteFileAfterSend(true);
    }
}
