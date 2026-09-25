<?php

use App\Http\Controllers\FinesseController;
use App\Http\Controllers\PasswordVaultController;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\InfoController;
use Inertia\Inertia;
use App\Http\Controllers\ReleaseScheduleController;
use App\Http\Controllers\ReleaseSessionController;

Route::match(['get', 'post'], '/register', fn() => abort(404));
// Route::get('/', function () {
//     return redirect()->route('login');
// })->name('home');

Route::get('/', [InfoController::class, 'dashboard'])->name('home');
Route::get('/dashboard', [InfoController::class, 'dashboard'])->name('dashboard');
// Route::resource('info', InfoController::class);

Route::get('/info', [InfoController::class, 'index'])->name('info.index');
Route::middleware(['auth', 'verified'])->group(function () {
    // Route::inertia('dashboard', 'dashboard')->name('dashboard');
    Route::resource('permission', App\Http\Controllers\Auth\PermissionController::class)->names('permission')->middleware('permission:auth.permission');
    Route::resource('role', App\Http\Controllers\Auth\RoleController::class)->names('role')->middleware('permission:auth.role');
    Route::resource('user', App\Http\Controllers\Auth\UserController::class)->names('user')->middleware('permission:auth.user');
    Route::resource('migration', App\Http\Controllers\Auth\MigrationController::class)->names('migration')->middleware('permission:auth.migration');
    Route::get('migration-download', [App\Http\Controllers\Auth\MigrationController::class, 'download'])->name('migration.download')->middleware('permission:auth.migration');
    Route::resource('session', App\Http\Controllers\Auth\SessionController::class)->names('session')->middleware('permission:auth.session');

    Route::get('/info/create', [InfoController::class, 'create'])->name('info.create');
    Route::post('/info', [InfoController::class, 'store'])->name('info.store');
    Route::post('/info/{info}/html-resources', [InfoController::class, 'uploadHtmlResources'])->name('info.html-resources');
    Route::get('/info/{info}/edit', [InfoController::class, 'edit'])->name('info.edit');
    Route::put('/info/{info}', [InfoController::class, 'update'])->name('info.update');
    Route::delete('/info/{info}', [InfoController::class, 'destroy'])->name('info.destroy');

    Route::resource('password', PasswordVaultController::class)
    ->parameters([
        'password' => 'passwordVault',
    ])
    ->names([
        'index' => 'vault.index',
        'create' => 'vault.create',
        'store' => 'vault.store',
        'show' => 'vault.show',
        'edit' => 'vault.edit',
        'update' => 'vault.update',
        'destroy' => 'vault.destroy',
    ])->middleware('auth');

    Route::get('/password/{passwordVault}/view-password',
    [PasswordVaultController::class, 'viewPassword']
    )->middleware('auth');

    // ==========================================
    // RELEASE SCHEDULE
    // ==========================================

    // Route::resource(
    //     'release-schedule',
    //     ReleaseScheduleController::class
    // )->except(['show']);

   });


    Route::get('/info/{info}', [InfoController::class, 'show'])->name('info.show');
    Route::get('/preview-html/{info}', [InfoController::class, 'previewHtml']);

/*
|--------------------------------------------------------------------------
| Finesse / Release Monitor
|--------------------------------------------------------------------------
*/

    Route::get('/finesse/release-monitor', function () {
        return Inertia::render('Finesse/ReleaseMonitor');
    })->name('finesse.release-monitor');


/*
Finesse API
*/

    Route::get(
        '/api/finesse/balikpapan',
        [FinesseController::class, 'balikpapan']
    )->name('finesse.balikpapan');


    Route::get(
        '/api/finesse/digital',
        [FinesseController::class, 'digital']
    )->name('finesse.digital');


    Route::get(
        '/api/finesse/combined',
        [FinesseController::class, 'combined']
    )->name('finesse.combined');

    /*
     * Release Schedule
     *
     * - Index: PUBLIC (guest + user + admin).
     *   Tidak memakai middleware apa pun, hanya menampilkan jadwal.
     * - Create/Store/Edit/Update/Destroy: ADMIN ONLY.
     *   Memakai permission existing (Spatie) dengan pola yang sama
     *   seperti menu Info (permission:auth.info.*).
     *
     * Controller juga memverifikasi permission yang sama
     * (defense in depth) agar tidak bisa ditembus lewat URL langsung.
     */
    Route::get(
        '/release-schedule',
        [ReleaseScheduleController::class, 'index']
    )->name('release-schedule.index');

    /*
     * Create/Store/Edit/Update/Destroy WAJIB login (auth + verified),
     * sama seperti menu admin lain (Info/Role/User). Tanpa middleware
     * auth, sebuah request akan melempar 403 Symfony mentah ketika
     * permission tidak lolos, dan authorize bergantung pada session
     * guard yang tidak selalu ter-resolve konsisten.
     */
    Route::middleware(['auth', 'verified'])->group(function () {
        Route::middleware('permission:auth.release-schedule.create')
            ->group(function () {
                Route::get(
                    '/release-schedule/create',
                    [ReleaseScheduleController::class, 'create']
                )->name('release-schedule.create');

                Route::post(
                    '/release-schedule',
                    [ReleaseScheduleController::class, 'store']
                )->name('release-schedule.store');
            });

        Route::middleware('permission:auth.release-schedule.update')
            ->group(function () {
                Route::get(
                    '/release-schedule/{release_schedule}/edit',
                    [ReleaseScheduleController::class, 'edit']
                )->name('release-schedule.edit');

                Route::put(
                    '/release-schedule/{release_schedule}',
                    [ReleaseScheduleController::class, 'update']
                )->name('release-schedule.update');

                Route::patch(
                    '/release-schedule/{release_schedule}',
                    [ReleaseScheduleController::class, 'update']
                )->name('release-schedule.update.patch');
            });

        Route::delete(
            '/release-schedule/{release_schedule}',
            [ReleaseScheduleController::class, 'destroy']
        )
            ->middleware('permission:auth.release-schedule.delete')
            ->name('release-schedule.destroy');
    });

    Route::prefix('release-session')
    ->name('release-session.')
    ->controller(ReleaseSessionController::class)
    ->group(function () {
        Route::get('/', 'index')
            ->name('index');

        Route::post('/sync', 'syncFromFinesse')
            ->name('sync');

        Route::get('/{releaseSchedule}/status', 'status')
            ->name('status');
    });

require __DIR__ . '/settings.php';
