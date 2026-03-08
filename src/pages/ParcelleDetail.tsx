import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { parcelles as api, mesures as mesuresApi, besoins as besoinsApi, stress as stressApi } from "@/lib/api";
import { useNotificationStore } from "@/lib/stores";
import { Badge, stressBadgeType } from "@/components/smart/Badge";
import { DataTable, type Column } from "@/components/smart/DataTable";
import { Modal } from "@/components/smart/Modal";
import { FormField } from "@/components/smart/FormField";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Play, Square, Plus, FlaskConical, Droplets, AlertTriangle } from "lucide-react";

export default function ParcelleDetail() {
  const { id } = useParams();
  const parcelleId = Number(id);
  const notify = useNotificationStore((s) => s.notify);

  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirmFermer, setConfirmFermer] = useState(false);
  const [simResult, setSimResult] = useState<Record<string, unknown> | null>(null);

  const [mesureForm, setMesureForm] = useState({ date_prevision: "", temperature: "", pluie: "", humidite: "" });
  const [mesureError, setMesureError] = useState("");
  const [mesureLoading, setMesureLoading] = useState(false);

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
    { key: "volume_recommande", label: "Recommandé (L)", render: (v) => Number(v).toLocaleString("fr-FR") },
    {
      key: "volume_applique", label: "Appliqué (L)", render: (v, row) => {
        const bid = row.id_besoin as number;
        if (editingBesoinId === bid) {
          return (
            <div className="flex items-center gap-1">
              <input type="number" className="w-24 border rounded px-2 py-1 text-sm bg-background" value={editVolume}
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
    <div className="space-y-6">
      <Link to="/parcelles" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="w-4 h-4" /> Parcelles
      </Link>

      <div className="bg-card border rounded-lg p-5">
        <div className="flex flex-wrap gap-6">
          <div className="flex-1 min-w-[200px]">
            <h1 className="text-xl font-bold font-heading">Parcelle #{data.id_parcelle as number}</h1>
            <div className="grid grid-cols-2 gap-x-8 gap-y-1.5 mt-3 text-sm">
              <span className="text-muted-foreground">Culture</span><span>{culture ? String(culture.nom_culture) : "Aucune"}</span>
              <span className="text-muted-foreground">Sol</span><span>{String(data.type_de_sol)}</span>
              <span className="text-muted-foreground">Surface</span><span>{String(data.surface)} ha</span>
              <span className="text-muted-foreground">Capacité eau</span><span>{Number(data.capacite_eau).toLocaleString("fr-FR")} L</span>
              {data.latitude && <><span className="text-muted-foreground">Coordonnées</span><span>{String(data.latitude)}, {String(data.longitude)}</span></>}
            </div>
          </div>

          <div className="w-56 bg-muted/40 rounded-lg p-4 border">
            <p className="section-label !mb-2">Saison</p>
            {saisonActive ? (
              <>
                <Badge value={`Jour ${daysSince}`} type="success" className="mb-2" />
                <p className="text-xs text-muted-foreground mb-3">Depuis {String(data.date_debut_saison)}</p>
                <Button variant="destructive" size="sm" className="w-full" onClick={() => setConfirmFermer(true)}>
                  <Square className="w-3 h-3" /> Clôturer
                </Button>
              </>
            ) : (
              <>
                <Badge value="Inactive" type="neutral" className="mb-3" />
                <Button size="sm" className="w-full" onClick={handleOuvrirSaison} disabled={!culture}>
                  <Play className="w-3 h-3" /> Démarrer
                </Button>
                {!culture && <p className="text-xs text-destructive mt-1.5">Assignez une culture d'abord</p>}
              </>
            )}
          </div>
        </div>
      </div>

      {saisonActive && (
        <div className="bg-card border rounded-lg p-5">
          <p className="section-label">Ajouter une mesure climatique</p>
          {mesureError && <p className="text-sm text-destructive bg-destructive/10 p-2 rounded mb-3">{mesureError}</p>}
          <div className="flex flex-wrap gap-3 items-end">
            <FormField label="Date" required className="flex-1 min-w-[130px]">
              <input type="date" className="w-full border rounded-md px-3 py-1.5 text-sm bg-background" value={mesureForm.date_prevision} onChange={(e) => setMesureForm({ ...mesureForm, date_prevision: e.target.value })} />
            </FormField>
            <FormField label="Temp. (°C)" required className="w-28">
              <input type="number" step="0.1" className="w-full border rounded-md px-3 py-1.5 text-sm bg-background" value={mesureForm.temperature} onChange={(e) => setMesureForm({ ...mesureForm, temperature: e.target.value })} />
            </FormField>
            <FormField label="Pluie (mm)" required className="w-28">
              <input type="number" step="0.1" min="0" className="w-full border rounded-md px-3 py-1.5 text-sm bg-background" value={mesureForm.pluie} onChange={(e) => setMesureForm({ ...mesureForm, pluie: e.target.value })} />
            </FormField>
            <FormField label="Humidité (%)" className="w-28">
              <input type="number" step="0.1" min="0" max="100" className="w-full border rounded-md px-3 py-1.5 text-sm bg-background" value={mesureForm.humidite} onChange={(e) => setMesureForm({ ...mesureForm, humidite: e.target.value })} />
            </FormField>
            <Button size="sm" onClick={handleAddMesure} disabled={mesureLoading}>
              {mesureLoading ? "..." : "Ajouter"}
            </Button>
          </div>
        </div>
      )}

      <section>
        <div className="flex items-center justify-between mb-3">
          <p className="section-label flex items-center gap-1.5"><Droplets className="w-3.5 h-3.5 text-accent" /> Besoins en eau</p>
        </div>
        <DataTable columns={besoinColumns} rows={besoinsList} emptyMessage="Aucun besoin calculé" />
      </section>

      <section>
        <div className="flex items-center justify-between mb-3">
          <p className="section-label flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5 text-warning" /> Historique stress</p>
          <Button variant="outline" size="sm" onClick={handleSimuler}><FlaskConical className="w-3.5 h-3.5" /> Simuler</Button>
        </div>
        <DataTable columns={stressColumns} rows={stressList} emptyMessage="Aucun enregistrement" />
      </section>

      <Modal open={confirmFermer} onClose={() => setConfirmFermer(false)} title="Clôturer la saison ?" size="sm" footer={
        <><Button variant="outline" onClick={() => setConfirmFermer(false)}>Annuler</Button><Button variant="destructive" onClick={handleFermerSaison}>Clôturer</Button></>
      }>
        <p className="text-sm text-muted-foreground">Un rapport de stress hydrique sera généré. Vous ne pourrez plus ajouter de mesures.</p>
      </Modal>

      <Modal open={!!simResult} onClose={() => setSimResult(null)} title="Simulation" footer={
        <Button variant="outline" onClick={() => setSimResult(null)}>Fermer</Button>
      }>
        {simResult && (
          <div className="space-y-2.5 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Besoin total</span><span className="font-medium">{Number(simResult.besoin_total).toLocaleString("fr-FR")} L</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Capacité</span><span className="font-medium">{Number(simResult.capacite_source).toLocaleString("fr-FR")} L</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Déficit</span><span className="font-medium">{Number(simResult.deficit).toLocaleString("fr-FR")} L</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Niveau</span><Badge value={String(simResult.niveau_stress)} type={stressBadgeType(String(simResult.niveau_stress))} /></div>
            {simResult.cultures_suggere && <div><span className="text-muted-foreground">Suggestions:</span><p className="mt-0.5">{String(simResult.cultures_suggere)}</p></div>}
            <p className="text-xs text-muted-foreground italic pt-1">Simulation — non enregistrée.</p>
          </div>
        )}
      </Modal>
    </div>
  );
}
