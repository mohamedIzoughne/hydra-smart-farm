// Demo data used when backend is unavailable
// Dummy credentials: izourne@gmail.com / 1234568

import type { AuthUser } from "./stores";

export const DEMO_EMAIL = "izourne@gmail.com";
export const DEMO_PASSWORD = "1234568";

export const DEMO_USER: AuthUser = {
  id_agriculteur: 1,
  nom: "Izourne Agriculteur",
  mail: DEMO_EMAIL,
  date_inscription: "2024-06-15",
};

export const DEMO_TOKEN = "demo-access-token-smartagri";
export const DEMO_REFRESH = "demo-refresh-token-smartagri";

export function isDemoMode(): boolean {
  return localStorage.getItem("sa_access_token") === DEMO_TOKEN;
}

// ── Mock data ──

export const DEMO_CULTURES = [
  { id_culture: 1, nom_culture: "Blé tendre", besoin_eau_base: 5.2, seuil_stress_hyd: 40, coeff_sol_sable: 1.3, coeff_sol_limon: 1.0, coeff_sol_argile: 0.75 },
  { id_culture: 2, nom_culture: "Maïs", besoin_eau_base: 7.8, seuil_stress_hyd: 35, coeff_sol_sable: 1.35, coeff_sol_limon: 1.0, coeff_sol_argile: 0.7 },
  { id_culture: 3, nom_culture: "Tomate", besoin_eau_base: 6.5, seuil_stress_hyd: 30, coeff_sol_sable: 1.25, coeff_sol_limon: 1.0, coeff_sol_argile: 0.8 },
  { id_culture: 4, nom_culture: "Olivier", besoin_eau_base: 3.0, seuil_stress_hyd: 55, coeff_sol_sable: 1.2, coeff_sol_limon: 1.0, coeff_sol_argile: 0.85 },
  { id_culture: 5, nom_culture: "Luzerne", besoin_eau_base: 8.0, seuil_stress_hyd: 25, coeff_sol_sable: 1.4, coeff_sol_limon: 1.0, coeff_sol_argile: 0.65 },
];

export const DEMO_PARCELLES = [
  { id_parcelle: 1, id_agriculteur: 1, id_culture: 2, surface: 3.5, type_de_sol: "Limon", capacite_eau: 12000, latitude: 33.5731, longitude: -7.5898, saison_active: true, date_debut_saison: "2025-03-01", culture: DEMO_CULTURES[1] },
  { id_parcelle: 2, id_agriculteur: 1, id_culture: 1, surface: 2.0, type_de_sol: "Argile", capacite_eau: 8000, latitude: 33.5800, longitude: -7.6000, saison_active: true, date_debut_saison: "2025-02-15", culture: DEMO_CULTURES[0] },
  { id_parcelle: 3, id_agriculteur: 1, id_culture: 3, surface: 1.2, type_de_sol: "Sable", capacite_eau: 5000, latitude: 33.5650, longitude: -7.5750, saison_active: false, date_debut_saison: null, culture: DEMO_CULTURES[2] },
  { id_parcelle: 4, id_agriculteur: 1, id_culture: null, surface: 4.0, type_de_sol: "Limon", capacite_eau: 15000, latitude: 33.5900, longitude: -7.6100, saison_active: false, date_debut_saison: null, culture: null },
];

export const DEMO_MESURES = [
  { id_mesure: 1, id_parcelle: 1, date_prevision: "2025-03-05", temperature: 22.5, pluie: 0.0, humidite: 45, source_api: "OpenMeteo" },
  { id_mesure: 2, id_parcelle: 1, date_prevision: "2025-03-06", temperature: 25.0, pluie: 2.5, humidite: 52, source_api: "OpenMeteo" },
  { id_mesure: 3, id_parcelle: 1, date_prevision: "2025-03-07", temperature: 28.3, pluie: 0.0, humidite: 38, source_api: "OpenMeteo" },
  { id_mesure: 4, id_parcelle: 2, date_prevision: "2025-03-05", temperature: 21.0, pluie: 5.0, humidite: 60, source_api: "OpenMeteo" },
  { id_mesure: 5, id_parcelle: 2, date_prevision: "2025-03-06", temperature: 23.8, pluie: 0.0, humidite: 48, source_api: "Manual" },
];

export const DEMO_BESOINS = [
  { id_besoin: 1, id_parcelle: 1, date_besoin: "2025-03-06", volume_recommande: 2730, volume_applique: 2500, genere_par: "auto" },
  { id_besoin: 2, id_parcelle: 1, date_besoin: "2025-03-07", volume_recommande: 2730, volume_applique: null, genere_par: "auto" },
  { id_besoin: 3, id_parcelle: 1, date_besoin: "2025-03-08", volume_recommande: 3150, volume_applique: null, genere_par: "auto" },
  { id_besoin: 4, id_parcelle: 2, date_besoin: "2025-03-06", volume_recommande: 1040, volume_applique: 1000, genere_par: "auto" },
  { id_besoin: 5, id_parcelle: 2, date_besoin: "2025-03-07", volume_recommande: 1560, volume_applique: null, genere_par: "auto" },
];

export const DEMO_STRESS = [
  { id_stress: 1, id_parcelle: 1, date_calcul: "2025-03-07", niveau_stress: "Élevé", besoin_total_saison: 18500, capacite_source: 12000, deficit_calcule: 6500, alerte_active: true, recommandation: "Augmenter l'irrigation de 40%. Envisager un paillage.", cultures_suggere: "Olivier, Luzerne" },
  { id_stress: 2, id_parcelle: 2, date_calcul: "2025-03-07", niveau_stress: "Moyen", besoin_total_saison: 6200, capacite_source: 8000, deficit_calcule: 0, alerte_active: false, recommandation: "Situation stable, surveiller les prochaines semaines.", cultures_suggere: null },
  { id_stress: 3, id_parcelle: 1, date_calcul: "2025-03-01", niveau_stress: "Faible", besoin_total_saison: 8000, capacite_source: 12000, deficit_calcule: 0, alerte_active: false, recommandation: null, cultures_suggere: null },
];

// Helper to filter by parcelle_id
export function filterByParcelle<T extends { id_parcelle: number }>(items: T[], parcelleId?: string | number): T[] {
  if (!parcelleId) return items;
  return items.filter(i => i.id_parcelle === Number(parcelleId));
}
