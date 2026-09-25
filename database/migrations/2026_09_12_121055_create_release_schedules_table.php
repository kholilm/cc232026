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
        Schema::create('release_schedules', function (Blueprint $table) {
            $table->id();

            // Identitas CSO dari Finesse
            $table->string('agent_name');

            // Shift CSO pada hari tersebut
            $table->string('shift')->nullable();

            // Tanggal jadwal
            $table->date('date');

            // meal, meal_dzuhur, toilet
            $table->string('type');

            // Untuk release yang memiliki jam tertentu
            $table->time('scheduled_start')->nullable();
            $table->time('scheduled_end')->nullable();

            // Durasi hak release dalam menit
            $table->unsignedInteger('duration_minutes');

            // true = bisa digunakan kapan saja, contoh Toilet
            $table->boolean('is_flexible')->default(false);

            // Toleransi keterlambatan mulai release
            $table->unsignedInteger('tolerance_minutes')->default(5);

            $table->boolean('active')->default(true);

            $table->timestamps();

            $table->index(['agent_name', 'date']);
            $table->index(['date', 'active']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('release_schedules');
    }
};
