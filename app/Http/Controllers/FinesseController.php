<?php

namespace App\Http\Controllers;

use App\Services\FinesseService;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;
use Throwable;

class FinesseController extends Controller
{
    public function __construct(
        private FinesseService $finesseService
    ) {}

    public function balikpapan(): JsonResponse
    {
        try {
            $agents = $this->finesseService->getAgents(23);

            return response()->json([
                'success' => true,
                'unit' => 23,
                'total' => count($agents),
                'agents' => $agents,
                'timestamp' => now()->toIso8601String(),
            ]);
        } catch (Throwable $e) {
            Log::error('FINESSE VOICE ERROR', [
                'message' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
            ]);

            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 502);
        }
    }

    public function digital(): JsonResponse
    {
        try {
            $agents = $this->finesseService->getDigital(23);

            return response()->json([
                'success' => true,
                'unit' => 23,
                'total' => count($agents),
                'digital' => $agents,
                'timestamp' => now()->toIso8601String(),
            ]);
        } catch (Throwable $e) {
            Log::error('FINESSE DIGITAL ERROR', [
                'message' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
            ]);

            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 502);
        }
    }

    public function combined(): JsonResponse
    {
        try {
            $agents = $this->finesseService->getCombined(23);

            return response()->json([
                'success' => true,
                'unit' => 23,
                'total' => count($agents),
                'agents' => $agents,
                'timestamp' => now()->toIso8601String(),
            ]);
        } catch (Throwable $e) {
            Log::error('FINESSE COMBINED ERROR', [
                'message' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
            ]);

            return response()->json([
                'success' => false,
                'message' => $e->getMessage(),
            ], 502);
        }
    }
}
