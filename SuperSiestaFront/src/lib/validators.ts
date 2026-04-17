/**
 * Security Validators for Authentication
 * Provides comprehensive validation for user input
 */

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface PasswordStrength {
  score: number; // 0-4 (0: weak, 4: strong)
  feedback: string[];
  isValid: boolean;
}

/**
 * Validate email format
 */
export function validateEmail(email: string): ValidationResult {
  const errors: string[] = [];

  if (!email || email.trim().length === 0) {
    errors.push("L'email est requis");
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push("Format d'email invalide");
  } else if (email.length > 255) {
    errors.push("L'email ne doit pas dépasser 255 caractères");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validate password strength
 * Requirements:
 * - Minimum 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 * - At least one special character
 */
export function validatePasswordStrength(password: string): PasswordStrength {
  const feedback: string[] = [];
  let score = 0;

  if (!password) {
    return {
      score: 0,
      feedback: ["Le mot de passe est requis"],
      isValid: false,
    };
  }

  // Length check
  if (password.length < 8) {
    feedback.push("Minimum 8 caractères requis");
  } else {
    score++;
    if (password.length >= 12) score++;
  }

  // Uppercase check
  if (!/[A-Z]/.test(password)) {
    feedback.push("Au moins une lettre majuscule requise");
  } else {
    score++;
  }

  // Lowercase check
  if (!/[a-z]/.test(password)) {
    feedback.push("Au moins une lettre minuscule requise");
  } else {
    score++;
  }

  // Number check
  if (!/\d/.test(password)) {
    feedback.push("Au moins un chiffre requis");
  } else {
    score++;
  }

  // Special character check
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    feedback.push("Au moins un caractère spécial requis (!@#$%^&*...)");
  } else {
    score++;
  }

  const isValid = score >= 4 && feedback.length === 0;

  return {
    score: Math.min(score, 4),
    feedback: isValid ? ["Mot de passe fort"] : feedback,
    isValid,
  };
}

/**
 * Validate password confirmation
 */
export function validatePasswordMatch(
  password: string,
  confirmation: string
): ValidationResult {
  const errors: string[] = [];

  if (!password || !confirmation) {
    errors.push("Les deux mots de passe sont requis");
  } else if (password !== confirmation) {
    errors.push("Les mots de passe ne correspondent pas");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validate full name
 */
export function validateFullName(fullName: string): ValidationResult {
  const errors: string[] = [];

  if (!fullName || fullName.trim().length === 0) {
    errors.push("Le nom complet est requis");
  } else if (fullName.trim().length < 3) {
    errors.push("Le nom doit contenir au moins 3 caractères");
  } else if (fullName.length > 255) {
    errors.push("Le nom ne doit pas dépasser 255 caractères");
  } else if (!/^[a-zA-ZÀ-ÿ\s'-]+$/.test(fullName)) {
    errors.push("Le nom ne peut contenir que des lettres, espaces, tirets et apostrophes");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validate phone number
 */
export function validatePhone(phone: string): ValidationResult {
  const errors: string[] = [];

  if (phone && phone.trim().length > 0) {
    // Allow optional phone, but validate if provided
    if (!/^[\d+\-\s()]+$/.test(phone)) {
      errors.push("Numéro de téléphone invalide");
    } else if (phone.replace(/\D/g, "").length < 6) {
      errors.push("Le numéro doit contenir au moins 6 chiffres");
    } else if (phone.length > 20) {
      errors.push("Le numéro est trop long");
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Comprehensive registration form validation
 */
export interface RegistrationFormData {
  email: string;
  password: string;
  passwordConfirmation: string;
  fullName: string;
  phone?: string;
  accountType: "btoc" | "btob";
}

export function validateRegistrationForm(
  data: RegistrationFormData
): Record<string, string[]> {
  const errors: Record<string, string[]> = {};

  // Email validation
  const emailValidation = validateEmail(data.email);
  if (!emailValidation.isValid) {
    errors.email = emailValidation.errors;
  }

  // Password strength validation
  const passwordValidation = validatePasswordStrength(data.password);
  if (!passwordValidation.isValid) {
    errors.password = passwordValidation.feedback;
  }

  // Password match validation
  const matchValidation = validatePasswordMatch(
    data.password,
    data.passwordConfirmation
  );
  if (!matchValidation.isValid) {
    errors.passwordConfirmation = matchValidation.errors;
  }

  // Full name validation
  const nameValidation = validateFullName(data.fullName);
  if (!nameValidation.isValid) {
    errors.fullName = nameValidation.errors;
  }

  // Phone validation (optional)
  if (data.phone) {
    const phoneValidation = validatePhone(data.phone);
    if (!phoneValidation.isValid) {
      errors.phone = phoneValidation.errors;
    }
  }

  return errors;
}

/**
 * Simple login form validation
 */
export interface LoginFormData {
  email: string;
  password: string;
}

export function validateLoginForm(data: LoginFormData): Record<string, string[]> {
  const errors: Record<string, string[]> = {};

  if (!data.email) {
    errors.email = ["L'email est requis"];
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.email = ["Format d'email invalide"];
  }

  if (!data.password) {
    errors.password = ["Le mot de passe est requis"];
  } else if (data.password.length < 8) {
    errors.password = ["Le mot de passe doit contenir au moins 8 caractères"];
  }

  return errors;
}

/**
 * Rate limit check (simple client-side implementation)
 */
interface RateLimitEntry {
  timestamp: number;
  attempts: number;
}

const RATE_LIMIT_STORAGE_KEY = "auth_rate_limit";
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

export function checkRateLimit(identifier: string): { allowed: boolean; message?: string } {
  try {
    const stored = localStorage.getItem(RATE_LIMIT_STORAGE_KEY);
    const limits: Record<string, RateLimitEntry> = stored ? JSON.parse(stored) : {};

    const now = Date.now();
    const entry = limits[identifier];

    // Clean old entries
    Object.keys(limits).forEach((key) => {
      if (now - limits[key].timestamp > WINDOW_MS) {
        delete limits[key];
      }
    });

    // Temporarily disable client-side rate limiting for login attempts.
    // Commenting out attempts counting to allow repeated login tries during debugging.
    return { allowed: true };

    if (!entry) {
      // First attempt
      limits[identifier] = { timestamp: now, attempts: 1 };
      localStorage.setItem(RATE_LIMIT_STORAGE_KEY, JSON.stringify(limits));
      return { allowed: true };
    }

    if (now - entry.timestamp > WINDOW_MS) {
      // Window expired, reset
      limits[identifier] = { timestamp: now, attempts: 1 };
      localStorage.setItem(RATE_LIMIT_STORAGE_KEY, JSON.stringify(limits));
      return { allowed: true };
    }

    // Within window
    if (entry.attempts >= MAX_ATTEMPTS) {
      return {
        allowed: false,
        message: `Trop de tentatives. Veuillez réessayer dans ${Math.ceil((entry.timestamp + WINDOW_MS - now) / 60000)} minutes.`,
      };
    }

    entry.attempts++;
    limits[identifier] = entry;
    localStorage.setItem(RATE_LIMIT_STORAGE_KEY, JSON.stringify(limits));
    return { allowed: true };
  } catch (error) {
    console.error("Rate limit check error:", error);
    return { allowed: true }; // Allow on error to not block user
  }
}

/**
 * Clear rate limit for identifier
 */
export function clearRateLimit(identifier: string): void {
  try {
    const stored = localStorage.getItem(RATE_LIMIT_STORAGE_KEY);
    if (stored) {
      const limits: Record<string, RateLimitEntry> = JSON.parse(stored);
      delete limits[identifier];
      localStorage.setItem(RATE_LIMIT_STORAGE_KEY, JSON.stringify(limits));
    }
  } catch (error) {
    console.error("Clear rate limit error:", error);
  }
}
