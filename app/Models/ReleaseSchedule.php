<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ReleaseSchedule extends Model
{
    protected $fillable = [
        'agent_name',
        'shift',
        'date',
        'type',
        'scheduled_start',
        'scheduled_end',
        'duration_minutes',
        'is_flexible',
        'tolerance_minutes',
        'active',
    ];

    protected $casts = [
        'date' => 'date',
        'is_flexible' => 'boolean',
        'active' => 'boolean',
        'duration_minutes' => 'integer',
        'tolerance_minutes' => 'integer',
    ];

    /**
     * ============================================================
     * SESSIONS
     * ============================================================
     *
     * Satu schedule dapat memiliki histori session.
     */
    public function sessions(): HasMany
    {
        return $this->hasMany(
            ReleaseSession::class
        );
    }

    /**
     * ============================================================
     * HAS HISTORY
     * ============================================================
     *
     * Apakah schedule sudah pernah digunakan
     * oleh Release Monitor?
     */
    public function hasHistory(): bool
    {
        return $this->sessions()->exists();
    }

    /**
     * ============================================================
     * IS FLEXIBLE
     * ============================================================
     */
    public function isFlexible(): bool
    {
        return (bool) $this->is_flexible;
    }

    /**
     * ============================================================
     * IS FIXED
     * ============================================================
     */
    public function isFixed(): bool
    {
        return ! $this->is_flexible;
    }
}
