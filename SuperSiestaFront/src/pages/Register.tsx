/**
 * Secure Registration Page
 */

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuthSecure";
import { useNavigate } from "react-router-dom";
import { Loader2, Mail, Lock, User, Phone, AlertCircle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import PasswordStrengthIndicator from "@/components/PasswordStrengthIndicator";
import {
  validateEmail,
  validatePasswordStrength,
  validatePasswordMatch,
  validateFullName,
  validatePhone,
} from "@/lib/validators";

type FormField = "email" | "password" | "passwordConfirm" | "fullName" | "phone" | "accountType";

interface FormErrors {
  email: string[];
  password: string[];
  passwordConfirm: string[];
  fullName: string[];
  phone: string[];
}

export default function Register() {
  const { user, isLoading: authLoading, register } = useAuth();
  const navigate = useNavigate();

  // Form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [accountType, setAccountType] = useState<"btoc" | "btob">("btoc");

  // UI state
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({
    email: [],
    password: [],
    passwordConfirm: [],
    fullName: [],
    phone: [],
  });
  const [touchedFields, setTouchedFields] = useState<Set<FormField>>(new Set());

  // Redirect if already authenticated
  useEffect(() => {
    if (!authLoading && user) {
      navigate("/mon-compte");
    }
  }, [authLoading, user, navigate]);

  /**
   * Validate individual field
   */
  const validateField = (field: FormField, value: string) => {
    const newErrors = { ...errors };

    switch (field) {
      case "email":
        newErrors.email = validateEmail(value).errors;
        break;
      case "password":
        const strength = validatePasswordStrength(value);
        newErrors.password = strength.isValid ? [] : strength.feedback;
        break;
      case "passwordConfirm":
        newErrors.passwordConfirm = validatePasswordMatch(password, value).errors;
        break;
      case "fullName":
        newErrors.fullName = validateFullName(value).errors;
        break;
      case "phone":
        newErrors.phone = validatePhone(value).errors;
        break;
    }

    setErrors(newErrors);
  };

  /**
   * Handle field blur
   */
  const handleBlur = (field: FormField) => {
    setTouchedFields((prev) => new Set(prev).add(field));

    switch (field) {
      case "email":
        validateField("email", email);
        break;
      case "password":
        validateField("password", password);
        break;
      case "passwordConfirm":
        validateField("passwordConfirm", passwordConfirm);
        break;
      case "fullName":
        validateField("fullName", fullName);
        break;
      case "phone":
        validateField("phone", phone);
        break;
    }
  };

  /**
   * Handle field change with live validation
   */
  const handleChange = (field: FormField, value: string) => {
    switch (field) {
      case "email":
        setEmail(value);
        if (touchedFields.has("email")) validateField("email", value);
        break;
      case "password":
        setPassword(value);
        if (touchedFields.has("password")) {
          validateField("password", value);
          // Also validate password confirmation if it's been touched
          if (touchedFields.has("passwordConfirm") && passwordConfirm) {
            validateField("passwordConfirm", passwordConfirm);
          }
        }
        break;
      case "passwordConfirm":
        setPasswordConfirm(value);
        if (touchedFields.has("passwordConfirm")) validateField("passwordConfirm", value);
        break;
      case "fullName":
        setFullName(value);
        if (touchedFields.has("fullName")) validateField("fullName", value);
        break;
      case "phone":
        setPhone(value);
        if (touchedFields.has("phone")) validateField("phone", value);
        break;
    }
  };

  /**
   * Check if form is valid
   */
  const isFormValid = (): boolean => {
    return (
      email &&
      password &&
      passwordConfirm &&
      fullName &&
      errors.email.length === 0 &&
      errors.password.length === 0 &&
      errors.passwordConfirm.length === 0 &&
      errors.fullName.length === 0 &&
      errors.phone.length === 0
    );
  };

  /**
   * Handle form submission
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate all fields
    validateField("email", email);
    validateField("password", password);
    validateField("passwordConfirm", passwordConfirm);
    validateField("fullName", fullName);
    validateField("phone", phone);

    // Mark all fields as touched
    setTouchedFields(
      new Set(["email", "password", "passwordConfirm", "fullName", "phone", "accountType"])
    );

    if (!isFormValid()) {
      toast.error("Veuillez corriger les erreurs du formulaire");
      return;
    }

    setSubmitting(true);
    const result = await register(email, password, fullName, phone, accountType);

    if (result.success) {
      toast.success("Compte créé avec succès! Redirection...");
      setTimeout(() => navigate("/mon-compte"), 1500);
    } else {
      if (result.error?.details) {
        // Handle validation errors from server
        const detailObj = result.error.details as any;
        const serverErrors: FormErrors = {
          email: detailObj.email || [],
          password: detailObj.password || [],
          passwordConfirm: detailObj.password_confirmation || [],
          fullName: detailObj.full_name || [],
          phone: detailObj.phone || [],
        };
        setErrors(serverErrors);
        toast.error("Erreur de validation. Veuillez vérifier les champs.");
      } else {
        toast.error(result.error?.message || "L'inscription a échoué");
      }
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
    <main className="max-w-md mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-black">Créer un compte</h1>
        <p className="text-muted-foreground text-sm mt-2">Rejoignez Super Siesta</p>
      </div>

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

        {/* Full Name Field */}
        <div>
          <label className="text-sm font-bold mb-1 block">Nom complet *</label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={fullName}
              onChange={(e) => handleChange("fullName", e.target.value)}
              onBlur={() => handleBlur("fullName")}
              className={`w-full pl-10 pr-4 py-2.5 border rounded-xl bg-background text-sm focus:outline-none focus:ring-2 ${
                touchedFields.has("fullName")
                  ? errors.fullName.length > 0
                    ? "border-red-500 focus:ring-red-500"
                    : "border-green-500 focus:ring-green-500"
                  : "border-border focus:ring-primary"
              }`}
              placeholder="Votre nom complet"
              required
            />
          </div>
          {touchedFields.has("fullName") && errors.fullName.length > 0 && (
            <div className="mt-1 space-y-1">
              {errors.fullName.map((error) => (
                <p key={error} className="text-xs text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {error}
                </p>
              ))}
            </div>
          )}
        </div>

        {/* Phone Field */}
        <div>
          <label className="text-sm font-bold mb-1 block">Téléphone (optionnel)</label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="tel"
              value={phone}
              onChange={(e) => handleChange("phone", e.target.value)}
              onBlur={() => handleBlur("phone")}
              className={`w-full pl-10 pr-4 py-2.5 border rounded-xl bg-background text-sm focus:outline-none focus:ring-2 ${
                touchedFields.has("phone")
                  ? errors.phone.length > 0
                    ? "border-red-500 focus:ring-red-500"
                    : "border-green-500 focus:ring-green-500"
                  : "border-border focus:ring-primary"
              }`}
              placeholder="+216 XXXXXXXX"
            />
          </div>
          {touchedFields.has("phone") && errors.phone.length > 0 && (
            <div className="mt-1 space-y-1">
              {errors.phone.map((error) => (
                <p key={error} className="text-xs text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {error}
                </p>
              ))}
            </div>
          )}
        </div>

        {/* Account Type */}
        <div>
          <label className="text-sm font-bold mb-2 block">Type de compte *</label>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex items-center p-3 border rounded-xl cursor-pointer hover:bg-accent transition-colors"
              style={{
                borderColor: accountType === "btoc" ? "var(--primary)" : "var(--border)"
              }}
            >
              <input
                type="radio"
                name="accountType"
                value="btoc"
                checked={accountType === "btoc"}
                onChange={(e) => setAccountType(e.target.value as "btoc" | "btob")}
                className="w-4 h-4"
              />
              <span className="ml-2 text-sm font-medium">Particulier</span>
            </label>
            <label className="flex items-center p-3 border rounded-xl cursor-pointer hover:bg-accent transition-colors"
              style={{
                borderColor: accountType === "btob" ? "var(--primary)" : "var(--border)"
              }}
            >
              <input
                type="radio"
                name="accountType"
                value="btob"
                checked={accountType === "btob"}
                onChange={(e) => setAccountType(e.target.value as "btoc" | "btob")}
                className="w-4 h-4"
              />
              <span className="ml-2 text-sm font-medium">Professionnel</span>
            </label>
          </div>
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
              className="w-full pl-10 pr-4 py-2.5 border border-border rounded-xl bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Entrez votre mot de passe"
              required
            />
          </div>
          {password && (
            <div className="mt-3">
              <PasswordStrengthIndicator password={password} showFeedback={true} />
            </div>
          )}
          {touchedFields.has("password") && errors.password.length > 0 && (
            <div className="mt-2 space-y-1">
              {errors.password.map((error) => (
                <p key={error} className="text-xs text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {error}
                </p>
              ))}
            </div>
          )}
        </div>

        {/* Password Confirmation Field */}
        <div>
          <label className="text-sm font-bold mb-1 block">Confirmer le mot de passe *</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="password"
              value={passwordConfirm}
              onChange={(e) => handleChange("passwordConfirm", e.target.value)}
              onBlur={() => handleBlur("passwordConfirm")}
              className={`w-full pl-10 pr-4 py-2.5 border rounded-xl bg-background text-sm focus:outline-none focus:ring-2 ${
                touchedFields.has("passwordConfirm")
                  ? errors.passwordConfirm.length > 0
                    ? "border-red-500 focus:ring-red-500"
                    : passwordConfirm && password === passwordConfirm
                      ? "border-green-500 focus:ring-green-500"
                      : "border-border focus:ring-primary"
                  : "border-border focus:ring-primary"
              }`}
              placeholder="Confirmez votre mot de passe"
              required
            />
          </div>
          {touchedFields.has("passwordConfirm") && (
            <>
              {errors.passwordConfirm.length > 0 ? (
                <div className="mt-1 space-y-1">
                  {errors.passwordConfirm.map((error) => (
                    <p key={error} className="text-xs text-red-600 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {error}
                    </p>
                  ))}
                </div>
              ) : passwordConfirm && password === passwordConfirm ? (
                <p className="mt-1 text-xs text-green-600 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Les mots de passe correspondent
                </p>
              ) : null}
            </>
          )}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={submitting || !isFormValid()}
          className="w-full bg-primary text-primary-foreground font-bold py-3 rounded-xl hover:bg-primary/90 transition-colors text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
          {submitting ? "Création en cours..." : "Créer mon compte"}
        </button>

        {/* Login Link */}
        <p className="text-center text-sm text-muted-foreground">
          Déjà un compte ?{" "}
          <a href="/connexion" className="text-primary font-bold hover:underline">
            Se connecter
          </a>
        </p>
      </form>
    </main>
  );
}
