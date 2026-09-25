<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ReleaseSession extends Model
{
    protected $fillable = [
        'release_schedule_id',
        'agent_name',
        'actual_start',
        'actual_end',
        'duration_used_seconds',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'actual_start' => 'datetime',
            'actual_end' => 'datetime',
            'duration_used_seconds' => 'integer',
        ];
    }

    /**
     * ============================================================
     * SCHEDULE
     * ============================================================
     */
    public function schedule(): BelongsTo
    {
        return $this->belongsTo(
            ReleaseSchedule::class,
            'release_schedule_id'
        );
    }

    /**
     * ============================================================
     * ACTIVE
     * ============================================================
     */
    public function isActive(): bool
    {
        return $this->status === 'active'
            && $this->actual_start !== null
            && $this->actual_end === null;
    }

    /**
     * ============================================================
     * COMPLETED
     * ============================================================
     */
    public function isCompleted(): bool
    {
        return $this->status === 'completed'
            && $this->actual_end !== null;
    }

    /**
     * ============================================================
     * MISSED
     * ============================================================
     */
    public function isMissed(): bool
    {
        return $this->status === 'missed';
    }

    /**
     * ============================================================
     * OVERTIME
     * ============================================================
     */
    public function isOvertime(): bool
    {
        return $this->status === 'overtime';
    }
}
