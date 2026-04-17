<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\Password;

/**
 * Secure Registration Request
 * Validates all registration inputs with security requirements
 */
class RegisterRequest extends FormRequest
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
                'unique:users,email',
                'max:255'
            ],
            'password' => [
                'required',
                'confirmed',
                Password::min(8)
                    ->mixedCase()
                    ->numbers()
            ],
            'password_confirmation' => [
                'required',
                'same:password'
            ],
            'full_name' => [
                'required',
                'string',
                'min:3',
                'max:255',
                'regex:/^[a-zA-ZÀ-ÿ\s\'-]+$/'
            ],
            'phone' => [
                'sometimes',
                'nullable',
                'string',
                'regex:/^[+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,9}$/',
                'max:20'
            ],
            'account_type' => [
                'required',
                'in:btoc,btob'
            ],
            'is_admin' => [
                'sometimes',
                'boolean'
            ]
        ];
    }

    public function messages(): array
    {
        return [
            'email.required' => 'L\'email est requis',
            'email.email' => 'L\'email doit être valide',
            'email.unique' => 'Cet email est déjà enregistré',
            'email.max' => 'L\'email ne peut pas dépasser 255 caractères',
            
            'password.required' => 'Le mot de passe est requis',
            'password.confirmed' => 'Les mots de passe ne correspondent pas',
            'password.min' => 'Le mot de passe doit contenir au moins 8 caractères',
            'password.mixed_case' => 'Le mot de passe doit contenir des majuscules et des minuscules',
            'password.numbers' => 'Le mot de passe doit contenir au moins un chiffre',
            // caractères spéciaux non obligatoires désormais
            
            'full_name.required' => 'Le nom complet est requis',
            'full_name.min' => 'Le nom doit contenir au moins 3 caractères',
            'full_name.max' => 'Le nom ne peut pas dépasser 255 caractères',
            'full_name.regex' => 'Le nom ne peut contenir que des lettres, espaces, tirets et apostrophes',
            
            'phone.regex' => 'Le numéro de téléphone est invalide',
            'phone.max' => 'Le numéro est trop long',
            
            'account_type.required' => 'Le type de compte est requis',
            'account_type.in' => 'Le type de compte doit être "btoc" ou "btob"'
        ];
    }
}
