import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { LoginRequest, LoginResponse, User } from "@praditacare/shared";
import { Api, GetToken, OnUnauthorized, TokenKey } from "../api/Client";

interface AuthState {
  User: User | null;
  IsLoading: boolean;
  Login: (request: LoginRequest) => Promise<User>;
  Logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

function SaveToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TokenKey, token);
    else localStorage.removeItem(TokenKey);
  } catch {
    return;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const Logout = useCallback(() => {
    SaveToken(null);
    setUser(null);
  }, []);

  useEffect(() => {
    OnUnauthorized(Logout);
    if (!GetToken()) {
      setIsLoading(false);
      return;
    }
    Api.Get<User>("/auth/me")
      .then(setUser)
      .catch(() => SaveToken(null))
      .finally(() => setIsLoading(false));
  }, [Logout]);

  const Login = useCallback(async (request: LoginRequest) => {
    const response = await Api.Send<LoginResponse>("POST", "/auth/login", request);
    SaveToken(response.AccessToken);
    setUser(response.User);
    return response.User;
  }, []);

  return <AuthContext.Provider value={{ User: user, IsLoading: isLoading, Login, Logout }}>{children}</AuthContext.Provider>;
}

export function UseAuth(): AuthState {
  const context = useContext(AuthContext);
  if (!context) throw new Error("UseAuth harus dipakai di dalam AuthProvider");
  return context;
}

export function HomePathFor(user: User): string {
  if (user.Role === "STUDENT") return "/tiket-saya";
  if (user.Role === "STAFF") return "/antrian";
  return "/dashboard";
}
