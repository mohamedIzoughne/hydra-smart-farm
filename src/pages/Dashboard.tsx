import { useEffect, useState, useCallback } from "react";
import { parcelles as parcellesApi, stress as stressApi, cultures as culturesApi } from "@/lib/api";
import { useAuthStore } from "@/lib/stores";
import { StatCard } from "@/components/smart/StatCard";
import { Badge, stressBadgeType } from "@/components/smart/Badge";
import { useNavigate } from "react-router-dom";
import { Map, Activity, AlertTriangle, Sprout, Droplets, ArrowRight, Leaf } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Dashboard() {
  const nav = useNavigate();
  const user = useAuthStore((s) => s.user);
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
      <div className="space-y-8">
        <div className="h-24 bg-muted/50 rounded-2xl animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-[130px] bg-muted/50 rounded-2xl animate-pulse" />
          ))}
        </div>
        <div className="h-64 bg-muted/50 rounded-2xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Welcome header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-accent p-7 md:p-9">
        <div className="blob top-0 right-0 h-40 w-40 bg-primary-foreground/10" />
        <div className="blob -bottom-10 -left-10 h-32 w-32 bg-primary-foreground/5" />
        <div className="relative">
          <div className="flex items-center gap-2 mb-2">
            <Leaf className="w-5 h-5 text-primary-foreground/70" />
            <span className="text-xs font-bold uppercase tracking-[0.1em] text-primary-foreground/60">Tableau de bord</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-black font-heading tracking-tight text-primary-foreground">
            Bonjour, {user?.nom?.split(" ")[0] || "Agriculteur"} 👋
          </h1>
          <p className="text-sm text-primary-foreground/70 mt-2 max-w-lg">
            Voici un aperçu de votre exploitation. {alertes.length > 0 ? `${alertes.length} alerte${alertes.length > 1 ? "s" : ""} requièrent votre attention.` : "Tout va bien !"}
          </p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard label="Parcelles" value={allParcelles.length} icon={<Map className="w-5 h-5" />} color="primary" subtitle="Total enregistrées" />
        <StatCard label="Saisons actives" value={activeParcelles.length} icon={<Activity className="w-5 h-5" />} color="accent" subtitle="En cours" />
        <StatCard label="Alertes stress" value={alertes.length} icon={<AlertTriangle className="w-5 h-5" />} color="destructive" subtitle={alertes.length > 0 ? "Action requise" : "Tout va bien"} />
        <StatCard label="Cultures" value={culturesCount} icon={<Sprout className="w-5 h-5" />} color="secondary" subtitle="Référencées" />
      </div>

      {/* Active alerts */}
      {alertes.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-destructive animate-pulse" />
              <p className="text-sm font-bold uppercase tracking-[0.08em] text-muted-foreground">Alertes actives</p>
            </div>
            <Button variant="ghost" size="sm" className="text-xs font-semibold" onClick={() => nav("/alertes")}>
              Tout voir <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {alertes.slice(0, 3).map((a, i) => (
              <div
                key={i}
                className="group bg-card border border-border/60 rounded-2xl p-5 cursor-pointer transition-all duration-300 hover:shadow-lg hover:shadow-destructive/5 hover:-translate-y-1"
                onClick={() => nav(`/parcelles/${a.id_parcelle}`)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === "Enter" && nav(`/parcelles/${a.id_parcelle}`)}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-base font-bold font-heading text-foreground">
                    Parcelle #{String(a.id_parcelle)}
                  </span>
                  <Badge value={String(a.niveau_stress)} type={stressBadgeType(String(a.niveau_stress))} />
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Droplets className="w-4 h-4 shrink-0 text-accent" />
                  <span>Déficit : <span className="font-semibold text-foreground">{Number(a.deficit_calcule || 0).toLocaleString("fr-FR")} L</span></span>
                </div>
                {a.cultures_suggere && (
                  <p className="text-xs text-muted-foreground mt-2 truncate">→ {String(a.cultures_suggere)}</p>
                )}
                <div className="mt-3 text-xs font-semibold text-primary opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  Voir les détails →
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Active parcelles */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-bold uppercase tracking-[0.08em] text-muted-foreground">Parcelles en saison</p>
          <Button variant="ghost" size="sm" className="text-xs font-semibold" onClick={() => nav("/parcelles")}>
            Tout voir <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </Button>
        </div>
        {activeParcelles.length === 0 ? (
          <div className="bg-card border border-border/60 rounded-2xl p-14 text-center">
            <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
              <Map className="w-7 h-7 text-muted-foreground/30" />
            </div>
            <p className="text-base font-semibold text-foreground mb-1">Aucune parcelle en saison</p>
            <p className="text-sm text-muted-foreground mb-5">Démarrez une saison pour commencer le suivi</p>
            <Button variant="outline" size="sm" onClick={() => nav("/parcelles")} className="rounded-full px-5">
              Gérer les parcelles
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {activeParcelles.slice(0, 6).map((p, i) => {
              const culture = p.culture as Record<string, unknown> | null;
              return (
                <div
                  key={i}
                  className="group bg-card border border-border/60 rounded-2xl p-5 cursor-pointer transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-1"
                  onClick={() => nav(`/parcelles/${p.id_parcelle}`)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === "Enter" && nav(`/parcelles/${p.id_parcelle}`)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-base font-bold font-heading text-foreground">
                      Parcelle #{String(p.id_parcelle)}
                    </span>
                    <Badge value="Active" type="success" />
                  </div>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p className="font-medium text-foreground">{culture ? String(culture.nom_culture) : "Sans culture"}</p>
                    <p>{String(p.type_de_sol)} · {String(p.surface)} ha</p>
                    {p.date_debut_saison && <p className="text-xs">Depuis le {String(p.date_debut_saison)}</p>}
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
