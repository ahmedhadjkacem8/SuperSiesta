import { useState, useEffect, createContext, useContext, ReactNode } from "react";
import { api } from "@/lib/apiClient";

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

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isLoading: boolean;
  error: string | null;
  register: (
    email: string,
    password: string,
    fullName: string,
    phone: string,
    accountType: "btoc" | "btob"
  ) => Promise<{ success: boolean; error?: string }>;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  checkAuthStatus: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

const TOKEN_KEY = "auth_token";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isAdmin = user?.role === "Administrateur";
  const isAuthenticated = !!user && !!localStorage.getItem(TOKEN_KEY);

  // Check auth status on mount and when token changes
  const checkAuthStatus = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem(TOKEN_KEY);

      if (!token) {
        setUser(null);
        setError(null);
        setIsLoading(false);
        return;
      }

      // Set token in API client
      api.setToken(token);

      // Get current user from API
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/user`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.data?.user || null);
        setError(null);
      } else if (response.status === 401) {
        // Token expired or invalid
        localStorage.removeItem(TOKEN_KEY);
        api.clearToken();
        setUser(null);
        setError(null);
      } else {
        setError("Failed to fetch user");
      }
    } catch (err) {
      console.error("Auth check error:", err);
      setError("Failed to check authentication status");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const register = async (
    email: string,
    password: string,
    fullName: string,
    phone: string,
    accountType: "btoc" | "btob"
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      setError(null);
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
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
        return { success: true };
      } else {
        const errorMsg = data.message || "Registration failed";
        setError(errorMsg);
        return { success: false, error: errorMsg };
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Registration error";
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }
  };

  const login = async (
    email: string,
    password: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      setError(null);
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const data = await response.json();

      if (response.ok && data.data?.token) {
        const token = data.data.token;
        localStorage.setItem(TOKEN_KEY, token);
        api.setToken(token);
        setUser(data.data.user);
        return { success: true };
      } else {
        const errorMsg = data.message || "Login failed";
        setError(errorMsg);
        return { success: false, error: errorMsg };
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Login error";
      setError(errorMsg);
      return { success: false, error: errorMsg };
    }
  };

  const logout = async () => {
    try {
      const token = localStorage.getItem(TOKEN_KEY);
      if (token) {
        await fetch(`${import.meta.env.VITE_API_URL}/api/auth/logout`, {
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
      api.clearToken();
      setUser(null);
      setError(null);
    }
  };

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
