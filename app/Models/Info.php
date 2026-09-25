<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Info extends Model
{
    protected $fillable = [
        'title',
        'description',
        'type',
        'file',
        'html_folder',
    ];
}
