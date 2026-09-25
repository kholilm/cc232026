<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PasswordVault extends Model
{
    protected $fillable = [
        'user_id',
        'app_name',
        'username',
        'email',
        'password',
        'notes',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
