import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  cultures as culturesApi,
  parcelles as parcellesApi,
  mesures as mesuresApi,
  besoins as besoinsApi,
  stress as stressApi,
  weather as weatherApi,
  auth as authApi,
  type ApiResponse,
} from "@/lib/api";

// ── Query Keys ──

export const queryKeys = {
  cultures: {
    all: ["cultures"] as const,
    list: (params?: Record<string, string>) => ["cultures", "list", params] as const,
    detail: (id: number) => ["cultures", "detail", id] as const,
  },
  parcelles: {
    all: ["parcelles"] as const,
    list: (params?: Record<string, string>) => ["parcelles", "list", params] as const,
    detail: (id: number) => ["parcelles", "detail", id] as const,
    besoins: (id: number, params?: Record<string, string>) => ["parcelles", "besoins", id, params] as const,
    stress: (id: number) => ["parcelles", "stress", id] as const,
  },
  mesures: {
    all: ["mesures"] as const,
    list: (params: Record<string, string>) => ["mesures", "list", params] as const,
    detail: (id: number) => ["mesures", "detail", id] as const,
  },
  besoins: {
    all: ["besoins"] as const,
    list: (params?: Record<string, string>) => ["besoins", "list", params] as const,
  },
  stress: {
    all: ["stress"] as const,
    list: (params?: Record<string, string>) => ["stress", "list", params] as const,
    detail: (id: number) => ["stress", "detail", id] as const,
  },
  weather: {
    forecast: (parcelleId: number, days?: number) => ["weather", "forecast", parcelleId, days] as const,
    history: (parcelleId: number, start: string, end: string) => ["weather", "history", parcelleId, start, end] as const,
  },
  auth: {
    me: ["auth", "me"] as const,
  },
};

// ── Cultures ──

export function useCultures(params?: Record<string, string>) {
  return useQuery({
    queryKey: queryKeys.cultures.list(params),
    queryFn: async () => {
      const res = await culturesApi.getAll(params);
      if (res.error) throw new Error(res.error);
      return { data: res.data as Record<string, unknown>[], total: res.total ?? 0 };
    },
  });
}

export function useCulture(id: number) {
  return useQuery({
    queryKey: queryKeys.cultures.detail(id),
    queryFn: async () => {
      const res = await culturesApi.getById(id);
      if (res.error) throw new Error(res.error);
      return res.data as Record<string, unknown>;
    },
    enabled: !!id,
  });
}

export function useCreateCulture() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await culturesApi.create(data);
      if (res.error) throw new Error(res.error);
      return res;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.cultures.all }),
  });
}

export function useUpdateCulture() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Record<string, unknown> }) => {
      const res = await culturesApi.update(id, data);
      if (res.error) throw new Error(res.error);
      return res;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.cultures.all }),
  });
}

export function useDeleteCulture() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await culturesApi.delete(id);
      if (res.error) throw new Error(res.error);
      return res;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.cultures.all }),
  });
}

// ── Parcelles ──

export function useParcelles(params?: Record<string, string>) {
  return useQuery({
    queryKey: queryKeys.parcelles.list(params),
    queryFn: async () => {
      const res = await parcellesApi.getAll(params);
      if (res.error) throw new Error(res.error);
      return { data: res.data as Record<string, unknown>[], total: res.total ?? 0 };
    },
  });
}

export function useParcelle(id: number) {
  return useQuery({
    queryKey: queryKeys.parcelles.detail(id),
    queryFn: async () => {
      const res = await parcellesApi.getById(id);
      if (res.error) throw new Error(res.error);
      return res.data as Record<string, unknown>;
    },
    enabled: !!id,
  });
}

export function useCreateParcelle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await parcellesApi.create(data);
      if (res.error) throw new Error(res.error);
      return res;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.parcelles.all }),
  });
}

export function useUpdateParcelle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Record<string, unknown> }) => {
      const res = await parcellesApi.update(id, data);
      if (res.error) throw new Error(res.error);
      return res;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.parcelles.all }),
  });
}

export function useDeleteParcelle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await parcellesApi.delete(id);
      if (res.error) throw new Error(res.error);
      return res;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.parcelles.all }),
  });
}

export function useOuvrirSaison() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data?: Record<string, unknown> }) => {
      const res = await parcellesApi.ouvrirSaison(id, data);
      if (res.error) throw new Error(res.error);
      return res;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.parcelles.all }),
  });
}

export function useFermerSaison() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await parcellesApi.fermerSaison(id);
      if (res.error) throw new Error(res.error);
      return res;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.parcelles.all }),
  });
}

export function useParcelleBesoins(id: number, params?: Record<string, string>) {
  return useQuery({
    queryKey: queryKeys.parcelles.besoins(id, params),
    queryFn: async () => {
      const res = await parcellesApi.historiqueBesoins(id, params);
      if (res.error) throw new Error(res.error);
      return res.data as Record<string, unknown>[];
    },
    enabled: !!id,
  });
}

export function useParcelleStress(id: number) {
  return useQuery({
    queryKey: queryKeys.parcelles.stress(id),
    queryFn: async () => {
      const res = await parcellesApi.historiqueStress(id);
      if (res.error) throw new Error(res.error);
      return res.data as Record<string, unknown>[];
    },
    enabled: !!id,
  });
}

// ── Mesures ──

export function useMesures(params: Record<string, string>) {
  return useQuery({
    queryKey: queryKeys.mesures.list(params),
    queryFn: async () => {
      const res = await mesuresApi.getAll(params);
      if (res.error) throw new Error(res.error);
      return { data: res.data as Record<string, unknown>[], total: res.total ?? 0 };
    },
    enabled: !!params.parcelle_id,
  });
}

export function useCreateMesure() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await mesuresApi.create(data);
      if (res.error) throw new Error(res.error);
      return res;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.mesures.all });
      qc.invalidateQueries({ queryKey: queryKeys.parcelles.all });
      qc.invalidateQueries({ queryKey: queryKeys.besoins.all });
    },
  });
}

export function useUpdateMesure() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Record<string, unknown> }) => {
      const res = await mesuresApi.update(id, data);
      if (res.error) throw new Error(res.error);
      return res;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.mesures.all });
      qc.invalidateQueries({ queryKey: queryKeys.besoins.all });
    },
  });
}

export function useDeleteMesure() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await mesuresApi.delete(id);
      if (res.error) throw new Error(res.error);
      return res;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.mesures.all });
      qc.invalidateQueries({ queryKey: queryKeys.besoins.all });
    },
  });
}

// ── Besoins ──

export function useBesoins(params?: Record<string, string>) {
  return useQuery({
    queryKey: queryKeys.besoins.list(params),
    queryFn: async () => {
      const res = await besoinsApi.getAll(params);
      if (res.error) throw new Error(res.error);
      return { data: res.data as Record<string, unknown>[], total: res.total ?? 0 };
    },
  });
}

export function useAppliquerBesoin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, volume }: { id: number; volume: number }) => {
      const res = await besoinsApi.appliquer(id, volume);
      if (res.error) throw new Error(res.error);
      return res;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.besoins.all });
      qc.invalidateQueries({ queryKey: queryKeys.parcelles.all });
    },
  });
}

export function useDeleteBesoin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await besoinsApi.delete(id);
      if (res.error) throw new Error(res.error);
      return res;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.besoins.all });
      qc.invalidateQueries({ queryKey: queryKeys.parcelles.all });
    },
  });
}

// ── Stress ──

export function useStressList(params?: Record<string, string>) {
  return useQuery({
    queryKey: queryKeys.stress.list(params),
    queryFn: async () => {
      const res = await stressApi.getAll(params);
      if (res.error) throw new Error(res.error);
      return { data: res.data as Record<string, unknown>[], total: res.total ?? 0 };
    },
  });
}

export function useSimulerStress() {
  return useMutation({
    mutationFn: async (parcelleId: number) => {
      const res = await stressApi.simuler(parcelleId);
      if (res.error) throw new Error(res.error);
      return res.simulation as Record<string, unknown>;
    },
  });
}

export function useDeleteStress() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await stressApi.delete(id);
      if (res.error) throw new Error(res.error);
      return res;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.stress.all }),
  });
}

// ── Weather ──

export function useWeatherForecast(parcelleId: number, days = 7) {
  return useQuery({
    queryKey: queryKeys.weather.forecast(parcelleId, days),
    queryFn: async () => {
      const res = await weatherApi.forecast(parcelleId, days);
      if (res.error) throw new Error(res.error);
      return res as Record<string, unknown>;
    },
    enabled: !!parcelleId,
  });
}

export function useWeatherHistory(parcelleId: number, start: string, end: string) {
  return useQuery({
    queryKey: queryKeys.weather.history(parcelleId, start, end),
    queryFn: async () => {
      const res = await weatherApi.history(parcelleId, start, end);
      if (res.error) throw new Error(res.error);
      return res as Record<string, unknown>;
    },
    enabled: !!parcelleId && !!start && !!end,
  });
}

export function useWeatherSync() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ parcelleId, days }: { parcelleId: number; days?: number }) => {
      const res = await weatherApi.sync(parcelleId, days);
      if (res.error) throw new Error(res.error);
      return res as Record<string, unknown>;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.mesures.all });
      qc.invalidateQueries({ queryKey: queryKeys.besoins.all });
      qc.invalidateQueries({ queryKey: queryKeys.parcelles.all });
    },
  });
}

// ── Auth ──

export function useProfile() {
  return useQuery({
    queryKey: queryKeys.auth.me,
    queryFn: async () => {
      const res = await authApi.me();
      if (res.error) throw new Error(res.error);
      return res.data as Record<string, unknown>;
    },
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await authApi.updateProfile(data);
      if (res.error) throw new Error(res.error);
      return res.data as Record<string, unknown>;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.auth.me }),
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: async (data: { ancien_mot_de_passe: string; nouveau_mot_de_passe: string; confirmation: string }) => {
      const res = await authApi.changePassword(data);
      if (res.error) throw new Error(res.error);
      return res;
    },
  });
}
