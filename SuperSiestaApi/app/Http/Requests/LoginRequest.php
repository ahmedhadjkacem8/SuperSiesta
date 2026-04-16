<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Secure Login Request
 * Validates login inputs with security requirements
 */
class LoginRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'email' => [
                'required',
                'email',
                'max:255'
            ],
            'password' => [
                'required',
                'string',
                'min:8',
                'max:255'
            ]
        ];
    }

    public function messages(): array
    {
        return [
            'email.required' => 'L\'email est requis',
            'email.email' => 'L\'email doit être valide',
            'email.max' => 'L\'email ne peut pas dépasser 255 caractères',
            
            'password.required' => 'Le mot de passe est requis',
            'password.min' => 'Le mot de passe doit contenir au moins 8 caractères',
            'password.max' => 'Le mot de passe ne peut pas dépasser 255 caractères'
        ];
    }

    /**
     * Get the validation rules that apply to the request.
     * Override failed validation response to avoid leaking user existence
     */
    protected function failedValidation(\Illuminate\Contracts\Validation\Validator $validator)
    {
        throw new \Illuminate\Validation\ValidationException($validator, response()->json([
            'success' => false,
            'message' => 'Les identifiants fournis sont invalides',
            'data' => $validator->errors()
        ], 422));
    }
}
