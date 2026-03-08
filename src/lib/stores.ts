import { create } from "zustand";

interface Notification {
  id: string;
  type: "success" | "error" | "info";
  message: string;
}

interface NotificationStore {
  notifications: Notification[];
  notify: (type: Notification["type"], message: string, timeout?: number) => void;
  dismiss: (id: string) => void;
}

export const useNotificationStore = create<NotificationStore>((set) => ({
  notifications: [],
  notify: (type, message, timeout = 4000) => {
    const id = crypto.randomUUID();
    set((s) => ({ notifications: [...s.notifications, { id, type, message }] }));
    setTimeout(() => {
      set((s) => ({ notifications: s.notifications.filter((n) => n.id !== id) }));
    }, timeout);
  },
  dismiss: (id) => set((s) => ({ notifications: s.notifications.filter((n) => n.id !== id) })),
}));

// ── Auth Store ──

export interface AuthUser {
  id_agriculteur: number;
  nom: string;
  mail: string;
  date_inscription?: string;
}

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  login: (user: AuthUser, accessToken: string, refreshToken: string) => void;
  logout: () => void;
  setAccessToken: (token: string) => void;
  setUser: (user: AuthUser) => void;
}

function readStorage<T>(key: string): T | null {
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : null;
  } catch {
    return null;
  }
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: readStorage<AuthUser>("sa_user"),
  accessToken: localStorage.getItem("sa_access_token"),
  refreshToken: localStorage.getItem("sa_refresh_token"),
  get isAuthenticated() {
    // computed on read
    return !!get().accessToken && !!get().user;
  },

  login: (user, accessToken, refreshToken) => {
    localStorage.setItem("sa_user", JSON.stringify(user));
    localStorage.setItem("sa_access_token", accessToken);
    localStorage.setItem("sa_refresh_token", refreshToken);
    set({ user, accessToken, refreshToken });
  },

  logout: () => {
    const token = get().accessToken;
    // Don't call backend in demo mode
    if (token && token !== "demo-access-token-smartagri") {
      const base = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
      fetch(`${base}/auth/logout`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      }).catch(() => {});
    }
    localStorage.removeItem("sa_user");
    localStorage.removeItem("sa_access_token");
    localStorage.removeItem("sa_refresh_token");
    set({ user: null, accessToken: null, refreshToken: null });
  },

  setAccessToken: (token) => {
    localStorage.setItem("sa_access_token", token);
    set({ accessToken: token });
  },

  setUser: (user) => {
    localStorage.setItem("sa_user", JSON.stringify(user));
    set({ user });
  },
}));
