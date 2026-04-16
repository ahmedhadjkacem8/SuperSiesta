<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Compteur extends Model
{
    protected $fillable = [
        'type',
        'prefix',
        'suffix',
        'numero',
    ];

    protected $casts = [
        'numero' => 'integer',
    ];

    /**
     * Générer le numéro suivant pour un type donné
     */
    public static function generateNumber(string $type): string
    {
        $compteur = self::where('type', $type)->firstOrFail();
        
        // Incrémenter le compteur
        $numero = $compteur->numero;
        $compteur->increment('numero');

        // Retourner le numéro formaté
        return $compteur->prefix . str_pad($numero, 6, '0', STR_PAD_LEFT) . $compteur->suffix;
    }

    /**
     * Récupérer le prochain numéro sans l'incrémenter
     */
    public static function getNextNumber(string $type): string
    {
        $compteur = self::where('type', $type)->firstOrFail();
        return $compteur->prefix . str_pad($compteur->numero, 6, '0', STR_PAD_LEFT) . $compteur->suffix;
    }
}
