/**
 * Secure Login Page
 * - Input validation
 * - Rate limiting
 * - Secure error handling
 * - Auto-redirect on success
 */

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuthSecure";
import { useNavigate } from "react-router-dom";
import { Loader2, Mail, Lock, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { validateEmail, validateLoginForm } from "@/lib/validators";

interface FormErrors {
  email: string[];
  password: string[];
}

export default function Connexion() {
  const { user, isLoading: authLoading, login, error: authError, clearError } = useAuth();
  const navigate = useNavigate();

  // Form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // UI state
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({ email: [], password: [] });
  const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set());

  // Redirect if already authenticated
  useEffect(() => {
    if (!authLoading && user) {
      navigate("/mon-compte");
    }
  }, [authLoading, user, navigate]);

  /**
   * Validate email field
   */
  const validateEmailField = (value: string) => {
    const result = validateEmail(value);
    setErrors((prev) => ({ ...prev, email: result.errors }));
  };

  /**
   * Validate password field
   */
  const validatePasswordField = (value: string) => {
    const errors: string[] = [];
    if (!value) {
      errors.push("Le mot de passe est requis");
    } else if (value.length < 8) {
      errors.push("Le mot de passe doit contenir au moins 8 caractères");
    }
    setErrors((prev) => ({ ...prev, password: errors }));
  };

  /**
   * Handle field blur
   */
  const handleBlur = (field: "email" | "password") => {
    setTouchedFields((prev) => new Set(prev).add(field));

    if (field === "email") {
      validateEmailField(email);
    } else {
      validatePasswordField(password);
    }
  };

  /**
   * Handle field change
   */
  const handleChange = (field: "email" | "password", value: string) => {
    if (field === "email") {
      setEmail(value);
      if (touchedFields.has("email")) validateEmailField(value);
    } else {
      setPassword(value);
      if (touchedFields.has("password")) validatePasswordField(value);
    }
  };

  /**
   * Check if form is valid
   */
  const isFormValid = (): boolean => {
    return email && password && errors.email.length === 0 && errors.password.length === 0;
  };

  /**
   * Handle form submission
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    // Validate all fields
    validateEmailField(email);
    validatePasswordField(password);

    // Mark all fields as touched
    setTouchedFields(new Set(["email", "password"]));

    // Validate form
    const formErrors = validateLoginForm({ email, password });
    if (Object.keys(formErrors).length > 0) {
      toast.error("Veuillez corriger les erreurs du formulaire");
      setErrors({
        email: formErrors.email || [],
        password: formErrors.password || [],
      });
      return;
    }

    setSubmitting(true);
    const result = await login(email, password);

    if (result.success) {
      toast.success("Connexion réussie!");
      setTimeout(() => navigate("/mon-compte"), 1000);
    } else {
      // Error is already set in auth context and shown as toast
      toast.error(result.error?.message || "Connexion échouée");
    }

    setSubmitting(false);
  };

  if (authLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </main>
    );
  }

  return (
    <main className="max-w-md mx-auto px-4 py-16">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-black">Connexion</h1>
        <p className="text-muted-foreground text-sm mt-2">Accédez à votre espace client</p>
      </div>

      {authError && authError.code === "RATE_LIMIT_EXCEEDED" && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-800">Trop de tentatives</p>
            <p className="text-sm text-red-700 mt-1">{authError.message}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-card border border-border rounded-2xl p-6 space-y-4">
        {/* Email Field */}
        <div>
          <label className="text-sm font-bold mb-1 block">Email *</label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="email"
              value={email}
              onChange={(e) => handleChange("email", e.target.value)}
              onBlur={() => handleBlur("email")}
              className={`w-full pl-10 pr-4 py-2.5 border rounded-xl bg-background text-sm focus:outline-none focus:ring-2 ${
                touchedFields.has("email")
                  ? errors.email.length > 0
                    ? "border-red-500 focus:ring-red-500"
                    : "border-green-500 focus:ring-green-500"
                  : "border-border focus:ring-primary"
              }`}
              placeholder="email@exemple.com"
              required
              autoComplete="email"
            />
          </div>
          {touchedFields.has("email") && errors.email.length > 0 && (
            <div className="mt-1 space-y-1">
              {errors.email.map((error) => (
                <p key={error} className="text-xs text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {error}
                </p>
              ))}
            </div>
          )}
        </div>

        {/* Password Field */}
        <div>
          <label className="text-sm font-bold mb-1 block">Mot de passe *</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="password"
              value={password}
              onChange={(e) => handleChange("password", e.target.value)}
              onBlur={() => handleBlur("password")}
              className={`w-full pl-10 pr-4 py-2.5 border rounded-xl bg-background text-sm focus:outline-none focus:ring-2 ${
                touchedFields.has("password")
                  ? errors.password.length > 0
                    ? "border-red-500 focus:ring-red-500"
                    : "border-green-500 focus:ring-green-500"
                  : "border-border focus:ring-primary"
              }`}
              placeholder="Entrez votre mot de passe"
              required
              autoComplete="current-password"
            />
          </div>
          {touchedFields.has("password") && errors.password.length > 0 && (
            <div className="mt-1 space-y-1">
              {errors.password.map((error) => (
                <p key={error} className="text-xs text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {error}
                </p>
              ))}
            </div>
          )}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={submitting || !isFormValid()}
          className="w-full bg-primary text-primary-foreground font-bold py-3 rounded-xl hover:bg-primary/90 transition-colors text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
          {submitting ? "Connexion en cours..." : "Se connecter"}
        </button>

        {/* Registration Link */}
        <p className="text-center text-sm text-muted-foreground">
          Pas encore de compte ?{" "}
          <a href="/register" className="text-primary font-bold hover:underline">
            S'inscrire
          </a>
        </p>
      </form>

      {/* Password Recovery Link (optional) */}
      <div className="text-center mt-4">
        <a href="#" className="text-xs text-muted-foreground hover:text-primary transition-colors">
          Mot de passe oublié ?
        </a>
      </div>
    </main>
  );
}
