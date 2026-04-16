/**
 * Password Strength Indicator Component
 */

import { useEffect, useState } from "react";
import { validatePasswordStrength, PasswordStrength } from "@/lib/validators";
import { Check, X } from "lucide-react";

export interface PasswordStrengthIndicatorProps {
  password: string;
  showFeedback?: boolean;
}

export default function PasswordStrengthIndicator({
  password,
  showFeedback = true,
}: PasswordStrengthIndicatorProps) {
  const [strength, setStrength] = useState<PasswordStrength>({
    score: 0,
    feedback: [],
    isValid: false,
  });

  useEffect(() => {
    if (password) {
      setStrength(validatePasswordStrength(password));
    } else {
      setStrength({
        score: 0,
        feedback: [],
        isValid: false,
      });
    }
  }, [password]);

  const getStrengthColor = () => {
    if (strength.score === 0) return "bg-gray-300";
    if (strength.score === 1) return "bg-red-500";
    if (strength.score === 2) return "bg-orange-500";
    if (strength.score === 3) return "bg-yellow-500";
    return "bg-green-500";
  };

  const getStrengthLabel = () => {
    if (strength.score === 0) return "Aucun mot de passe";
    if (strength.score === 1) return "Faible";
    if (strength.score === 2) return "Moyen";
    if (strength.score === 3) return "Bon";
    return "Fort";
  };

  return (
    <div className="space-y-2">
      {/* Strength bar */}
      <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-300 ${getStrengthColor()}`}
          style={{
            width: `${(strength.score / 4) * 100}%`,
          }}
        />
      </div>

      {/* Strength label */}
      {password && (
        <div className="flex justify-between items-center text-xs">
          <span className="text-muted-foreground">Force du mot de passe:</span>
          <span className={`font-semibold ${strength.isValid ? "text-green-600" : "text-orange-600"}`}>
            {getStrengthLabel()}
          </span>
        </div>
      )}

      {/* Feedback */}
      {showFeedback && password && strength.feedback.length > 0 && (
        <ul className="text-xs space-y-1">
          {strength.feedback.map((feedback, index) => (
            <li
              key={index}
              className={`flex items-center gap-1.5 ${strength.isValid ? "text-green-600" : "text-orange-600"}`}
            >
              {strength.isValid ? (
                <Check className="w-3 h-3" />
              ) : (
                <X className="w-3 h-3" />
              )}
              {feedback}
            </li>
          ))}
        </ul>
      )}

      {/* Requirements when empty */}
      {!password && (
        <ul className="text-xs text-muted-foreground space-y-1">
          <li className="flex items-center gap-1.5">
            <span className="w-3 h-3 border border-current rounded-full" />
            Minimum 8 caractères
          </li>
          <li className="flex items-center gap-1.5">
            <span className="w-3 h-3 border border-current rounded-full" />
            Une lettre majuscule et minuscule
          </li>
          <li className="flex items-center gap-1.5">
            <span className="w-3 h-3 border border-current rounded-full" />
            Un chiffre et un caractère spécial
          </li>
        </ul>
      )}
    </div>
  );
}
