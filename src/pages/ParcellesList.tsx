import React, { useEffect, useState } from "react";
import { parcelles as api, cultures as cultApi } from "@/lib/api";
import { useNotificationStore } from "@/lib/stores";
import { DataTable, type Column } from "@/components/smart/DataTable";
import { Badge } from "@/components/smart/Badge";
import { Modal } from "@/components/smart/Modal";
import { FormField } from "@/components/smart/FormField";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Plus, Map } from "lucide-react";

export default function ParcellesList() {
  const nav = useNavigate();
  const notify = useNotificationStore((s) => s.notify);
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [formError, setFormError] = useState("");
  const [cultureOptions, setCultureOptions] = useState<{ id: number; nom: string }[]>([]);

  const [filterSaison, setFilterSaison] = useState("");
  const [filterSol, setFilterSol] = useState("");

  const [form, setForm] = useState({
    id_culture: "", surface: "", type_de_sol: "Sable", capacite_eau: "", latitude: "", longitude: "",
  });

  const fetchData = async () => {
    setLoading(true);
    const params: Record<string, string> = { include_culture: "true" };
    if (filterSaison) params.saison_active = filterSaison;
    const res = await api.getAll(params);
    if (res.data) setRows(res.data as Record<string, unknown>[]);
    setLoading(false);
  };

  const loadOptions = async () => {
    const c = await cultApi.getAll();
    if (c.data) setCultureOptions((c.data as Record<string, unknown>[]).map((x) => ({ id: x.id_culture as number, nom: String(x.nom_culture) })));
  };

  useEffect(() => { fetchData(); loadOptions(); }, [filterSaison]);

  const filtered = rows.filter((r) => !filterSol || r.type_de_sol === filterSol);

  const handleCreate = async () => {
    setFormError("");
    const payload: Record<string, unknown> = {
      surface: parseFloat(form.surface),
      type_de_sol: form.type_de_sol,
      capacite_eau: parseFloat(form.capacite_eau),
    };
    if (form.id_culture) payload.id_culture = parseInt(form.id_culture);
    if (form.latitude) payload.latitude = parseFloat(form.latitude);
    if (form.longitude) payload.longitude = parseFloat(form.longitude);

    const res = await api.create(payload);
    if (res.error) { setFormError(res.error); return; }
    notify("success", "Parcelle créée");
    setModalOpen(false);
    fetchData();
  };

  const handleDelete = async (id: number) => {
    const res = await api.delete(id);
    if (res.error) { notify("error", res.error); return; }
    notify("success", "Parcelle supprimée");
    fetchData();
  };

  const columns: Column[] = [
    { key: "id_parcelle", label: "#", sortable: true },
    { key: "culture", label: "Culture", render: (_, row) => {
      const c = row.culture as Record<string, unknown> | null;
      return c ? <span className="font-medium text-foreground">{String(c.nom_culture)}</span> : <span className="text-muted-foreground">—</span>;
    }},
    { key: "surface", label: "Surface (ha)", sortable: true },
    { key: "type_de_sol", label: "Sol" },
    { key: "capacite_eau", label: "Capacité eau (L)", sortable: true, render: (v) => Number(v).toLocaleString("fr-FR") },
    { key: "saison_active", label: "Saison", render: (v) => <Badge value={v ? "Active" : "Inactive"} type={v ? "success" : "neutral"} /> },
    {
      key: "actions", label: "", render: (_, row) => (
        <div className="table-actions" onClick={(e) => e.stopPropagation()}>
          <Button variant="ghost" size="sm" className="font-semibold" onClick={() => nav(`/parcelles/${row.id_parcelle}`)}>Détail</Button>
          {!row.saison_active && <Button variant="ghost" size="sm" className="text-destructive font-semibold" onClick={() => handleDelete(row.id_parcelle as number)}>Supprimer</Button>}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-10 h-10 rounded-xl bg-primary/[0.08] flex items-center justify-center">
              <Map className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="page-title">Mes parcelles</h1>
              <p className="text-sm text-muted-foreground">{rows.length} parcelle{rows.length !== 1 ? "s" : ""} enregistrée{rows.length !== 1 ? "s" : ""}</p>
            </div>
          </div>
        </div>
        <Button onClick={() => { setModalOpen(true); setFormError(""); }} className="rounded-full px-5 shadow-md shadow-primary/15">
          <Plus className="w-4 h-4" /> Nouvelle parcelle
        </Button>
      </div>

      <div className="filter-bar rounded-2xl">
        <div>
          <label className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground block mb-1.5">Saison</label>
          <select className="field-input py-1.5" value={filterSaison} onChange={(e) => setFilterSaison(e.target.value)}>
            <option value="">Toutes</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
        </div>
        <div>
          <label className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground block mb-1.5">Type de sol</label>
          <select className="field-input py-1.5" value={filterSol} onChange={(e) => setFilterSol(e.target.value)}>
            <option value="">Tous</option>
            <option value="Sable">Sable</option>
            <option value="Limon">Limon</option>
            <option value="Argile">Argile</option>
          </select>
        </div>
      </div>

      <DataTable columns={columns} rows={filtered} loading={loading} onRowClick={(row) => nav(`/parcelles/${row.id_parcelle}`)} />

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nouvelle parcelle" size="lg" footer={
        <><Button variant="outline" onClick={() => setModalOpen(false)} className="rounded-xl">Annuler</Button><Button onClick={handleCreate} className="rounded-xl">Créer</Button></>
      }>
        <div className="space-y-5">
          {formError && <p className="text-sm text-destructive bg-destructive/[0.08] border border-destructive/20 p-3 rounded-xl">{formError}</p>}
          <FormField label="Culture">
            <select className="field-input" value={form.id_culture} onChange={(e) => setForm({ ...form, id_culture: e.target.value })}>
              <option value="">Aucune</option>
              {cultureOptions.map((c) => <option key={c.id} value={c.id}>{c.nom}</option>)}
            </select>
          </FormField>
          <div className="grid grid-cols-3 gap-4">
            <FormField label="Surface (ha)" required><input type="number" step="0.01" min="0" className="field-input" value={form.surface} onChange={(e) => setForm({ ...form, surface: e.target.value })} /></FormField>
            <FormField label="Type de sol" required>
              <select className="field-input" value={form.type_de_sol} onChange={(e) => setForm({ ...form, type_de_sol: e.target.value })}>
                <option value="Sable">Sable</option><option value="Limon">Limon</option><option value="Argile">Argile</option>
              </select>
            </FormField>
            <FormField label="Capacité eau (L)" required><input type="number" step="0.01" min="0" className="field-input" value={form.capacite_eau} onChange={(e) => setForm({ ...form, capacite_eau: e.target.value })} /></FormField>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Latitude"><input type="number" step="0.000001" className="field-input" value={form.latitude} onChange={(e) => setForm({ ...form, latitude: e.target.value })} /></FormField>
            <FormField label="Longitude"><input type="number" step="0.000001" className="field-input" value={form.longitude} onChange={(e) => setForm({ ...form, longitude: e.target.value })} /></FormField>
          </div>
        </div>
      </Modal>
    </div>
  );
}
