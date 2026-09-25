<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('release_sessions', function (Blueprint $table) {
            $table->id();

            $table->foreignId('release_schedule_id')
                ->constrained('release_schedules')
                ->cascadeOnDelete();

            // Identitas CSO
            $table->string('agent_name');

            // Waktu aktual CSO mulai release
            $table->dateTime('actual_start')->nullable();

            // Waktu aktual CSO selesai release
            $table->dateTime('actual_end')->nullable();

            // Durasi aktual yang digunakan, dalam detik
            $table->unsignedInteger('duration_used_seconds')->default(0);

            /*
         * scheduled
         * active
         * completed
         * missed
         * overtime
         */
            $table->string('status')->default('scheduled');

            $table->timestamps();

            $table->index(['agent_name']);
            $table->index(['status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('release_sessions');
    }
};
