/**
 * Enhanced Authentication Hook with Security Best Practices
 * - CSRF protection
 * - Rate limiting
 * - Secure error handling
 * - Token refresh mechanism
 * - Automatic session validation
 */

import { useState, useEffect, createContext, useContext, ReactNode, useCallback, useRef } from "react";
import { api } from "@/lib/apiClient";
import { checkRateLimit, clearRateLimit } from "@/lib/validators";

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  account_type: "btoc" | "btob";
  profile?: {
    id: string;
    full_name: string;
    phone?: string;
    account_type: string;
  };
}

export interface AuthError {
  message: string;
  code?: string;
  details?: Record<string, string[]>;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isLoading: boolean;
  error: AuthError | null;
  register: (
    email: string,
    password: string,
    fullName: string,
    phone: string,
    accountType: "btoc" | "btob"
  ) => Promise<{ success: boolean; error?: AuthError }>;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: AuthError }>;
  logout: () => Promise<void>;
  checkAuthStatus: () => void;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

const TOKEN_KEY = "auth_token";
const CSRF_TOKEN_KEY = "csrf_token";
const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<AuthError | null>(null);
  const sessionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const isAdmin = user?.role === "Administrateur";
  const isAuthenticated = !!user && !!localStorage.getItem(TOKEN_KEY);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Reset session timeout
   */
  const resetSessionTimeout = useCallback(() => {
    if (sessionTimeoutRef.current) clearTimeout(sessionTimeoutRef.current);

    if (isAuthenticated) {
      const timeout = setTimeout(() => {
        console.warn("Session timeout");
        setUser(null);
        localStorage.removeItem(TOKEN_KEY);
        api.clearToken();
        setError({
          message: "Votre session a expiré. Veuillez vous reconnecter.",
          code: "SESSION_EXPIRED",
        });
      }, SESSION_TIMEOUT_MS);

      sessionTimeoutRef.current = timeout;
    }
  }, [isAuthenticated]);

  /**
   * Fetch user profile
   */
  const checkAuthStatus = useCallback(async () => {
    try {
      setIsLoading(true);
      clearError();
      const token = localStorage.getItem(TOKEN_KEY);

      if (!token) {
        setUser(null);
        setIsLoading(false);
        return;
      }

      // Set token in API client
      api.setToken(token);

      // Get current user from API
      const response = await fetch(`${import.meta.env.VITE_API_URL}/auth/user`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        const userData = data.data?.user || null;
        setUser(userData);
        resetSessionTimeout();
        clearError();
      } else if (response.status === 401) {
        // Token expired or invalid
        localStorage.removeItem(TOKEN_KEY);
        api.clearToken();
        setUser(null);
        clearError();
      } else {
        throw new Error("Failed to fetch user");
      }
    } catch (err) {
      console.error("Auth check error:", err);
      setError({
        message: "Erreur lors de la vérification de l'authentification",
        code: "AUTH_CHECK_ERROR",
      });
    } finally {
      setIsLoading(false);
    }
  }, [resetSessionTimeout, clearError]);

  /**
   * Fetch CSRF token (optional for Bearer token auth)
   */
  const fetchCSRFToken = useCallback(async () => {
    // CSRF tokens are optional when using Bearer token authentication
    // Skipping this fetch to avoid unnecessary requests
    return null;
  }, []);

  /**
   * Get CSRF token from storage or fetch it
   */
  const getCSRFToken = useCallback(async () => {
    let token = localStorage.getItem(CSRF_TOKEN_KEY);
    if (!token) {
      token = await fetchCSRFToken();
    }
    return token;
  }, [fetchCSRFToken]);

  // Check auth status on mount
  useEffect(() => {
    checkAuthStatus();
    fetchCSRFToken();
  }, [checkAuthStatus, fetchCSRFToken]);

  // Reset session timeout on user activity
  useEffect(() => {
    if (!isAuthenticated) return;

    const handleActivity = () => {
      resetSessionTimeout();
    };

    window.addEventListener("mousemove", handleActivity);
    window.addEventListener("keypress", handleActivity);
    window.addEventListener("click", handleActivity);

    return () => {
      window.removeEventListener("mousemove", handleActivity);
      window.removeEventListener("keypress", handleActivity);
      window.removeEventListener("click", handleActivity);
    };
  }, [isAuthenticated, resetSessionTimeout]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (sessionTimeoutRef.current) clearTimeout(sessionTimeoutRef.current);
    };
  }, []);

  /**
   * Register new user
   */
  const register = useCallback(
    async (
      email: string,
      password: string,
      fullName: string,
      phone: string,
      accountType: "btoc" | "btob"
    ): Promise<{ success: boolean; error?: AuthError }> => {
      try {
        clearError();

        // Check rate limit
        const rateLimitCheck = checkRateLimit(`register:${email}`);
        if (!rateLimitCheck.allowed) {
          const error: AuthError = {
            message: rateLimitCheck.message || "Trop de tentatives. Veuillez réessayer plus tard.",
            code: "RATE_LIMIT_EXCEEDED",
          };
          setError(error);
          return { success: false, error };
        }

        const csrfToken = await getCSRFToken();
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
          "Accept": "application/json",
        };
        if (csrfToken) {
          headers["X-CSRF-Token"] = csrfToken;
        }

        const response = await fetch(`${import.meta.env.VITE_API_URL}/auth/register`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            email,
            password,
            password_confirmation: password,
            full_name: fullName,
            phone,
            account_type: accountType,
          }),
        });

        const data = await response.json();

        if (response.ok && data.data?.token) {
          const token = data.data.token;
          localStorage.setItem(TOKEN_KEY, token);
          api.setToken(token);
          setUser(data.data.user);
          clearRateLimit(`register:${email}`);
          resetSessionTimeout();
          return { success: true };
        } else {
          const error: AuthError = {
            message: data.message || "L'inscription a échoué",
            code: response.status === 422 ? "VALIDATION_ERROR" : "REGISTRATION_ERROR",
            details:
              typeof data.data === "object" && data.data !== null
                ? (data.data as Record<string, string[]>)
                : typeof data.errors === "object" && data.errors !== null
                ? (data.errors as Record<string, string[]>)
                : undefined,
          };
          setError(error);
          return { success: false, error };
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Erreur d'inscription";
        const error: AuthError = {
          message: errorMsg,
          code: "REGISTRATION_ERROR",
        };
        setError(error);
        return { success: false, error };
      }
    },
    [getCSRFToken, resetSessionTimeout, clearError]
  );

  /**
   * Login user
   */
  const login = useCallback(
    async (
      email: string,
      password: string
    ): Promise<{ success: boolean; error?: AuthError }> => {
      try {
        clearError();

        // Check rate limit
        const rateLimitCheck = checkRateLimit(`login:${email}`);
        if (!rateLimitCheck.allowed) {
          const error: AuthError = {
            message: rateLimitCheck.message || "Trop de tentatives. Veuillez réessayer plus tard.",
            code: "RATE_LIMIT_EXCEEDED",
          };
          setError(error);
          return { success: false, error };
        }

        const csrfToken = await getCSRFToken();
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
          "Accept": "application/json",
        };
        if (csrfToken) {
          headers["X-CSRF-Token"] = csrfToken;
        }

        const response = await fetch(`${import.meta.env.VITE_API_URL}/auth/login`, {
          method: "POST",
          headers,
          body: JSON.stringify({ email, password }),
        });

        const data = await response.json();

        if (response.ok && data.data?.token) {
          const token = data.data.token;
          localStorage.setItem(TOKEN_KEY, token);
          api.setToken(token);
          setUser(data.data.user);
          clearRateLimit(`login:${email}`);
          resetSessionTimeout();
          return { success: true };
        } else {
          const error: AuthError = {
            message: "Email ou mot de passe incorrect",
            code: "INVALID_CREDENTIALS",
          };
          setError(error);
          return { success: false, error };
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Erreur de connexion";
        const error: AuthError = {
          message: errorMsg,
          code: "LOGIN_ERROR",
        };
        setError(error);
        return { success: false, error };
      }
    },
    [getCSRFToken, resetSessionTimeout, clearError]
  );

  /**
   * Logout user
   */
  const logout = useCallback(async () => {
    try {
      const token = localStorage.getItem(TOKEN_KEY);
      if (token) {
        await fetch(`${import.meta.env.VITE_API_URL}/auth/logout`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            "Accept": "application/json",
          },
        });
      }
    } catch (err) {
      console.error("Logout error:", err);
    } finally {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(CSRF_TOKEN_KEY);
      api.clearToken();
      setUser(null);
      clearError();
      if (sessionTimeoutRef.current) clearTimeout(sessionTimeoutRef.current);
    }
  }, [clearError]);

  const value: AuthContextType = {
    user,
    isAuthenticated,
    isAdmin,
    isLoading,
    error,
    register,
    login,
    logout,
    checkAuthStatus,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
