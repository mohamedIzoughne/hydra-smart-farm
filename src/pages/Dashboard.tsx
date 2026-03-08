import React, { useEffect, useState, useCallback } from "react";
import { parcelles as parcellesApi, stress as stressApi, cultures as culturesApi } from "@/lib/api";
import { StatCard } from "@/components/smart/StatCard";
import { Badge, stressBadgeType } from "@/components/smart/Badge";
import { useNavigate } from "react-router-dom";
import { Map, Activity, AlertTriangle, Sprout, Droplets, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Dashboard() {
  const nav = useNavigate();
  const [loading, setLoading] = useState(true);
  const [allParcelles, setAllParcelles] = useState<Record<string, unknown>[]>([]);
  const [alertes, setAlertes] = useState<Record<string, unknown>[]>([]);
  const [culturesCount, setCulturesCount] = useState(0);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [pRes, sRes, cRes] = await Promise.all([
      parcellesApi.getAll({ include_culture: "true" }),
      stressApi.getAll({ alerte_active: "true" }),
      culturesApi.getAll(),
    ]);
    if (pRes.data) setAllParcelles(pRes.data as Record<string, unknown>[]);
    if (sRes.data) setAlertes(sRes.data as Record<string, unknown>[]);
    if (cRes.total !== undefined) setCulturesCount(cRes.total);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const activeParcelles = allParcelles.filter((p) => p.saison_active);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-muted rounded animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="h-24 bg-muted rounded-lg animate-pulse" />)}
        </div>
        <div className="h-64 bg-muted rounded-lg animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="page-title">Tableau de bord</h1>
        <p className="text-sm text-muted-foreground mt-1">Vue d'ensemble de votre exploitation</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Parcelles" value={allParcelles.length} icon={<Map className="w-5 h-5" />} color="primary" />
        <StatCard label="Saisons actives" value={activeParcelles.length} icon={<Activity className="w-5 h-5" />} color="accent" />
        <StatCard label="Alertes stress" value={alertes.length} icon={<AlertTriangle className="w-5 h-5" />} color="destructive" />
        <StatCard label="Cultures" value={culturesCount} icon={<Sprout className="w-5 h-5" />} color="secondary" />
      </div>

      {/* Active alerts */}
      {alertes.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <p className="section-label">Alertes actives</p>
            <Button variant="ghost" size="sm" className="text-xs" onClick={() => nav("/alertes")}>
              Tout voir <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {alertes.slice(0, 3).map((a, i) => (
              <div
                key={i}
                className="bg-card border rounded-lg p-4 cursor-pointer hover:shadow-sm transition-shadow"
                onClick={() => nav(`/parcelles/${a.id_parcelle}`)}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold font-heading">Parcelle #{String(a.id_parcelle)}</span>
                  <Badge value={String(a.niveau_stress)} type={stressBadgeType(String(a.niveau_stress))} />
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Droplets className="w-3 h-3" />
                  <span>Déficit: {Number(a.deficit_calcule || 0).toLocaleString("fr-FR")} L</span>
                </div>
                {a.cultures_suggere && (
                  <p className="text-xs text-muted-foreground mt-1.5 truncate">→ {String(a.cultures_suggere)}</p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Active parcelles */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <p className="section-label">Parcelles en saison</p>
          <Button variant="ghost" size="sm" className="text-xs" onClick={() => nav("/parcelles")}>
            Tout voir <ArrowRight className="w-3 h-3 ml-1" />
          </Button>
        </div>
        {activeParcelles.length === 0 ? (
          <div className="bg-card border rounded-lg p-8 text-center">
            <Map className="w-8 h-8 mx-auto mb-2 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">Aucune parcelle en saison active</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={() => nav("/parcelles")}>
              Gérer les parcelles
            </Button>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {activeParcelles.slice(0, 6).map((p, i) => {
              const culture = p.culture as Record<string, unknown> | null;
              return (
                <div
                  key={i}
                  className="bg-card border rounded-lg p-4 cursor-pointer hover:shadow-sm transition-shadow"
                  onClick={() => nav(`/parcelles/${p.id_parcelle}`)}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-semibold font-heading">Parcelle #{String(p.id_parcelle)}</span>
                    <Badge value="Active" type="success" />
                  </div>
                  <div className="text-xs text-muted-foreground space-y-0.5">
                    <p>{culture ? String(culture.nom_culture) : "Sans culture"} · {String(p.type_de_sol)} · {String(p.surface)} ha</p>
                    {p.date_debut_saison && <p>Depuis le {String(p.date_debut_saison)}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
