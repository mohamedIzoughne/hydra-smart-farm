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
}

async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    const url = `${BASE_URL}${path}`;
    const res = await fetch(url, {
      headers: { "Content-Type": "application/json", ...options.headers },
      ...options,
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
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

export const agriculteurs = {
  getAll: (params?: Record<string, string>) => apiFetch(`/agriculteurs${qs(params)}`),
  getById: (id: number) => apiFetch(`/agriculteurs/${id}`),
  create: (data: Record<string, unknown>) => apiFetch("/agriculteurs", { method: "POST", body: JSON.stringify(data) }),
  update: (id: number, data: Record<string, unknown>) => apiFetch(`/agriculteurs/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deactivate: (id: number) => apiFetch(`/agriculteurs/${id}`, { method: "DELETE" }),
};

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
