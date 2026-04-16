<?php

namespace App\Http\Controllers\Api;

use App\Models\TreasuryEntry;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class TreasuryEntryController extends BaseController
{
    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', TreasuryEntry::class);

        $query = TreasuryEntry::query();

        if ($request->has('type')) {
            $query->where('type', $request->type);
        }

        if ($request->has('category')) {
            $query->where('category', $request->category);
        }

        if ($request->has('start_date') && $request->has('end_date')) {
            $query->whereBetween('entry_date', [
                $request->start_date,
                $request->end_date,
            ]);
        }

        $entries = $query->orderBy('entry_date', 'desc')->paginate($request->get('per_page', 20));

        return $this->sendResponse($entries, 'Treasury entries retrieved successfully');
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorize('create', TreasuryEntry::class);

        $validated = $request->validate([
            'type' => 'required|in:entrée,sortie',
            'category' => 'required|string|max:100',
            'amount' => 'required|numeric|min:0',
            'description' => 'nullable|string',
            'reference' => 'nullable|string|max:100',
            'entry_date' => 'required|date',
        ]);

        $entry = TreasuryEntry::create($validated);

        return $this->sendResponse($entry, 'Treasury entry created successfully', 201);
    }

    public function update(Request $request, TreasuryEntry $entry): JsonResponse
    {
        $this->authorize('update', $entry);

        $validated = $request->validate([
            'type' => 'in:entrée,sortie',
            'category' => 'string|max:100',
            'amount' => 'numeric|min:0',
            'description' => 'nullable|string',
            'reference' => 'nullable|string|max:100',
            'entry_date' => 'date',
        ]);

        $entry->update($validated);

        return $this->sendResponse($entry, 'Treasury entry updated successfully');
    }

    public function destroy(TreasuryEntry $entry): JsonResponse
    {
        $this->authorize('delete', $entry);

        $entry->delete();

        return $this->sendResponse(null, 'Treasury entry deleted successfully');
    }

    public function summary(Request $request): JsonResponse
    {
        $this->authorize('viewAny', TreasuryEntry::class);

        $query = TreasuryEntry::query();

        if ($request->has('start_date') && $request->has('end_date')) {
            $query->whereBetween('entry_date', [
                $request->start_date,
                $request->end_date,
            ]);
        }

        $income = $query->where('type', 'entrée')->sum('amount');
        $expenses = $query->where('type', 'sortie')->sum('amount');
        $balance = $income - $expenses;

        return $this->sendResponse([
            'income' => $income,
            'expenses' => $expenses,
            'balance' => $balance,
        ], 'Treasury summary retrieved successfully');
    }
}
