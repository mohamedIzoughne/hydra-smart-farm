import React, { useState, useMemo } from "react";
import { useParcelles, useMesures, useCreateMesure, useUpdateMesure, useDeleteMesure } from "@/hooks/useApi";
import { useNotificationStore } from "@/lib/stores";
import { DataTable, type Column } from "@/components/smart/DataTable";
import { Modal } from "@/components/smart/Modal";
import { FormField } from "@/components/smart/FormField";
import { ConfirmDialog } from "@/components/smart/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2, Info, CloudRain } from "lucide-react";

export default function MesuresPage() {
  const notify = useNotificationStore((s) => s.notify);
  const [parcelleId, setParcelleId] = useState("");
  const [depuis, setDepuis] = useState("");
  const [jusqu, setJusqu] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ date_prevision: "", temperature: "", pluie: "", humidite: "", source_api: "OpenMeteo" });
  const [createError, setCreateError] = useState("");

  const [editItem, setEditItem] = useState<Record<string, unknown> | null>(null);
  const [editForm, setEditForm] = useState({ temperature: "", pluie: "", humidite: "", source_api: "" });
  const [editError, setEditError] = useState("");
  const [recalcBanner, setRecalcBanner] = useState(false);

  const [deleteId, setDeleteId] = useState<number | null>(null);

  const { data: parcellesData } = useParcelles({ include_culture: "true" });
  const parcelleOptions = useMemo(() => {
    const opts = (parcellesData?.data ?? []).map((p) => ({
      id: p.id_parcelle as number,
      label: `#${p.id_parcelle} — ${(p.culture as Record<string, unknown> | null)?.nom_culture || "Sans culture"} (${p.type_de_sol})`,
    }));
    // Auto-select first parcelle
    if (opts.length && !parcelleId) {
      setTimeout(() => setParcelleId(String(opts[0].id)), 0);
    }
    return opts;
  }, [parcellesData]);

  const mesureParams = useMemo(() => {
    const p: Record<string, string> = {};
    if (parcelleId) p.parcelle_id = parcelleId;
    if (depuis) p.depuis = depuis;
    if (jusqu) p.jusqu = jusqu;
    return p;
  }, [parcelleId, depuis, jusqu]);

  const { data: mesuresData, isLoading: loading } = useMesures(mesureParams);
  const rows = mesuresData?.data ?? [];

  const createMutation = useCreateMesure();
  const updateMutation = useUpdateMesure();
  const deleteMutation = useDeleteMesure();

  const handleCreate = async () => {
    setCreateError("");
    const payload: Record<string, unknown> = {
      id_parcelle: parseInt(parcelleId),
      date_prevision: createForm.date_prevision,
      temperature: parseFloat(createForm.temperature),
      pluie: parseFloat(createForm.pluie),
      source_api: createForm.source_api || "OpenMeteo",
    };
    if (createForm.humidite) payload.humidite = parseFloat(createForm.humidite);
    try {
      const res = await createMutation.mutateAsync(payload);
      notify("success", "Mesure ajoutée" + (res.besoin_genere ? " — besoin J+1 calculé" : ""));
      setCreateOpen(false);
      setCreateForm({ date_prevision: "", temperature: "", pluie: "", humidite: "", source_api: "OpenMeteo" });
    } catch (e: any) { setCreateError(e.message); }
  };

  const handleEdit = async () => {
    if (!editItem) return;
    setEditError("");
    const payload: Record<string, unknown> = {};
    if (editForm.temperature) payload.temperature = parseFloat(editForm.temperature);
    if (editForm.pluie) payload.pluie = parseFloat(editForm.pluie);
    if (editForm.humidite !== "") payload.humidite = editForm.humidite ? parseFloat(editForm.humidite) : null;
    if (editForm.source_api) payload.source_api = editForm.source_api;
    try {
      await updateMutation.mutateAsync({ id: editItem.id_mesure as number, data: payload });
      setRecalcBanner(true);
      setTimeout(() => setRecalcBanner(false), 5000);
      notify("success", "Mesure mise à jour");
      setEditItem(null);
    } catch (e: any) { setEditError(e.message); }
  };

  const handleDelete = async () => {
    if (deleteId === null) return;
    try {
      await deleteMutation.mutateAsync(deleteId);
      notify("success", "Mesure supprimée");
      setDeleteId(null);
    } catch (e: any) {
      notify("error", e.message.includes("besoin") ? "Ce relevé est lié à un besoin en eau — supprimez d'abord le besoin" : e.message);
      setDeleteId(null);
    }
  };

  const columns: Column[] = [
    { key: "id_mesure", label: "ID" },
    { key: "date_prevision", label: "Date prévision", sortable: true },
    { key: "temperature", label: "Temp. (°C)", sortable: true, render: (v) => <span className="font-semibold">{String(v)}°</span> },
    { key: "pluie", label: "Pluie (mm)", sortable: true },
    { key: "humidite", label: "Humidité (%)", render: (v) => v != null ? String(v) : "—" },
    { key: "source_api", label: "Source" },
    {
      key: "actions", label: "Actions", render: (_, row) => (
        <div className="table-actions" onClick={(e) => e.stopPropagation()}>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => {
            setEditItem(row);
            setEditForm({
              temperature: String(row.temperature ?? ""),
              pluie: String(row.pluie ?? ""),
              humidite: row.humidite != null ? String(row.humidite) : "",
              source_api: String(row.source_api ?? "OpenMeteo"),
            });
            setEditError("");
          }}>
            <Pencil className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-destructive" onClick={() => setDeleteId(row.id_mesure as number)}>
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-accent/[0.08] flex items-center justify-center">
            <CloudRain className="w-5 h-5 text-accent" />
          </div>
          <div>
            <h1 className="page-title">Mesures Climatiques</h1>
            <p className="text-sm text-muted-foreground">Relevés météo par parcelle</p>
          </div>
        </div>
        <Button onClick={() => { setCreateOpen(true); setCreateError(""); }} disabled={!parcelleId} className="rounded-full px-5 shadow-md shadow-primary/15">
          <Plus className="w-4 h-4" /> Ajouter mesure
        </Button>
      </div>

      {recalcBanner && (
        <div className="flex items-center gap-2.5 bg-accent/[0.08] border border-accent/20 text-accent rounded-2xl px-5 py-3 text-sm font-medium animate-slide-in">
          <Info className="w-4 h-4 shrink-0" /> Le besoin J+1 a été recalculé automatiquement.
        </div>
      )}

      <div className="filter-bar rounded-2xl">
        <div className="flex-1 max-w-xs">
          <label className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground block mb-1.5">Parcelle</label>
          <select className="field-input py-1.5" value={parcelleId} onChange={(e) => setParcelleId(e.target.value)}>
            {!parcelleOptions.length && <option value="">Chargement...</option>}
            {parcelleOptions.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground block mb-1.5">Depuis</label>
          <input type="date" className="field-input py-1.5" value={depuis} onChange={(e) => setDepuis(e.target.value)} />
        </div>
        <div>
          <label className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground block mb-1.5">Jusqu'à</label>
          <input type="date" className="field-input py-1.5" value={jusqu} onChange={(e) => setJusqu(e.target.value)} />
        </div>
      </div>

      <DataTable columns={columns} rows={rows} loading={loading} emptyMessage="Aucune mesure pour cette parcelle" />

      {/* Create Modal */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Ajouter une mesure" footer={
        <><Button variant="outline" onClick={() => setCreateOpen(false)} className="rounded-xl">Annuler</Button><Button onClick={handleCreate} className="rounded-xl">Ajouter</Button></>
      }>
        <div className="space-y-5">
          {createError && <p className="text-sm text-destructive bg-destructive/[0.08] border border-destructive/20 p-3 rounded-xl">{createError}</p>}
          <FormField label="Date prévision" required>
            <input type="date" className="field-input" value={createForm.date_prevision} onChange={(e) => setCreateForm({ ...createForm, date_prevision: e.target.value })} />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Température (°C)" required>
              <input type="number" step="0.1" min="-50" max="60" className="field-input" value={createForm.temperature} onChange={(e) => setCreateForm({ ...createForm, temperature: e.target.value })} />
            </FormField>
            <FormField label="Pluie (mm)" required>
              <input type="number" step="0.1" min="0" className="field-input" value={createForm.pluie} onChange={(e) => setCreateForm({ ...createForm, pluie: e.target.value })} />
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Humidité (%)">
              <input type="number" step="0.1" min="0" max="100" className="field-input" value={createForm.humidite} onChange={(e) => setCreateForm({ ...createForm, humidite: e.target.value })} />
            </FormField>
            <FormField label="Source API">
              <input className="field-input" value={createForm.source_api} onChange={(e) => setCreateForm({ ...createForm, source_api: e.target.value })} />
            </FormField>
          </div>
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal open={!!editItem} onClose={() => setEditItem(null)} title="Modifier la mesure" footer={
        <><Button variant="outline" onClick={() => setEditItem(null)} className="rounded-xl">Annuler</Button><Button onClick={handleEdit} className="rounded-xl">Enregistrer</Button></>
      }>
        <div className="space-y-5">
          {editError && <p className="text-sm text-destructive bg-destructive/[0.08] border border-destructive/20 p-3 rounded-xl">{editError}</p>}
          <p className="text-xs text-muted-foreground bg-muted/50 rounded-xl px-3 py-2">Date et parcelle ne sont pas modifiables.</p>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Température (°C)">
              <input type="number" step="0.1" min="-50" max="60" className="field-input" value={editForm.temperature} onChange={(e) => setEditForm({ ...editForm, temperature: e.target.value })} />
            </FormField>
            <FormField label="Pluie (mm)">
              <input type="number" step="0.1" min="0" className="field-input" value={editForm.pluie} onChange={(e) => setEditForm({ ...editForm, pluie: e.target.value })} />
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Humidité (%)">
              <input type="number" step="0.1" min="0" max="100" className="field-input" value={editForm.humidite} onChange={(e) => setEditForm({ ...editForm, humidite: e.target.value })} />
            </FormField>
            <FormField label="Source API">
              <input className="field-input" value={editForm.source_api} onChange={(e) => setEditForm({ ...editForm, source_api: e.target.value })} />
            </FormField>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Supprimer cette mesure ?"
        message="Si un besoin en eau est lié à cette mesure, vous devrez d'abord le supprimer."
        confirmLabel="Supprimer"
        dangerMode
      />
    </div>
  );
}
