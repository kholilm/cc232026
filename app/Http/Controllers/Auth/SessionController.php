<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\Session;
use Illuminate\Http\Request;
use Inertia\Inertia;

class SessionController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
{
    $search = request()->search;
    $limit = request()->limit ?? 10;
    $sort = request()->sort ?? 'last_activity';
    $direction = request()->direction ?? 'desc';

    $sessions = Session::select([
            'user_id',
            'ip_address',
            'user_agent',
            'last_activity',
        ])
        ->with(['user:id,name,email'])
        ->when($search, function ($query, $search) {
            $query->where(function ($q) use ($search) {
                $q->where('ip_address', 'like', "%{$search}%")
                    ->orWhere('user_agent', 'like', "%{$search}%")
                    ->orWhereHas('user', function ($user) use ($search) {
                        $user->where('name', 'like', "%{$search}%")
                             ->orWhere('email', 'like', "%{$search}%");
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

    return Inertia::render('admin/session-index', [
        'sessions' => $sessions,
        'search' => $search ?? '',
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
        //
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
    public function show(Session $session)
    {
        //
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(Session $session)
    {
        //
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Session $session)
    {
        //
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Session $session)
    {
        //
    }
}
