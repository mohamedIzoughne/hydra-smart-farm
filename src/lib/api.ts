import { useAuthStore } from "./stores";
import {
  isDemoMode, DEMO_USER, DEMO_CULTURES, DEMO_PARCELLES,
  DEMO_MESURES, DEMO_BESOINS, DEMO_STRESS, filterByParcelle,
} from "./demo-data";

// Use relative /api URL to leverage Vite proxy in development.
const BASE_URL = import.meta.env.VITE_API_URL || "/api";

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
  if (isDemoMode()) return true;
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
        useAuthStore.getState().logout();
        return { error: "Session expirée" };
      }

      if (res.status === 403) {
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

// ── Demo-aware wrapper: tries real API, falls back to demo data ──

function demoOr<T>(realCall: () => Promise<ApiResponse<T>>, demoFallback: () => ApiResponse<T>): Promise<ApiResponse<T>> {
  if (isDemoMode()) {
    return Promise.resolve(demoFallback());
  }
  return realCall();
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
  me: () => demoOr(
    () => apiFetch("/auth/me"),
    () => ({ data: DEMO_USER as unknown })
  ),
  updateProfile: (data: Record<string, unknown>) => demoOr(
    () => apiFetch("/auth/me", { method: "PUT", body: JSON.stringify(data) }),
    () => {
      const updated = { ...DEMO_USER, ...data };
      return { data: updated as unknown };
    }
  ),
  changePassword: (data: { ancien_mot_de_passe: string; nouveau_mot_de_passe: string; confirmation: string }) => demoOr(
    () => apiFetch("/auth/change-password", { method: "PUT", body: JSON.stringify(data) }),
    () => ({ message: "Mot de passe modifié (démo)" })
  ),
};

// ── Cultures ──

let demoCultures = [...DEMO_CULTURES];
let nextCultureId = 100;

export const cultures = {
  getAll: (params?: Record<string, string>) => demoOr(
    () => apiFetch(`/cultures${qs(params)}`),
    () => ({ data: demoCultures as unknown, total: demoCultures.length })
  ),
  getById: (id: number) => demoOr(
    () => apiFetch(`/cultures/${id}`),
    () => ({ data: demoCultures.find(c => c.id_culture === id) as unknown })
  ),
  create: (data: Record<string, unknown>) => demoOr(
    () => apiFetch("/cultures", { method: "POST", body: JSON.stringify(data) }),
    () => {
      const c = { id_culture: nextCultureId++, ...data } as typeof DEMO_CULTURES[0];
      demoCultures.push(c);
      return { data: c as unknown };
    }
  ),
  update: (id: number, data: Record<string, unknown>) => demoOr(
    () => apiFetch(`/cultures/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    () => {
      const idx = demoCultures.findIndex(c => c.id_culture === id);
      if (idx >= 0) demoCultures[idx] = { ...demoCultures[idx], ...data } as typeof DEMO_CULTURES[0];
      return { data: demoCultures[idx] as unknown };
    }
  ),
  delete: (id: number) => demoOr(
    () => apiFetch(`/cultures/${id}`, { method: "DELETE" }),
    () => {
      demoCultures = demoCultures.filter(c => c.id_culture !== id);
      return { message: "Supprimé" };
    }
  ),
};

// ── Parcelles ──

let demoParcelles = [...DEMO_PARCELLES];
let nextParcelleId = 100;

export const parcelles = {
  getAll: (params?: Record<string, string>) => demoOr(
    () => apiFetch(`/parcelles${qs(params)}`),
    () => {
      let result = [...demoParcelles];
      if (params?.saison_active === "true") result = result.filter(p => p.saison_active);
      if (params?.saison_active === "false") result = result.filter(p => !p.saison_active);
      return { data: result as unknown, total: result.length };
    }
  ),
  getById: (id: number) => demoOr(
    () => apiFetch(`/parcelles/${id}`),
    () => ({ data: demoParcelles.find(p => p.id_parcelle === id) as unknown })
  ),
  create: (data: Record<string, unknown>) => demoOr(
    () => apiFetch("/parcelles", { method: "POST", body: JSON.stringify(data) }),
    () => {
      const cultureId = data.id_culture ? Number(data.id_culture) : null;
      const culture = cultureId ? demoCultures.find(c => c.id_culture === cultureId) || null : null;
      const p = {
        id_parcelle: nextParcelleId++,
        id_agriculteur: 1,
        id_culture: cultureId,
        surface: Number(data.surface) || 0,
        type_de_sol: String(data.type_de_sol || "Sable"),
        capacite_eau: Number(data.capacite_eau) || 0,
        latitude: data.latitude ? Number(data.latitude) : null,
        longitude: data.longitude ? Number(data.longitude) : null,
        saison_active: false,
        date_debut_saison: null,
        culture,
      };
      demoParcelles.push(p as typeof DEMO_PARCELLES[0]);
      return { data: p as unknown };
    }
  ),
  update: (id: number, data: Record<string, unknown>) => demoOr(
    () => apiFetch(`/parcelles/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    () => {
      const idx = demoParcelles.findIndex(p => p.id_parcelle === id);
      if (idx >= 0) demoParcelles[idx] = { ...demoParcelles[idx], ...data } as typeof DEMO_PARCELLES[0];
      return { data: demoParcelles[idx] as unknown };
    }
  ),
  delete: (id: number) => demoOr(
    () => apiFetch(`/parcelles/${id}`, { method: "DELETE" }),
    () => {
      demoParcelles = demoParcelles.filter(p => p.id_parcelle !== id);
      return { message: "Supprimé" };
    }
  ),
  ouvrirSaison: (id: number, data?: Record<string, unknown>) => demoOr(
    () => apiFetch(`/parcelles/${id}/ouvrir-saison`, { method: "POST", body: JSON.stringify(data || {}) }),
    () => {
      const idx = demoParcelles.findIndex(p => p.id_parcelle === id);
      if (idx >= 0) {
        demoParcelles[idx] = { ...demoParcelles[idx], saison_active: true, date_debut_saison: new Date().toISOString().slice(0, 10) };
      }
      return { data: demoParcelles[idx] as unknown };
    }
  ),
  fermerSaison: (id: number) => demoOr(
    () => apiFetch(`/parcelles/${id}/fermer-saison`, { method: "POST" }),
    () => {
      const idx = demoParcelles.findIndex(p => p.id_parcelle === id);
      if (idx >= 0) {
        demoParcelles[idx] = { ...demoParcelles[idx], saison_active: false, date_debut_saison: null };
      }
      return { data: demoParcelles[idx] as unknown, message: "Saison clôturée" };
    }
  ),
  historiqueBesoins: (id: number, params?: Record<string, string>) => demoOr(
    () => apiFetch(`/parcelles/${id}/historique-besoins${qs(params)}`),
    () => ({ data: filterByParcelle(DEMO_BESOINS, id) as unknown })
  ),
  historiqueStress: (id: number) => demoOr(
    () => apiFetch(`/parcelles/${id}/historique-stress`),
    () => ({ data: filterByParcelle(DEMO_STRESS, id) as unknown })
  ),
};

// ── Mesures ──

let demoMesures = [...DEMO_MESURES];
let nextMesureId = 100;

export const mesures = {
  getAll: (params: Record<string, string>) => demoOr(
    () => apiFetch(`/mesures${qs(params)}`),
    () => {
      let result = [...demoMesures];
      if (params.parcelle_id) result = filterByParcelle(result, params.parcelle_id);
      return { data: result as unknown, total: result.length };
    }
  ),
  getById: (id: number) => demoOr(
    () => apiFetch(`/mesures/${id}`),
    () => ({ data: demoMesures.find(m => m.id_mesure === id) as unknown })
  ),
  create: (data: Record<string, unknown>) => demoOr(
    () => apiFetch("/mesures", { method: "POST", body: JSON.stringify(data) }),
    () => {
      const m = {
        id_mesure: nextMesureId++,
        id_parcelle: Number(data.id_parcelle),
        date_prevision: String(data.date_prevision),
        temperature: Number(data.temperature),
        pluie: Number(data.pluie),
        humidite: data.humidite ? Number(data.humidite) : null,
        source_api: String(data.source_api || "Manual"),
      };
      demoMesures.push(m);
      return { data: m as unknown, besoin_genere: true };
    }
  ),
  update: (id: number, data: Record<string, unknown>) => demoOr(
    () => apiFetch(`/mesures/${id}`, { method: "PUT", body: JSON.stringify(data) }),
    () => {
      const idx = demoMesures.findIndex(m => m.id_mesure === id);
      if (idx >= 0) demoMesures[idx] = { ...demoMesures[idx], ...data } as typeof DEMO_MESURES[0];
      return { data: demoMesures[idx] as unknown };
    }
  ),
  delete: (id: number) => demoOr(
    () => apiFetch(`/mesures/${id}`, { method: "DELETE" }),
    () => {
      demoMesures = demoMesures.filter(m => m.id_mesure !== id);
      return { message: "Supprimé" };
    }
  ),
};

// ── Besoins ──

let demoBesoins = [...DEMO_BESOINS];

export const besoins = {
  getAll: (params?: Record<string, string>) => demoOr(
    () => apiFetch(`/besoins${qs(params)}`),
    () => {
      let result = [...demoBesoins];
      if (params?.parcelle_id) result = filterByParcelle(result, params.parcelle_id);
      return { data: result as unknown, total: result.length };
    }
  ),
  appliquer: (id: number, volume: number) => demoOr(
    () => apiFetch(`/besoins/${id}/appliquer`, { method: "PUT", body: JSON.stringify({ volume_applique: volume }) }),
    () => {
      const idx = demoBesoins.findIndex(b => b.id_besoin === id);
      if (idx >= 0) demoBesoins[idx] = { ...demoBesoins[idx], volume_applique: volume };
      return { data: demoBesoins[idx] as unknown };
    }
  ),
  delete: (id: number) => demoOr(
    () => apiFetch(`/besoins/${id}`, { method: "DELETE" }),
    () => {
      demoBesoins = demoBesoins.filter(b => b.id_besoin !== id);
      return { message: "Supprimé" };
    }
  ),
};

// ── Stress ──

let demoStress = [...DEMO_STRESS];

export const stress = {
  getAll: (params?: Record<string, string>) => demoOr(
    () => apiFetch(`/stress${qs(params)}`),
    () => {
      let result = [...demoStress];
      if (params?.alerte_active === "true") result = result.filter(s => s.alerte_active);
      if (params?.parcelle_id) result = filterByParcelle(result, params.parcelle_id);
      if (params?.niveau) result = result.filter(s => s.niveau_stress === params.niveau);
      return { data: result as unknown, total: result.length };
    }
  ),
  getById: (id: number) => demoOr(
    () => apiFetch(`/stress/${id}`),
    () => ({ data: demoStress.find(s => s.id_stress === id) as unknown })
  ),
  simuler: (parcelleId: number) => demoOr(
    () => apiFetch(`/stress/calculer/${parcelleId}`, { method: "POST" }),
    () => {
      const parcelle = demoParcelles.find(p => p.id_parcelle === parcelleId);
      const besoinTotal = filterByParcelle(demoBesoins, parcelleId).reduce((s, b) => s + b.volume_recommande, 0);
      const capacite = parcelle?.capacite_eau || 10000;
      const deficit = Math.max(0, besoinTotal - capacite);
      const niveau = deficit > capacite * 0.5 ? "Critique" : deficit > 0 ? "Élevé" : "Faible";
      return {
        simulation: {
          besoin_total: besoinTotal,
          capacite_source: capacite,
          deficit,
          niveau_stress: niveau,
          cultures_suggere: deficit > 0 ? "Olivier, Luzerne" : null,
        },
      };
    }
  ),
  delete: (id: number) => demoOr(
    () => apiFetch(`/stress/${id}`, { method: "DELETE" }),
    () => {
      demoStress = demoStress.filter(s => s.id_stress !== id);
      return { message: "Supprimé" };
    }
  ),
};

// ── Weather ──

export const weather = {
  forecast: (parcelleId: number, days = 7) =>
    apiFetch(`/weather/forecast/${parcelleId}${qs({ days })}`),
  history: (parcelleId: number, start: string, end: string) =>
    apiFetch(`/weather/history/${parcelleId}${qs({ start, end })}`),
  sync: (parcelleId: number, days = 7) =>
    apiFetch(`/weather/sync/${parcelleId}${qs({ days })}`, { method: "POST" }),
};

// Legacy
export const agriculteurs = {
  getAll: () => apiFetch("/agriculteurs"),
  getById: (id: number) => apiFetch(`/agriculteurs/${id}`),
};
