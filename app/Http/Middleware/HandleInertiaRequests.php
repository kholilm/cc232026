<?php

namespace App\Http\Middleware;

use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    protected $rootView = 'app';


    public function share(Request $request): array
    {
        return [
            ...parent::share($request),

            'name' => config('app.name'),

            'auth' => [
                'user' => $request->user(),

                'permissions' => $request->user()
                    ? $request->user()
                        ->getAllPermissions()
                        ->pluck('name')
                        ->values()
                    : [],
            ],

            'sidebarOpen' => 
                ! $request->hasCookie('sidebar_state') ||
                $request->cookie('sidebar_state') === 'true',

            'flash' => [
                'success' => fn() =>
                    session('success')
                    ? [
                        'message' => session('success'),
                        'id' => uniqid()
                    ]
                    : null,

                'error' => fn() =>
                    session('error')
                    ? [
                        'message' => session('error'),
                        'id' => uniqid()
                    ]
                    : null,
            ],
        ];
    }
}