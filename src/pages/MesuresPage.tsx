import React, { useEffect, useState } from "react";
import { mesures as api, parcelles as parcellesApi } from "@/lib/api";
import { useNotificationStore } from "@/lib/stores";
import { DataTable, type Column } from "@/components/smart/DataTable";
import { Modal } from "@/components/smart/Modal";
import { FormField } from "@/components/smart/FormField";
import { ConfirmDialog } from "@/components/smart/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2, Info } from "lucide-react";

export default function MesuresPage() {
  const notify = useNotificationStore((s) => s.notify);
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [parcelleOptions, setParcelleOptions] = useState<{ id: number; label: string }[]>([]);
  const [parcelleId, setParcelleId] = useState("");
  const [depuis, setDepuis] = useState("");
  const [jusqu, setJusqu] = useState("");

  // Create modal
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ date_prevision: "", temperature: "", pluie: "", humidite: "", source_api: "OpenMeteo" });
  const [createError, setCreateError] = useState("");

  // Edit modal
  const [editItem, setEditItem] = useState<Record<string, unknown> | null>(null);
  const [editForm, setEditForm] = useState({ temperature: "", pluie: "", humidite: "", source_api: "" });
  const [editError, setEditError] = useState("");
  const [recalcBanner, setRecalcBanner] = useState(false);

  // Delete confirm
  const [deleteId, setDeleteId] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      const res = await parcellesApi.getAll({ include_culture: "true" });
      if (res.data) {
        const opts = (res.data as Record<string, unknown>[]).map((p) => ({
          id: p.id_parcelle as number,
          label: `#${p.id_parcelle} — ${(p.culture as Record<string, unknown> | null)?.nom_culture || "Sans culture"} (${p.type_de_sol})`,
        }));
        setParcelleOptions(opts);
        if (opts.length && !parcelleId) setParcelleId(String(opts[0].id));
      }
    })();
  }, []);

  const fetchData = async () => {
    if (!parcelleId) { setRows([]); setLoading(false); return; }
    setLoading(true);
    const params: Record<string, string> = { parcelle_id: parcelleId };
    if (depuis) params.depuis = depuis;
    if (jusqu) params.jusqu = jusqu;
    const res = await api.getAll(params);
    if (res.data) setRows(res.data as Record<string, unknown>[]);
    else if (res.error) notify("error", res.error);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [parcelleId, depuis, jusqu]);

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
    const res = await api.create(payload);
    if (res.error) { setCreateError(res.error); return; }
    notify("success", "Mesure ajoutée" + (res.besoin_genere ? " — besoin J+1 calculé" : ""));
    setCreateOpen(false);
    setCreateForm({ date_prevision: "", temperature: "", pluie: "", humidite: "", source_api: "OpenMeteo" });
    fetchData();
  };

  const handleEdit = async () => {
    if (!editItem) return;
    setEditError("");
    const payload: Record<string, unknown> = {};
    if (editForm.temperature) payload.temperature = parseFloat(editForm.temperature);
    if (editForm.pluie) payload.pluie = parseFloat(editForm.pluie);
    if (editForm.humidite !== "") payload.humidite = editForm.humidite ? parseFloat(editForm.humidite) : null;
    if (editForm.source_api) payload.source_api = editForm.source_api;
    const res = await api.update(editItem.id_mesure as number, payload);
    if (res.error) { setEditError(res.error); return; }
    setRecalcBanner(true);
    setTimeout(() => setRecalcBanner(false), 5000);
    notify("success", "Mesure mise à jour");
    setEditItem(null);
    fetchData();
  };

  const handleDelete = async () => {
    if (deleteId === null) return;
    const res = await api.delete(deleteId);
    if (res.error) {
      notify("error", res.error.includes("409") || res.error.includes("besoin") || res.error.includes("lié")
        ? "Ce relevé est lié à un besoin en eau — supprimez d'abord le besoin"
        : res.error);
      setDeleteId(null);
      return;
    }
    notify("success", "Mesure supprimée");
    setDeleteId(null);
    fetchData();
  };

  const columns: Column[] = [
    { key: "id_mesure", label: "ID" },
    { key: "date_prevision", label: "Date prévision", sortable: true },
    { key: "temperature", label: "Temp. (°C)", sortable: true },
    { key: "pluie", label: "Pluie (mm)", sortable: true },
    { key: "humidite", label: "Humidité (%)", render: (v) => v != null ? String(v) : "—" },
    { key: "source_api", label: "Source" },
    {
      key: "actions", label: "Actions", render: (_, row) => (
        <div className="table-actions" onClick={(e) => e.stopPropagation()}>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {
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
          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteId(row.id_mesure as number)}>
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="page-header">
        <h1 className="page-title">Mesures Climatiques</h1>
        <Button onClick={() => { setCreateOpen(true); setCreateError(""); }} disabled={!parcelleId}>
          <Plus className="w-4 h-4" /> Ajouter mesure
        </Button>
      </div>

      {recalcBanner && (
        <div className="flex items-center gap-2 bg-accent/10 border border-accent/20 text-accent rounded-lg px-4 py-2 text-sm animate-slide-in">
          <Info className="w-4 h-4" /> Le besoin J+1 a été recalculé automatiquement.
        </div>
      )}

      <div className="filter-bar">
        <div className="flex-1 max-w-xs">
          <label className="text-xs text-muted-foreground block mb-1">Parcelle</label>
          <select className="w-full border rounded-md px-3 py-2 text-sm bg-background" value={parcelleId} onChange={(e) => setParcelleId(e.target.value)}>
            {!parcelleOptions.length && <option value="">Chargement...</option>}
            {parcelleOptions.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground block mb-1">Depuis</label>
          <input type="date" className="border rounded-md px-3 py-2 text-sm bg-background" value={depuis} onChange={(e) => setDepuis(e.target.value)} />
        </div>
        <div>
          <label className="text-xs text-muted-foreground block mb-1">Jusqu'à</label>
          <input type="date" className="border rounded-md px-3 py-2 text-sm bg-background" value={jusqu} onChange={(e) => setJusqu(e.target.value)} />
        </div>
      </div>

      <DataTable columns={columns} rows={rows} loading={loading} emptyMessage="Aucune mesure pour cette parcelle" />

      {/* Create Modal */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Ajouter une mesure" footer={
        <><Button variant="outline" onClick={() => setCreateOpen(false)}>Annuler</Button><Button onClick={handleCreate}>Ajouter</Button></>
      }>
        <div className="space-y-4">
          {createError && <p className="text-sm text-destructive bg-destructive/10 p-2 rounded">{createError}</p>}
          <FormField label="Date prévision" required>
            <input type="date" className="w-full border rounded-md px-3 py-2 text-sm bg-background" value={createForm.date_prevision} onChange={(e) => setCreateForm({ ...createForm, date_prevision: e.target.value })} />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Température (°C)" required>
              <input type="number" step="0.1" min="-50" max="60" className="w-full border rounded-md px-3 py-2 text-sm bg-background" value={createForm.temperature} onChange={(e) => setCreateForm({ ...createForm, temperature: e.target.value })} />
            </FormField>
            <FormField label="Pluie (mm)" required>
              <input type="number" step="0.1" min="0" className="w-full border rounded-md px-3 py-2 text-sm bg-background" value={createForm.pluie} onChange={(e) => setCreateForm({ ...createForm, pluie: e.target.value })} />
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Humidité (%)">
              <input type="number" step="0.1" min="0" max="100" className="w-full border rounded-md px-3 py-2 text-sm bg-background" value={createForm.humidite} onChange={(e) => setCreateForm({ ...createForm, humidite: e.target.value })} />
            </FormField>
            <FormField label="Source API">
              <input className="w-full border rounded-md px-3 py-2 text-sm bg-background" value={createForm.source_api} onChange={(e) => setCreateForm({ ...createForm, source_api: e.target.value })} />
            </FormField>
          </div>
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal open={!!editItem} onClose={() => setEditItem(null)} title="Modifier la mesure" footer={
        <><Button variant="outline" onClick={() => setEditItem(null)}>Annuler</Button><Button onClick={handleEdit}>Enregistrer</Button></>
      }>
        <div className="space-y-4">
          {editError && <p className="text-sm text-destructive bg-destructive/10 p-2 rounded">{editError}</p>}
          <p className="text-xs text-muted-foreground">Date et parcelle ne sont pas modifiables.</p>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Température (°C)">
              <input type="number" step="0.1" min="-50" max="60" className="w-full border rounded-md px-3 py-2 text-sm bg-background" value={editForm.temperature} onChange={(e) => setEditForm({ ...editForm, temperature: e.target.value })} />
            </FormField>
            <FormField label="Pluie (mm)">
              <input type="number" step="0.1" min="0" className="w-full border rounded-md px-3 py-2 text-sm bg-background" value={editForm.pluie} onChange={(e) => setEditForm({ ...editForm, pluie: e.target.value })} />
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Humidité (%)">
              <input type="number" step="0.1" min="0" max="100" className="w-full border rounded-md px-3 py-2 text-sm bg-background" value={editForm.humidite} onChange={(e) => setEditForm({ ...editForm, humidite: e.target.value })} />
            </FormField>
            <FormField label="Source API">
              <input className="w-full border rounded-md px-3 py-2 text-sm bg-background" value={editForm.source_api} onChange={(e) => setEditForm({ ...editForm, source_api: e.target.value })} />
            </FormField>
          </div>
        </div>
      </Modal>

      {/* Delete confirm */}
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
