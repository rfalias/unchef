import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { getMe, logout as apiLogout } from "../api/auth";

interface User {
  id: number;
  email: string;
  role: string;
  has_claude_key: boolean;
  is_active: boolean;
  is_superuser: boolean;
}

interface AuthContextValue {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  setToken: (token: string) => void;
  refreshUser: () => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setTokenState] = useState<string | null>(() => localStorage.getItem("token"));
  const [isLoading, setIsLoading] = useState(true);

  const setToken = useCallback((t: string) => {
    localStorage.setItem("token", t);
    setTokenState(t);
  }, []);

  const refreshUser = useCallback(async () => {
    const t = localStorage.getItem("token");
    if (!t) return;
    try {
      const fresh = await getMe(t);
      setUser(fresh);
    } catch {
      // silently ignore — token may still be valid, just a transient error
    }
  }, []);

  const logout = useCallback(() => {
    apiLogout().finally(() => {
      localStorage.removeItem("token");
      setTokenState(null);
      setUser(null);
    });
  }, []);

  useEffect(() => {
    if (!token) {
      setIsLoading(false);
      return;
    }
    getMe(token)
      .then(setUser)
      .catch(() => {
        localStorage.removeItem("token");
        setTokenState(null);
      })
      .finally(() => setIsLoading(false));
  }, [token]);

  return (
    <AuthContext.Provider value={{ user, token, isLoading, setToken, refreshUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
