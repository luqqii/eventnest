"use client";

import {
  createContext,
  useContext,
  useEffect,
  useReducer,
  useCallback,
  ReactNode,
} from "react";
import { authApi, ApiUser, extractError, extractFieldErrors } from "@/lib/api";

// ─── State shape ─────────────────────────────────────────────────────────────

interface AuthState {
  user: ApiUser | null;
  accessToken: string | null;
  isLoading: boolean;   // true only during the initial hydration
  isAuthenticated: boolean;
}

type AuthAction =
  | { type: "HYDRATE_START" }
  | { type: "HYDRATE_DONE"; user: ApiUser; token: string }
  | { type: "HYDRATE_FAIL" }
  | { type: "LOGIN"; user: ApiUser; token: string }
  | { type: "LOGOUT" }
  | { type: "UPDATE_USER"; user: ApiUser };

const initialState: AuthState = {
  user: null,
  accessToken: null,
  isLoading: true,
  isAuthenticated: false,
};

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case "HYDRATE_START":
      return { ...state, isLoading: true };
    case "HYDRATE_DONE":
    case "LOGIN":
      return {
        user: action.user,
        accessToken: action.token,
        isLoading: false,
        isAuthenticated: true,
      };
    case "HYDRATE_FAIL":
      return { ...initialState, isLoading: false };
    case "LOGOUT":
      return { ...initialState, isLoading: false };
    case "UPDATE_USER":
      return { ...state, user: action.user };
    default:
      return state;
  }
}

// ─── Context API ──────────────────────────────────────────────────────────────

interface AuthContextValue extends AuthState {
  login: (
    email: string,
    password: string
  ) => Promise<{ ok: boolean; user?: ApiUser; error?: string }>;
  signup: (data: {
    name: string;
    email: string;
    password: string;
    role: "attendee" | "organizer";
  }) => Promise<{ ok: boolean; user?: ApiUser; error?: string; fieldErrors?: Record<string, string> }>;
  logout: () => Promise<void>;
  updateUser: (user: ApiUser) => void;
  loginWithGoogle: (credential: string) => Promise<{ ok: boolean; user?: ApiUser; error?: string }>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// ─── Storage helpers ──────────────────────────────────────────────────────────

const STORAGE_KEY = "eb_user";
const TOKEN_KEY = "eb_token";

/** Also writes plain cookies so Next.js middleware can check auth/roles server-side */
function persistSession(user: ApiUser, token: string) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    localStorage.setItem(TOKEN_KEY, token);
    // 15 min cookie — same lifetime as the access token
    document.cookie = `access_token=${token}; path=/; max-age=900; SameSite=Lax`;
    document.cookie = `user_role=${user.role}; path=/; max-age=900; SameSite=Lax`;
  } catch {
    // private browsing / storage full — silently ignore
  }
}

function clearSession() {
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(TOKEN_KEY);
    document.cookie = "access_token=; path=/; max-age=0";
    document.cookie = "user_role=; path=/; max-age=0";
  } catch {
    // ignore
  }
}

function loadSession(): { user: ApiUser; token: string } | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const token = localStorage.getItem(TOKEN_KEY);
    if (!raw || !token) return null;
    return { user: JSON.parse(raw), token };
  } catch {
    return null;
  }
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  /* Hydrate from localStorage on first mount */
  useEffect(() => {
    dispatch({ type: "HYDRATE_START" });
    const session = loadSession();
    if (session) {
      dispatch({ type: "HYDRATE_DONE", user: session.user, token: session.token });
      // Keep the middleware cookies in sync in case they expired
      try {
        document.cookie = `access_token=${session.token}; path=/; max-age=900; SameSite=Lax`;
        document.cookie = `user_role=${session.user.role}; path=/; max-age=900; SameSite=Lax`;
      } catch {}
    } else {
      dispatch({ type: "HYDRATE_FAIL" });
    }
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await authApi.login({ email, password });
      if (!res.success || !res.data) {
        return { ok: false, error: extractError(res) };
      }
      const { user, accessToken } = res.data;
      persistSession(user, accessToken);
      dispatch({ type: "LOGIN", user, token: accessToken });
      return { ok: true, user };
    },
    []
  );

  const signup = useCallback(
    async (data: {
      name: string;
      email: string;
      password: string;
      role: "attendee" | "organizer";
    }) => {
      const res = await authApi.signup(data);
      if (!res.success || !res.data) {
        return {
          ok: false,
          error: extractError(res),
          fieldErrors: extractFieldErrors(res),
        };
      }
      const { user, accessToken } = res.data;
      persistSession(user, accessToken);
      dispatch({ type: "LOGIN", user, token: accessToken });
      return { ok: true, user };
    },
    []
  );

  const logout = useCallback(async () => {
    if (state.accessToken) {
      await authApi.logout(state.accessToken).catch(() => {});
    }
    clearSession();
    dispatch({ type: "LOGOUT" });
  }, [state.accessToken]);

  const updateUser = useCallback((user: ApiUser) => {
    dispatch({ type: "UPDATE_USER", user });
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
      document.cookie = `user_role=${user.role}; path=/; max-age=900; SameSite=Lax`;
    } catch {}
  }, []);

  const loginWithGoogle = useCallback(
    async (credential: string) => {
      const res = await authApi.googleLogin(credential);
      if (!res.success || !res.data) {
        return { ok: false, error: extractError(res) };
      }
      const { user, accessToken } = res.data;
      persistSession(user, accessToken);
      dispatch({ type: "LOGIN", user, token: accessToken });
      return { ok: true, user };
    },
    []
  );

  return (
    <AuthContext.Provider
      value={{ ...state, login, signup, logout, updateUser, loginWithGoogle }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
