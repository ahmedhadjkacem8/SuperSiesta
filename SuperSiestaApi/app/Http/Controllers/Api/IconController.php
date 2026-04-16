<?php

namespace App\Http\Controllers\Api;

use App\Models\Icon;
use Illuminate\Http\JsonResponse;

class IconController extends BaseController
{
    public function index(): JsonResponse
    {
        return $this->sendResponse(Icon::all(), 'Icons retrieved successfully');
    }
}
