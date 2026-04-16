<?php

namespace App\Http\Controllers\Api;

use Illuminate\Http\JsonResponse;

class BaseController extends \App\Http\Controllers\Controller
{
    public function sendResponse($data, $message = '', $statusCode = 200): JsonResponse
    {
        $response = [
            'success' => true,
            'data' => $data,
            'message' => $message,
        ];

        return response()->json($response, $statusCode);
    }

    public function sendError($error, $errorMessages = [], $code = 404): JsonResponse
    {
        // Handle the case where the second argument is just the status code
        if (is_numeric($errorMessages) && func_num_args() == 2) {
            $code = $errorMessages;
            $errorMessages = [];
        }

        $response = [
            'success' => false,
            'message' => $error,
        ];

        if (!empty($errorMessages)) {
            $response['data'] = $errorMessages;
        }

        return response()->json($response, (int)$code);
    }
}
