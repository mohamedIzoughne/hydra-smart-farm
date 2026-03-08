import { useAuthStore } from "./stores";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
  detail?: string;
  total?: number;
  message?: string;
  page?: number;
  pages?: number;
  simulation?: unknown;
  besoin_genere?: unknown;
  fieldErrors?: Record<string, string>;
  access_token?: string;
  refresh_token?: string;
  user?: unknown;
}

let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;

async function tryRefresh(): Promise<boolean> {
  if (isRefreshing && refreshPromise) return refreshPromise;
  isRefreshing = true;
  refreshPromise = (async () => {
    const rt = useAuthStore.getState().refreshToken;
    if (!rt) return false;
    try {
      const res = await fetch(`${BASE_URL}/auth/refresh`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${rt}`,
        },
      });
      if (!res.ok) return false;
      const json = await res.json();
      if (json.access_token) {
        useAuthStore.getState().setAccessToken(json.access_token);
        return true;
      }
      return false;
    } catch {
      return false;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();
  return refreshPromise;
}

async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit = {},
  _isRetry = false
): Promise<ApiResponse<T>> {
  try {
    const url = `${BASE_URL}${path}`;
    const token = useAuthStore.getState().accessToken;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch(url, { ...options, headers });
    const json = await res.json().catch(() => ({}));

    if (!res.ok) {
      // 401 → try refresh (except for auth endpoints themselves)
      if (
        res.status === 401 &&
        !_isRetry &&
        !path.startsWith("/auth/login") &&
        !path.startsWith("/auth/signup") &&
        !path.startsWith("/auth/refresh")
      ) {
        const refreshed = await tryRefresh();
        if (refreshed) {
          return apiFetch<T>(path, options, true);
        }
        // refresh failed → logout
        useAuthStore.getState().logout();
        return { error: "Session expirée" };
      }

      if (res.status === 403) {
        // Don't redirect, just return the error
        return { error: json.error || "Accès refusé" };
      }

      if (res.status === 422 && json.errors) {
        return { error: json.error || "Erreur de validation", fieldErrors: json.errors };
      }
      return { error: json.error || `Erreur ${res.status}`, detail: json.detail };
    }
    return json;
  } catch {
    return { error: "Impossible de joindre le serveur. Vérifiez que le backend Flask tourne sur le port 5000." };
  }
}

function qs(params?: Record<string, string | number | boolean | undefined>): string {
  if (!params) return "";
  const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== "");
  if (!entries.length) return "";
  return "?" + new URLSearchParams(entries.map(([k, v]) => [k, String(v)])).toString();
}

// ── Auth ──

export const auth = {
  signup: (data: { nom: string; mail: string; mot_de_passe: string }) =>
    apiFetch("/auth/signup", { method: "POST", body: JSON.stringify(data) }),
  login: (data: { mail: string; mot_de_passe: string }) =>
    apiFetch("/auth/login", { method: "POST", body: JSON.stringify(data) }),
  refresh: (refreshToken: string) =>
    apiFetch("/auth/refresh", {
      method: "POST",
      headers: { Authorization: `Bearer ${refreshToken}` },
    }),
  logout: () => apiFetch("/auth/logout", { method: "POST" }),
  me: () => apiFetch("/auth/me"),
  updateProfile: (data: Record<string, unknown>) =>
    apiFetch("/auth/me", { method: "PUT", body: JSON.stringify(data) }),
  changePassword: (data: { ancien_mot_de_passe: string; nouveau_mot_de_passe: string; confirmation: string }) =>
    apiFetch("/auth/change-password", { method: "PUT", body: JSON.stringify(data) }),
};

// ── Resources ──

export const cultures = {
  getAll: (params?: Record<string, string>) => apiFetch(`/cultures${qs(params)}`),
  getById: (id: number) => apiFetch(`/cultures/${id}`),
  create: (data: Record<string, unknown>) => apiFetch("/cultures", { method: "POST", body: JSON.stringify(data) }),
  update: (id: number, data: Record<string, unknown>) => apiFetch(`/cultures/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  delete: (id: number) => apiFetch(`/cultures/${id}`, { method: "DELETE" }),
};

export const parcelles = {
  getAll: (params?: Record<string, string>) => apiFetch(`/parcelles${qs(params)}`),
  getById: (id: number) => apiFetch(`/parcelles/${id}`),
  create: (data: Record<string, unknown>) => apiFetch("/parcelles", { method: "POST", body: JSON.stringify(data) }),
  update: (id: number, data: Record<string, unknown>) => apiFetch(`/parcelles/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  delete: (id: number) => apiFetch(`/parcelles/${id}`, { method: "DELETE" }),
  ouvrirSaison: (id: number, data?: Record<string, unknown>) =>
    apiFetch(`/parcelles/${id}/ouvrir-saison`, { method: "POST", body: JSON.stringify(data || {}) }),
  fermerSaison: (id: number) => apiFetch(`/parcelles/${id}/fermer-saison`, { method: "POST" }),
  historiqueBesoins: (id: number, params?: Record<string, string>) =>
    apiFetch(`/parcelles/${id}/historique-besoins${qs(params)}`),
  historiqueStress: (id: number) => apiFetch(`/parcelles/${id}/historique-stress`),
};

export const mesures = {
  getAll: (params: Record<string, string>) => apiFetch(`/mesures${qs(params)}`),
  getById: (id: number) => apiFetch(`/mesures/${id}`),
  create: (data: Record<string, unknown>) => apiFetch("/mesures", { method: "POST", body: JSON.stringify(data) }),
  update: (id: number, data: Record<string, unknown>) => apiFetch(`/mesures/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  delete: (id: number) => apiFetch(`/mesures/${id}`, { method: "DELETE" }),
};

export const besoins = {
  getAll: (params?: Record<string, string>) => apiFetch(`/besoins${qs(params)}`),
  appliquer: (id: number, volume: number) =>
    apiFetch(`/besoins/${id}/appliquer`, { method: "PUT", body: JSON.stringify({ volume_applique: volume }) }),
  delete: (id: number) => apiFetch(`/besoins/${id}`, { method: "DELETE" }),
};

export const stress = {
  getAll: (params?: Record<string, string>) => apiFetch(`/stress${qs(params)}`),
  getById: (id: number) => apiFetch(`/stress/${id}`),
  simuler: (parcelleId: number) => apiFetch(`/stress/calculer/${parcelleId}`, { method: "POST" }),
  delete: (id: number) => apiFetch(`/stress/${id}`, { method: "DELETE" }),
};

// Legacy named export for backward compat
export const agriculteurs = {
  getAll: () => apiFetch("/agriculteurs"),
  getById: (id: number) => apiFetch(`/agriculteurs/${id}`),
};
