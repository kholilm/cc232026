<?php

namespace App\Http\Controllers;

use App\Models\Info;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;

class InfoController extends Controller
{
    public function index(Request $request)
    {
        $query = Info::query();
        if ($request->filled('search')) {
            $query->where(
                'title',
                'like',
                '%' . $request->search . '%'
            );
        }
        if (
            $request->filled('type') &&
            in_array($request->type, ['info', 'sop', 'warning'], true)
        ) {
            $query->where('type', $request->type);
        }
        $allowedSort = [
            'title',
            'type',
            'created_at',
        ];
        $sort = in_array($request->sort, $allowedSort)
            ? $request->sort
            : 'created_at';
        $direction = $request->direction === 'asc'
            ? 'asc'
            : 'desc';
        $infos = $query
            ->orderBy($sort, $direction)
            ->paginate($request->limit ?? 10)
            ->withQueryString();
        return Inertia::render('info/info_index', [
            'infos' => $infos,
            'search' => request('search', ''),
            'type' => request('type', ''),
            'limit' => (int) $request->input('limit', 10),
            'sort' => $sort,
            'direction' => $direction,
        ]);
    }

    public function dashboard()
    {
        return Inertia::render('dashboard', [
            'infos' => Info::latest()->limit(3)->get(),
        ]);
    }

    public function show(Info $info)
    {
        return Inertia::render('info/info_show', [
            'item' => $info,
        ]);
    }

    public function create()
    {
        abort_unless(
            auth()->user()->can('auth.info.create'),
            403
        );

        return Inertia::render('info/info_create');
    }

    public function store(Request $request)
    {
        abort_unless(
            auth()->user()->can('auth.info.create'),
            403
        );
        $data = $request->validate([
            'title' => 'required',
            'description' => 'nullable|string',
            'type' => 'required',
            'file' => [
                'nullable',
                'file',
                'mimes:pdf,jpg,jpeg,png,webp,xlsx,xls,csv,html,htm,txt',
                'max:51200',
            ],
            // [PATCH] HTML resource folder (_files) - opsional, hanya untuk file .html/.htm
            'html_files' => 'nullable|array',
            'html_files.*' => 'file|max:51200',
            'html_file_paths' => 'nullable|array',
            'html_file_paths.*' => 'nullable|string|max:10000',
        ]);
        if ($request->hasFile('file')) {
            $file = $request->file('file');
            // nama file asli
            $filename = $file->getClientOriginalName();
            /*
            * Hindari overwrite jika nama file sama
            */
            if (Storage::disk('public')->exists("infos/$filename")) {
                $name = pathinfo($filename, PATHINFO_FILENAME);
                $ext  = $file->getClientOriginalExtension();
                $filename = $name . '_' . now()->format('YmdHis') . '.' . $ext;
            }
            $data['file'] = $file->storeAs(
                'infos',
                $filename,
                'public'
            );
        }
        // [PATCH] Simpan folder _files apa adanya (relatif thd file HTML)
        // Hanya dijalankan untuk file HTML/HTM agar tidak memengaruhi upload lain.
        $this->storeHtmlResources($request, $data['file'] ?? null);
        unset($data['html_files'], $data['html_file_paths']);
        $info = Info::create($data);

        if ($request->expectsJson()) {
            return response()->json([
                'info' => $info,
            ]);
        }

        return redirect()
            ->route('info.index')
            ->with('success', 'Data berhasil ditambahkan');
    }

    public function uploadHtmlResources(Request $request, Info $info)
    {
        abort_unless(
            auth()->user()->can('auth.info.create'),
            403
        );

        $request->validate([
            'html_files' => 'required|array',
            'html_files.*' => 'file|max:51200',
            'html_file_paths' => 'required|array',
            'html_file_paths.*' => 'required|string|max:10000',
        ]);

        $this->storeHtmlResources($request, $info->file);

        return response()->json([
            'success' => true,
        ]);
    }

    public function edit(Info $info)
    {
        abort_unless(
            auth()->user()->can('auth.info.update'),
            403
        );

        return Inertia::render('info/info_edit', [
            'info' => $info,
        ]);
    }

    public function update(Request $request, Info $info)
    {
        abort_unless(
            auth()->user()->can('auth.info.update'),
            403
        );
        $data = $request->validate([
            'title' => 'required',
            'description' => 'nullable|string',
            'type' => 'required',
            'file' => [
                'nullable',
                'file',
                'mimes:pdf,jpg,jpeg,png,webp,xlsx,xls,csv,html,htm,txt',
                'max:5120',
            ],
            'remove_file' => 'nullable|boolean',
            // [PATCH] HTML resource folder (_files) - opsional, hanya untuk file .html/.htm
            'html_files' => 'nullable|array',
            'html_files.*' => 'file|max:5120',
            'html_file_paths' => 'nullable|array',
            'html_file_paths.*' => 'nullable|string|max:1000',
        ]);
        unset($data['file']);
        if (
            $request->boolean('remove_file') &&
            $info->file
        ) {
            // [PATCH] Hapus folder _files lama bila ada (hanya untuk HTML/HTM)
            $oldExt = strtolower(
                pathinfo($info->file, PATHINFO_EXTENSION)
            );
            if (in_array($oldExt, ['html', 'htm'], true)) {
                $oldBase = pathinfo($info->file, PATHINFO_FILENAME);
                Storage::disk('public')->deleteDirectory(
                    "infos/{$oldBase}_files"
                );
            }
            Storage::disk('public')->delete($info->file);
            $data['file'] = null;
        }
        if ($request->hasFile('file')) {
            if ($info->file) {
                // [PATCH] Hapus folder _files dari file lama yang diganti
                $oldExt = strtolower(
                    pathinfo($info->file, PATHINFO_EXTENSION)
                );
                if (in_array($oldExt, ['html', 'htm'], true)) {
                    $oldBase = pathinfo($info->file, PATHINFO_FILENAME);
                    Storage::disk('public')->deleteDirectory(
                        "infos/{$oldBase}_files"
                    );
                }
                Storage::disk('public')->delete($info->file);
            }
            $file = $request->file('file');
            $filename = $file->getClientOriginalName();
            if (Storage::disk('public')->exists("infos/$filename")) {
                $name = pathinfo($filename, PATHINFO_FILENAME);
                $ext  = $file->getClientOriginalExtension();
                $filename = $name . '_' . now()->format('YmdHis') . '.' . $ext;
            }
            $data['file'] = $file->storeAs(
                'infos',
                $filename,
                'public'
            );
        }
        // [PATCH] Simpan folder _files apa adanya untuk file HTML/HTM baru
        $this->storeHtmlResources($request, $data['file'] ?? null);
        unset($data['html_files'], $data['html_file_paths']);
        $info->update($data);
        return redirect()
            ->route('info.index')
            ->with('success', 'Data berhasil diperbarui');
    }

    public function destroy(Info $info)
    {
        abort_unless(
            auth()->user()->can('auth.info.delete'),
            403
        );
        if ($info->file) {
            // [PATCH] Hapus folder _files terkait jika file utama HTML/HTM
            $oldExt = strtolower(
                pathinfo($info->file, PATHINFO_EXTENSION)
            );
            if (in_array($oldExt, ['html', 'htm'], true)) {
                $oldBase = pathinfo($info->file, PATHINFO_FILENAME);
                Storage::disk('public')->deleteDirectory(
                    "infos/{$oldBase}_files"
                );
            }
            Storage::disk('public')->delete($info->file);
        }
        $info->delete();
        return back()->with(
            'success',
            'Data berhasil dihapus'
        );
    }

    private function storeHtmlResources(Request $request, ?string $storedHtml): void
    {
        if (
            !$storedHtml ||
            !$request->hasFile('html_files') ||
            !in_array(
                strtolower(pathinfo($storedHtml, PATHINFO_EXTENSION)),
                ['html', 'htm'],
                true
            )
        ) {
            return;
        }

        $paths = array_values($request->input('html_file_paths', []));

        foreach (array_values($request->file('html_files')) as $index => $resource) {
            $relative = $paths[$index] ?? $resource->getClientOriginalName();
            $relative = $this->normalizeHtmlResourcePath($relative);

            if ($relative === null) {
                continue;
            }

            $directory = trim(dirname($relative), '.');
            $filename = basename($relative);
            $targetDirectory = trim('infos/' . $directory, '/');

            $resource->storeAs(
                $targetDirectory,
                $filename,
                'public'
            );
        }
    }

    private function normalizeHtmlResourcePath(string $path): ?string
    {
        $path = ltrim(str_replace('\\', '/', $path), '/');
        $segments = array_values(array_filter(explode('/', $path), 'strlen'));

        $segments = array_values(array_filter(
            $segments,
            fn(string $segment) => !in_array($segment, ['.', '..'], true)
        ));

        if (
            count($segments) > 1 &&
            !str_ends_with(strtolower($segments[0]), '_files')
        ) {
            array_shift($segments);
        }

        if (count($segments) === 0) {
            return null;
        }

        return implode('/', $segments);
    }

    /**
     * Preview HTML / HTM
     */
    public function previewHtml(Info $info)
    {
        abort_unless($info->file, 404);

        return response(
            Storage::disk('public')->get($info->file),
            200,
            [
                'Content-Type' => 'text/html',
            ]
        );
    }

    /**
     * Preview Excel (XLS, XLSX, CSV)
     */
}
