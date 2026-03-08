import React, { useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  useParcelle, useParcelleBesoins, useParcelleStress,
  useOuvrirSaison, useFermerSaison, useCreateMesure,
  useAppliquerBesoin, useSimulerStress, useWeatherSync,
} from "@/hooks/useApi";
import { useNotificationStore } from "@/lib/stores";
import { Badge, stressBadgeType } from "@/components/smart/Badge";
import { DataTable, type Column } from "@/components/smart/DataTable";
import { Modal } from "@/components/smart/Modal";
import { FormField } from "@/components/smart/FormField";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Play, Square, FlaskConical, Droplets, AlertTriangle, MapPin, Layers, Ruler, CloudSun, Loader2 } from "lucide-react";

export default function ParcelleDetail() {
  const { id } = useParams();
  const parcelleId = Number(id);
  const notify = useNotificationStore((s) => s.notify);

  const { data, isLoading: loading } = useParcelle(parcelleId);
  const { data: besoinsList = [] } = useParcelleBesoins(parcelleId, { per_page: "14" });
  const { data: stressList = [] } = useParcelleStress(parcelleId);

  const [confirmFermer, setConfirmFermer] = useState(false);
  const [simResult, setSimResult] = useState<Record<string, unknown> | null>(null);
  const [mesureForm, setMesureForm] = useState({ date_prevision: "", temperature: "", pluie: "", humidite: "" });
  const [mesureError, setMesureError] = useState("");
  const [editingBesoinId, setEditingBesoinId] = useState<number | null>(null);
  const [editVolume, setEditVolume] = useState("");

  const ouvrirSaison = useOuvrirSaison();
  const fermerSaison = useFermerSaison();
  const createMesure = useCreateMesure();
  const appliquerBesoin = useAppliquerBesoin();
  const simulerStress = useSimulerStress();
  const weatherSync = useWeatherSync();

  const handleOuvrirSaison = async () => {
    try {
      await ouvrirSaison.mutateAsync({ id: parcelleId });
      notify("success", "Saison ouverte !");
    } catch (e: any) { notify("error", e.message); }
  };

  const handleFermerSaison = async () => {
    try {
      await fermerSaison.mutateAsync(parcelleId);
      notify("success", "Saison clôturée. Audit de stress généré.");
      setConfirmFermer(false);
    } catch (e: any) { notify("error", e.message); }
  };

  const handleAddMesure = async () => {
    setMesureError("");
    const payload: Record<string, unknown> = {
      id_parcelle: parcelleId,
      date_prevision: mesureForm.date_prevision,
      temperature: parseFloat(mesureForm.temperature),
      pluie: parseFloat(mesureForm.pluie),
    };
    if (mesureForm.humidite) payload.humidite = parseFloat(mesureForm.humidite);
    try {
      const res = await createMesure.mutateAsync(payload);
      notify("success", "Mesure ajoutée" + (res.besoin_genere ? " — besoin calculé automatiquement" : ""));
      setMesureForm({ date_prevision: "", temperature: "", pluie: "", humidite: "" });
    } catch (e: any) { setMesureError(e.message); }
  };

  const handleAppliquer = async (besoinId: number) => {
    const vol = parseFloat(editVolume);
    if (isNaN(vol) || vol < 0) { notify("error", "Volume invalide"); return; }
    try {
      await appliquerBesoin.mutateAsync({ id: besoinId, volume: vol });
      notify("success", "Volume appliqué enregistré");
      setEditingBesoinId(null);
    } catch (e: any) { notify("error", e.message); }
  };

  const handleSimuler = async () => {
    try {
      const result = await simulerStress.mutateAsync(parcelleId);
      setSimResult(result);
    } catch (e: any) { notify("error", e.message); }
  };

  const handleWeatherSync = async () => {
    try {
      const res = await weatherSync.mutateAsync({ parcelleId, days: 7 });
      notify("success", String(res.message));
    } catch (e: any) { notify("error", e.message); }
  };

  if (loading) return (
    <div className="space-y-6">
      <div className="h-6 w-24 bg-muted/50 rounded animate-pulse" />
      <div className="h-48 bg-muted/50 rounded-2xl animate-pulse" />
      <div className="h-64 bg-muted/50 rounded-2xl animate-pulse" />
    </div>
  );
  if (!data) return <p className="text-muted-foreground">Parcelle non trouvée</p>;

  const culture = data.culture as Record<string, unknown> | null;
  const saisonActive = Boolean(data.saison_active);
  const hasCoords = !!data.latitude && !!data.longitude;
  const daysSince = data.date_debut_saison
    ? Math.floor((Date.now() - new Date(String(data.date_debut_saison)).getTime()) / 86400000)
    : 0;

  const besoinColumns: Column[] = [
    { key: "date_besoin", label: "Date", sortable: true },
    { key: "volume_recommande", label: "Recommandé (L)", render: (v) => <span className="font-semibold">{Number(v).toLocaleString("fr-FR")}</span> },
    {
      key: "volume_applique", label: "Appliqué (L)", render: (v, row) => {
        const bid = row.id_besoin as number;
        if (editingBesoinId === bid) {
          return (
            <div className="flex items-center gap-1.5">
              <input type="number" className="field-input w-24 py-1" value={editVolume}
                onChange={(e) => setEditVolume(e.target.value)} autoFocus onKeyDown={(e) => e.key === "Enter" && handleAppliquer(bid)} />
              <Button size="sm" className="rounded-lg" onClick={() => handleAppliquer(bid)}>OK</Button>
              <Button size="sm" variant="ghost" className="rounded-lg" onClick={() => setEditingBesoinId(null)}>✕</Button>
            </div>
          );
        }
        return (
          <span className="cursor-pointer hover:text-primary font-medium transition-colors" onClick={(e) => {
            e.stopPropagation();
            setEditingBesoinId(bid);
            setEditVolume(v ? String(v) : "");
          }}>
            {v ? Number(v).toLocaleString("fr-FR") : <span className="text-muted-foreground italic text-xs">Saisir</span>}
          </span>
        );
      },
    },
    { key: "genere_par", label: "Source" },
  ];

  const stressColumns: Column[] = [
    { key: "date_calcul", label: "Date" },
    { key: "niveau_stress", label: "Niveau", render: (v) => <Badge value={String(v)} type={stressBadgeType(String(v))} /> },
    { key: "besoin_total_saison", label: "Besoin total (L)", render: (v) => Number(v).toLocaleString("fr-FR") },
    { key: "deficit_calcule", label: "Déficit (L)", render: (v) => Number(v).toLocaleString("fr-FR") },
    { key: "alerte_active", label: "Alerte", render: (v) => <Badge value={v ? "Oui" : "Non"} type={v ? "danger" : "neutral"} /> },
    { key: "cultures_suggere", label: "Suggestions", render: (v) => v ? String(v) : "—" },
  ];

  return (
    <div className="space-y-7">
      <Link to="/parcelles" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors duration-200">
        <ArrowLeft className="w-4 h-4" /> Retour aux parcelles
      </Link>

      {/* Info card */}
      <div className="bg-card border border-border/60 rounded-2xl p-6 md:p-7 shadow-sm">
        <div className="flex flex-wrap gap-7">
          <div className="flex-1 min-w-[220px]">
            <h1 className="text-2xl font-black font-heading tracking-tight text-foreground mb-4">Parcelle #{data.id_parcelle as number}</h1>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30">
                <Layers className="w-4 h-4 text-primary shrink-0" />
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">Culture</p>
                  <p className="text-sm font-semibold text-foreground">{culture ? String(culture.nom_culture) : "Aucune"}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30">
                <MapPin className="w-4 h-4 text-accent shrink-0" />
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">Sol</p>
                  <p className="text-sm font-semibold text-foreground">{String(data.type_de_sol)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30">
                <Ruler className="w-4 h-4 text-secondary shrink-0" />
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">Surface</p>
                  <p className="text-sm font-semibold text-foreground">{String(data.surface)} ha</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30">
                <Droplets className="w-4 h-4 text-accent shrink-0" />
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">Capacité eau</p>
                  <p className="text-sm font-semibold text-foreground">{Number(data.capacite_eau).toLocaleString("fr-FR")} L</p>
                </div>
              </div>
            </div>
          </div>

          <div className="w-56 bg-muted/20 rounded-2xl p-5 border border-border/40">
            <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground mb-3">Saison</p>
            {saisonActive ? (
              <>
                <Badge value={`Jour ${daysSince}`} type="success" className="mb-2" />
                <p className="text-xs text-muted-foreground mb-4">Depuis {String(data.date_debut_saison)}</p>
                <Button variant="destructive" size="sm" className="w-full rounded-xl font-semibold" onClick={() => setConfirmFermer(true)}>
                  <Square className="w-3 h-3" /> Clôturer
                </Button>
              </>
            ) : (
              <>
                <Badge value="Inactive" type="neutral" className="mb-4" />
                <Button size="sm" className="w-full rounded-xl font-semibold" onClick={handleOuvrirSaison} disabled={!culture}>
                  <Play className="w-3 h-3" /> Démarrer
                </Button>
                {!culture && <p className="text-xs text-destructive mt-2">Assignez une culture d'abord</p>}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Weather sync + manual mesure */}
      {saisonActive && (
        <div className="bg-card border border-border/60 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">Ajouter une mesure climatique</p>
            {hasCoords && (
              <Button variant="outline" size="sm" className="rounded-xl font-semibold gap-1.5" onClick={handleWeatherSync} disabled={weatherSync.isPending}>
                {weatherSync.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CloudSun className="w-3.5 h-3.5" />}
                Sync météo 7j
              </Button>
            )}
          </div>
          {mesureError && <p className="text-sm text-destructive bg-destructive/[0.08] border border-destructive/20 p-3 rounded-xl">{mesureError}</p>}
          <div className="flex flex-wrap gap-3 items-end">
            <FormField label="Date" required className="flex-1 min-w-[130px]">
              <input type="date" className="field-input py-1.5" value={mesureForm.date_prevision} onChange={(e) => setMesureForm({ ...mesureForm, date_prevision: e.target.value })} />
            </FormField>
            <FormField label="Temp. (°C)" required className="w-28">
              <input type="number" step="0.1" className="field-input py-1.5" value={mesureForm.temperature} onChange={(e) => setMesureForm({ ...mesureForm, temperature: e.target.value })} />
            </FormField>
            <FormField label="Pluie (mm)" required className="w-28">
              <input type="number" step="0.1" min="0" className="field-input py-1.5" value={mesureForm.pluie} onChange={(e) => setMesureForm({ ...mesureForm, pluie: e.target.value })} />
            </FormField>
            <FormField label="Humidité (%)" className="w-28">
              <input type="number" step="0.1" min="0" max="100" className="field-input py-1.5" value={mesureForm.humidite} onChange={(e) => setMesureForm({ ...mesureForm, humidite: e.target.value })} />
            </FormField>
            <Button size="sm" className="rounded-xl font-semibold" onClick={handleAddMesure} disabled={createMesure.isPending}>
              {createMesure.isPending ? "..." : "Ajouter"}
            </Button>
          </div>
        </div>
      )}

      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Droplets className="w-4 h-4 text-accent" />
            <p className="text-sm font-bold uppercase tracking-[0.08em] text-muted-foreground">Besoins en eau</p>
          </div>
        </div>
        <DataTable columns={besoinColumns} rows={besoinsList} emptyMessage="Aucun besoin calculé" />
      </section>

      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-warning" />
            <p className="text-sm font-bold uppercase tracking-[0.08em] text-muted-foreground">Historique stress</p>
          </div>
          <Button variant="outline" size="sm" className="rounded-xl font-semibold" onClick={handleSimuler}><FlaskConical className="w-3.5 h-3.5" /> Simuler</Button>
        </div>
        <DataTable columns={stressColumns} rows={stressList} emptyMessage="Aucun enregistrement" />
      </section>

      <Modal open={confirmFermer} onClose={() => setConfirmFermer(false)} title="Clôturer la saison ?" size="sm" footer={
        <><Button variant="outline" onClick={() => setConfirmFermer(false)} className="rounded-xl">Annuler</Button><Button variant="destructive" onClick={handleFermerSaison} className="rounded-xl">Clôturer</Button></>
      }>
        <p className="text-sm text-muted-foreground">Un rapport de stress hydrique sera généré. Vous ne pourrez plus ajouter de mesures.</p>
      </Modal>

      <Modal open={!!simResult} onClose={() => setSimResult(null)} title="Simulation" footer={
        <Button variant="outline" onClick={() => setSimResult(null)} className="rounded-xl">Fermer</Button>
      }>
        {simResult && (
          <div className="space-y-3 text-sm">
            <div className="flex justify-between p-3 rounded-xl bg-muted/30"><span className="text-muted-foreground">Besoin total</span><span className="font-bold">{Number(simResult.besoin_total).toLocaleString("fr-FR")} L</span></div>
            <div className="flex justify-between p-3 rounded-xl bg-muted/30"><span className="text-muted-foreground">Capacité</span><span className="font-bold">{Number(simResult.capacite_source).toLocaleString("fr-FR")} L</span></div>
            <div className="flex justify-between p-3 rounded-xl bg-muted/30"><span className="text-muted-foreground">Déficit</span><span className="font-bold">{Number(simResult.deficit).toLocaleString("fr-FR")} L</span></div>
            <div className="flex justify-between items-center p-3 rounded-xl bg-muted/30"><span className="text-muted-foreground">Niveau</span><Badge value={String(simResult.niveau_stress)} type={stressBadgeType(String(simResult.niveau_stress))} /></div>
            {simResult.cultures_suggere && <div className="p-3 rounded-xl bg-muted/30"><span className="text-muted-foreground text-xs">Suggestions:</span><p className="mt-1 font-medium">{String(simResult.cultures_suggere)}</p></div>}
            <p className="text-xs text-muted-foreground italic pt-1 text-center">Simulation — non enregistrée.</p>
          </div>
        )}
      </Modal>
    </div>
  );
}
