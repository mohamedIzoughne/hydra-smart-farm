import React, { useEffect, useState } from "react";
import { stress as api, parcelles as parcellesApi } from "@/lib/api";
import { useNotificationStore } from "@/lib/stores";
import { DataTable, type Column } from "@/components/smart/DataTable";
import { Badge, stressBadgeType } from "@/components/smart/Badge";
import { ConfirmDialog } from "@/components/smart/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, History, Droplets, Trash2 } from "lucide-react";

function ProgressBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  const color = pct > 80 ? "bg-destructive" : pct > 50 ? "bg-warning" : "bg-success";
  return (
    <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
      <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export default function AlertesPage() {
  const nav = useNavigate();
  const notify = useNotificationStore((s) => s.notify);
  const [tab, setTab] = useState<"alertes" | "historique">("alertes");
  const [alertes, setAlertes] = useState<Record<string, unknown>[]>([]);
  const [allStress, setAllStress] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  // Historique filters
  const [filterNiveau, setFilterNiveau] = useState("");
  const [filterParcelle, setFilterParcelle] = useState("");
  const [parcelleOptions, setParcelleOptions] = useState<{ id: number; label: string }[]>([]);

  useEffect(() => {
    (async () => {
      const res = await parcellesApi.getAll();
      if (res.data) {
        setParcelleOptions((res.data as Record<string, unknown>[]).map((p) => ({
          id: p.id_parcelle as number,
          label: `Parcelle #${p.id_parcelle}`,
        })));
      }
    })();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [aRes, hRes] = await Promise.all([
      api.getAll({ alerte_active: "true" }),
      api.getAll((() => {
        const p: Record<string, string> = {};
        if (filterNiveau) p.niveau = filterNiveau;
        if (filterParcelle) p.parcelle_id = filterParcelle;
        return p;
      })()),
    ]);
    if (aRes.data) setAlertes(aRes.data as Record<string, unknown>[]);
    if (hRes.data) setAllStress(hRes.data as Record<string, unknown>[]);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [filterNiveau, filterParcelle]);

  const handleDelete = async () => {
    if (deleteId === null) return;
    const res = await api.delete(deleteId);
    if (res.error) { notify("error", res.error); } else { notify("success", "Enregistrement supprimé"); }
    setDeleteId(null);
    fetchData();
  };

  const niveauColor = (n: string) => {
    switch (n) {
      case "Critique": return "border-destructive/40 bg-destructive/5";
      case "Élevé": return "border-warning/40 bg-warning/5";
      case "Moyen": return "border-secondary/40 bg-secondary/5";
      default: return "border-success/40 bg-success/5";
    }
  };

  const histoColumns: Column[] = [
    { key: "id_parcelle", label: "Parcelle" },
    { key: "date_calcul", label: "Date", sortable: true },
    { key: "niveau_stress", label: "Niveau", render: (v) => <Badge value={String(v)} type={stressBadgeType(String(v))} /> },
    { key: "besoin_total_saison", label: "Besoin total (L)", sortable: true, render: (v) => Number(v).toLocaleString("fr-FR") },
    { key: "capacite_source", label: "Capacité (L)", render: (v) => Number(v).toLocaleString("fr-FR") },
    { key: "deficit_calcule", label: "Déficit (L)", sortable: true, render: (v) => Number(v).toLocaleString("fr-FR") },
    { key: "alerte_active", label: "Alerte", render: (v) => <Badge value={v ? "Oui" : "Non"} type={v ? "danger" : "neutral"} /> },
    { key: "recommandation", label: "Recommandation", render: (v) => v ? <span className="text-xs max-w-[200px] truncate block">{String(v)}</span> : "—" },
    { key: "cultures_suggere", label: "Suggestions", render: (v) => v ? String(v) : "—" },
    {
      key: "actions", label: "", render: (_, row) => (
        <div onClick={(e) => e.stopPropagation()}>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteId(row.id_stress as number)}>
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <h1 className="page-title">Alertes de Stress Hydrique</h1>

      {/* Tabs */}
      <div className="flex border-b">
        <button
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${tab === "alertes" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          onClick={() => setTab("alertes")}
        >
          <AlertTriangle className="w-4 h-4 inline mr-1.5" />Alertes Actives ({alertes.length})
        </button>
        <button
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${tab === "historique" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          onClick={() => setTab("historique")}
        >
          <History className="w-4 h-4 inline mr-1.5" />Historique Complet
        </button>
      </div>

      {tab === "alertes" && (
        <div className="space-y-4">
          {loading ? (
            <div className="grid gap-4 md:grid-cols-2">
              {[1, 2, 3].map((i) => <div key={i} className="h-44 bg-muted rounded-xl animate-pulse" />)}
            </div>
          ) : alertes.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <AlertTriangle className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>Aucune alerte active. Tout va bien ! 🌱</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {alertes.map((a, i) => {
                const deficit = Number(a.deficit_calcule || 0);
                const capacite = Number(a.capacite_source || 1);
                const suggestions = a.cultures_suggere ? String(a.cultures_suggere).split(",").map((s) => s.trim()) : [];
                return (
                  <div key={i} className={`rounded-xl border-2 p-5 transition-shadow hover:shadow-md ${niveauColor(String(a.niveau_stress))}`}>
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-semibold font-heading">Parcelle #{String(a.id_parcelle)}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{String(a.date_calcul)}</p>
                      </div>
                      <Badge value={String(a.niveau_stress)} type={stressBadgeType(String(a.niveau_stress))} className="text-sm px-3 py-1" />
                    </div>

                    <div className="space-y-2 text-sm mb-3">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Déficit / Capacité</span>
                        <span className="font-medium">{deficit.toLocaleString("fr-FR")} / {capacite.toLocaleString("fr-FR")} L</span>
                      </div>
                      <ProgressBar value={deficit} max={capacite} />
                    </div>

                    {suggestions.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {suggestions.map((s, j) => (
                          <span key={j} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-accent/15 text-accent border border-accent/20">
                            <Droplets className="w-3 h-3" />{s}
                          </span>
                        ))}
                      </div>
                    )}

                    {a.recommandation && (
                      <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{String(a.recommandation)}</p>
                    )}

                    <Button variant="outline" size="sm" className="w-full" onClick={() => nav(`/parcelles/${a.id_parcelle}`)}>
                      Voir la parcelle
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {tab === "historique" && (
        <>
          <div className="filter-bar">
            <select className="border rounded-md px-3 py-2 text-sm bg-background" value={filterNiveau} onChange={(e) => setFilterNiveau(e.target.value)}>
              <option value="">Tous niveaux</option>
              <option value="Critique">Critique</option>
              <option value="Élevé">Élevé</option>
              <option value="Moyen">Moyen</option>
              <option value="Faible">Faible</option>
            </select>
            <select className="border rounded-md px-3 py-2 text-sm bg-background" value={filterParcelle} onChange={(e) => setFilterParcelle(e.target.value)}>
              <option value="">Toutes parcelles</option>
              {parcelleOptions.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
            </select>
          </div>
          <DataTable columns={histoColumns} rows={allStress} loading={loading} emptyMessage="Aucun enregistrement" onRowClick={(row) => nav(`/parcelles/${row.id_parcelle}`)} />
        </>
      )}

      <ConfirmDialog open={deleteId !== null} onClose={() => setDeleteId(null)} onConfirm={handleDelete} title="Supprimer cet enregistrement ?" message="Cette action est irréversible." confirmLabel="Supprimer" dangerMode />
    </div>
  );
}
