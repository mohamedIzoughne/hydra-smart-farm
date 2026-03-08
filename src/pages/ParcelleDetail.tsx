import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { parcelles as api, mesures as mesuresApi, besoins as besoinsApi, stress as stressApi } from "@/lib/api";
import { useNotificationStore } from "@/lib/stores";
import { Badge, stressBadgeType } from "@/components/smart/Badge";
import { DataTable, type Column } from "@/components/smart/DataTable";
import { Modal } from "@/components/smart/Modal";
import { FormField } from "@/components/smart/FormField";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/smart/StatCard";
import { ArrowLeft, Play, Square, Plus, FlaskConical, Droplets, AlertTriangle } from "lucide-react";

export default function ParcelleDetail() {
  const { id } = useParams();
  const parcelleId = Number(id);
  const notify = useNotificationStore((s) => s.notify);

  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirmFermer, setConfirmFermer] = useState(false);
  const [simResult, setSimResult] = useState<Record<string, unknown> | null>(null);

  // Mesure form
  const [mesureForm, setMesureForm] = useState({ date_prevision: "", temperature: "", pluie: "", humidite: "" });
  const [mesureError, setMesureError] = useState("");
  const [mesureLoading, setMesureLoading] = useState(false);

  // Besoins
  const [besoinsList, setBesoinsList] = useState<Record<string, unknown>[]>([]);
  const [stressList, setStressList] = useState<Record<string, unknown>[]>([]);
  const [editingBesoinId, setEditingBesoinId] = useState<number | null>(null);
  const [editVolume, setEditVolume] = useState("");

  const fetchAll = async () => {
    setLoading(true);
    const [pRes, bRes, sRes] = await Promise.all([
      api.getById(parcelleId),
      api.historiqueBesoins(parcelleId, { per_page: "14" }),
      api.historiqueStress(parcelleId),
    ]);
    if (pRes.data) setData(pRes.data as Record<string, unknown>);
    if (bRes.data) setBesoinsList(bRes.data as Record<string, unknown>[]);
    if (sRes.data) setStressList(sRes.data as Record<string, unknown>[]);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, [id]);

  const handleOuvrirSaison = async () => {
    const res = await api.ouvrirSaison(parcelleId);
    if (res.error) { notify("error", res.error); return; }
    notify("success", "Saison ouverte !");
    fetchAll();
  };

  const handleFermerSaison = async () => {
    const res = await api.fermerSaison(parcelleId);
    if (res.error) { notify("error", res.error); return; }
    notify("success", "Saison clôturée. Audit de stress généré.");
    setConfirmFermer(false);
    fetchAll();
  };

  const handleAddMesure = async () => {
    setMesureError("");
    setMesureLoading(true);
    const payload: Record<string, unknown> = {
      id_parcelle: parcelleId,
      date_prevision: mesureForm.date_prevision,
      temperature: parseFloat(mesureForm.temperature),
      pluie: parseFloat(mesureForm.pluie),
    };
    if (mesureForm.humidite) payload.humidite = parseFloat(mesureForm.humidite);
    const res = await mesuresApi.create(payload);
    setMesureLoading(false);
    if (res.error) { setMesureError(res.error); return; }
    notify("success", "Mesure ajoutée" + (res.besoin_genere ? " — besoin calculé automatiquement" : ""));
    setMesureForm({ date_prevision: "", temperature: "", pluie: "", humidite: "" });
    fetchAll();
  };

  const handleAppliquer = async (besoinId: number) => {
    const vol = parseFloat(editVolume);
    if (isNaN(vol) || vol < 0) { notify("error", "Volume invalide"); return; }
    const res = await besoinsApi.appliquer(besoinId, vol);
    if (res.error) { notify("error", res.error); return; }
    notify("success", "Volume appliqué enregistré");
    setEditingBesoinId(null);
    fetchAll();
  };

  const handleSimuler = async () => {
    const res = await stressApi.simuler(parcelleId);
    if (res.error) { notify("error", res.error); return; }
    setSimResult(res.simulation as Record<string, unknown>);
  };

  if (loading) return <div className="animate-pulse h-60 bg-muted rounded-lg" />;
  if (!data) return <p className="text-muted-foreground">Parcelle non trouvée</p>;

  const culture = data.culture as Record<string, unknown> | null;
  const saisonActive = Boolean(data.saison_active);
  const daysSince = data.date_debut_saison
    ? Math.floor((Date.now() - new Date(String(data.date_debut_saison)).getTime()) / 86400000)
    : 0;

  const besoinColumns: Column[] = [
    { key: "date_besoin", label: "Date", sortable: true },
    { key: "volume_recommande", label: "Volume recommandé (L)", render: (v) => Number(v).toLocaleString("fr-FR") },
    {
      key: "volume_applique", label: "Volume appliqué (L)", render: (v, row) => {
        const bid = row.id_besoin as number;
        if (editingBesoinId === bid) {
          return (
            <div className="flex items-center gap-1">
              <input type="number" className="w-28 border rounded px-2 py-1 text-sm bg-background" value={editVolume}
                onChange={(e) => setEditVolume(e.target.value)} autoFocus onKeyDown={(e) => e.key === "Enter" && handleAppliquer(bid)} />
              <Button size="sm" onClick={() => handleAppliquer(bid)}>OK</Button>
              <Button size="sm" variant="ghost" onClick={() => setEditingBesoinId(null)}>✕</Button>
            </div>
          );
        }
        return (
          <span className="cursor-pointer hover:text-primary" onClick={(e) => {
            e.stopPropagation();
            setEditingBesoinId(bid);
            setEditVolume(v ? String(v) : "");
          }}>
            {v ? Number(v).toLocaleString("fr-FR") : <span className="text-muted-foreground italic">Cliquer pour saisir</span>}
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
    { key: "cultures_suggere", label: "Cultures suggérées", render: (v) => v ? String(v) : "—" },
  ];

  return (
    <div className="space-y-6">
      <Link to="/parcelles" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="w-4 h-4" /> Retour
      </Link>

      {/* Info panel */}
      <div className="bg-card border rounded-xl p-6">
        <div className="flex flex-wrap gap-6">
          <div className="flex-1 min-w-[200px]">
            <h1 className="text-xl font-bold font-heading">Parcelle #{data.id_parcelle as number}</h1>
            <p className="text-muted-foreground mt-1">Propriétaire: {String(data.agriculteur_nom || data.id_agriculteur)}</p>
            <div className="grid grid-cols-2 gap-x-8 gap-y-2 mt-4 text-sm">
              <span className="text-muted-foreground">Culture</span><span>{culture ? String(culture.nom_culture) : "Aucune"}</span>
              <span className="text-muted-foreground">Sol</span><span>{String(data.type_de_sol)}</span>
              <span className="text-muted-foreground">Surface</span><span>{String(data.surface)} ha</span>
              <span className="text-muted-foreground">Capacité eau</span><span>{Number(data.capacite_eau).toLocaleString("fr-FR")} L</span>
              {data.latitude && <><span className="text-muted-foreground">Coordonnées</span><span>{String(data.latitude)}, {String(data.longitude)}</span></>}
            </div>
          </div>

          {/* Season control */}
          <div className="w-64 bg-muted/40 rounded-lg p-4 border">
            <h3 className="font-semibold text-sm mb-3">Contrôle de saison</h3>
            {saisonActive ? (
              <>
                <Badge value={`Active depuis ${daysSince} jours`} type="success" className="mb-3" />
                <p className="text-xs text-muted-foreground mb-3">Début: {String(data.date_debut_saison)}</p>
                <Button variant="destructive" className="w-full" onClick={() => setConfirmFermer(true)}>
                  <Square className="w-4 h-4" /> Fermer la saison
                </Button>
              </>
            ) : (
              <>
                <Badge value="Inactive" type="neutral" className="mb-3" />
                <Button className="w-full" onClick={handleOuvrirSaison} disabled={!culture}>
                  <Play className="w-4 h-4" /> Ouvrir la saison
                </Button>
                {!culture && <p className="text-xs text-destructive mt-2">Assignez une culture d'abord</p>}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Add mesure form */}
      {saisonActive && (
        <div className="bg-card border rounded-xl p-5">
          <h2 className="text-lg font-semibold font-heading mb-3 flex items-center gap-2"><Plus className="w-4 h-4" /> Ajouter une mesure climatique</h2>
          {mesureError && <p className="text-sm text-destructive bg-destructive/10 p-2 rounded mb-3">{mesureError}</p>}
          <div className="flex flex-wrap gap-3 items-end">
            <FormField label="Date prévision" required className="flex-1 min-w-[140px]">
              <input type="date" className="w-full border rounded-md px-3 py-2 text-sm bg-background" value={mesureForm.date_prevision} onChange={(e) => setMesureForm({ ...mesureForm, date_prevision: e.target.value })} />
            </FormField>
            <FormField label="Température (°C)" required className="w-32">
              <input type="number" step="0.1" className="w-full border rounded-md px-3 py-2 text-sm bg-background" value={mesureForm.temperature} onChange={(e) => setMesureForm({ ...mesureForm, temperature: e.target.value })} />
            </FormField>
            <FormField label="Pluie (mm)" required className="w-32">
              <input type="number" step="0.1" min="0" className="w-full border rounded-md px-3 py-2 text-sm bg-background" value={mesureForm.pluie} onChange={(e) => setMesureForm({ ...mesureForm, pluie: e.target.value })} />
            </FormField>
            <FormField label="Humidité (%)" className="w-32">
              <input type="number" step="0.1" min="0" max="100" className="w-full border rounded-md px-3 py-2 text-sm bg-background" value={mesureForm.humidite} onChange={(e) => setMesureForm({ ...mesureForm, humidite: e.target.value })} />
            </FormField>
            <Button onClick={handleAddMesure} disabled={mesureLoading} className="mb-[1px]">
              {mesureLoading ? "..." : "Ajouter"}
            </Button>
          </div>
        </div>
      )}

      {/* Besoins en eau */}
      <section>
        <h2 className="text-lg font-semibold font-heading mb-3 flex items-center gap-2"><Droplets className="w-5 h-5 text-accent" /> Besoins en Eau</h2>
        <DataTable columns={besoinColumns} rows={besoinsList} emptyMessage="Aucun besoin calculé" />
      </section>

      {/* Stress historique */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold font-heading flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-warning" /> Historique Stress</h2>
          <Button variant="outline" size="sm" onClick={handleSimuler}><FlaskConical className="w-4 h-4" /> Simuler</Button>
        </div>
        <DataTable columns={stressColumns} rows={stressList} emptyMessage="Aucun enregistrement" />
      </section>

      {/* Confirm fermer saison */}
      <Modal open={confirmFermer} onClose={() => setConfirmFermer(false)} title="Fermer la saison ?" size="sm" footer={
        <><Button variant="outline" onClick={() => setConfirmFermer(false)}>Annuler</Button><Button variant="destructive" onClick={handleFermerSaison}>Confirmer la clôture</Button></>
      }>
        <p className="text-sm text-muted-foreground">Cette action génère le rapport de stress hydrique et clôture la saison. Vous ne pourrez plus ajouter de mesures.</p>
      </Modal>

      {/* Simulation result */}
      <Modal open={!!simResult} onClose={() => setSimResult(null)} title="Résultat de la simulation" footer={
        <Button variant="outline" onClick={() => setSimResult(null)}>Fermer</Button>
      }>
        {simResult && (
          <div className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Besoin total saison</span><span className="font-semibold">{Number(simResult.besoin_total).toLocaleString("fr-FR")} L</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Capacité source</span><span className="font-semibold">{Number(simResult.capacite_source).toLocaleString("fr-FR")} L</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Déficit</span><span className="font-semibold">{Number(simResult.deficit).toLocaleString("fr-FR")} L</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Niveau stress</span><Badge value={String(simResult.niveau_stress)} type={stressBadgeType(String(simResult.niveau_stress))} /></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Alerte</span><Badge value={simResult.alerte_active ? "Oui" : "Non"} type={simResult.alerte_active ? "danger" : "neutral"} /></div>
            {simResult.cultures_suggere && <div><span className="text-muted-foreground">Cultures suggérées:</span><p className="mt-1">{String(simResult.cultures_suggere)}</p></div>}
            <p className="text-xs text-muted-foreground italic mt-2">Simulation uniquement — non enregistrée en base.</p>
          </div>
        )}
      </Modal>
    </div>
  );
}
