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
        Schema::create('password_vaults', function (Blueprint $table) {
        $table->id();

        $table->foreignId('user_id')
                ->constrained()
                ->cascadeOnDelete();

        $table->string('app_name');
        

        $table->string('username');
        $table->string('email')->nullable();

        $table->longText('password')->nullable();

        $table->text('notes')->nullable();

        $table->timestamps();
});
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('password_vaults');
    }
};
