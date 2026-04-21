<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Newsletter;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class NewsletterController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        return response()->json(Newsletter::orderBy('created_at', 'desc')->get());
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'email' => 'required|email|unique:newsletters,email',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'L\'adresse email est déjà enregistrée ou invalide.',
                'errors' => $validator->errors()
            ], 422);
        }

        $newsletter = Newsletter::create([
            'email' => $request->email
        ]);

        return response()->json([
            'message' => 'Inscription réussie à la newsletter !',
            'data' => $newsletter
        ], 201);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy($id)
    {
        $newsletter = Newsletter::findOrFail($id);
        $newsletter->delete();

        return response()->json(['message' => 'Email supprimé de la newsletter.']);
    }

    /**
     * Export all emails as CSV.
     */
    public function export()
    {
        $newsletters = Newsletter::orderBy('created_at', 'desc')->get();
        $csvData = "ID,Email,Date d'inscription\n";

        foreach ($newsletters as $newsletter) {
            $csvData .= "{$newsletter->id},{$newsletter->email},{$newsletter->created_at}\n";
        }

        return response($csvData)
            ->header('Content-Type', 'text/csv')
            ->header('Content-Disposition', 'attachment; filename="newsletters.csv"');
    }
}
