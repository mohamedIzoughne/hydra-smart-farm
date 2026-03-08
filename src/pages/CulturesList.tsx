import React, { useEffect, useState } from "react";
import { cultures as api } from "@/lib/api";
import { useNotificationStore } from "@/lib/stores";
import { DataTable, type Column } from "@/components/smart/DataTable";
import { Modal } from "@/components/smart/Modal";
import { FormField } from "@/components/smart/FormField";
import { Button } from "@/components/ui/button";
import { Plus, Search, Sprout } from "lucide-react";

const emptyForm = { nom_culture: "", besoin_eau_base: "", seuil_stress_hyd: "", coeff_sol_sable: "1.30", coeff_sol_limon: "1.00", coeff_sol_argile: "0.75" };

export default function CulturesList() {
  const notify = useNotificationStore((s) => s.notify);
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<Record<string, unknown> | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState("");
  const [search, setSearch] = useState("");
  const [besoinMax, setBesoinMax] = useState("");

  const fetchData = async () => {
    setLoading(true);
    const params: Record<string, string> = {};
    if (besoinMax) params.besoin_max = besoinMax;
    const res = await api.getAll(params);
    if (res.data) setRows(res.data as Record<string, unknown>[]);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [besoinMax]);

  const filtered = rows.filter((r) => String(r.nom_culture).toLowerCase().includes(search.toLowerCase()));

  const handleSave = async () => {
    setFormError("");
    const payload: Record<string, unknown> = {
      nom_culture: form.nom_culture,
      besoin_eau_base: parseFloat(form.besoin_eau_base),
      seuil_stress_hyd: parseFloat(form.seuil_stress_hyd),
      coeff_sol_sable: parseFloat(form.coeff_sol_sable),
      coeff_sol_limon: parseFloat(form.coeff_sol_limon),
      coeff_sol_argile: parseFloat(form.coeff_sol_argile),
    };
    const res = editItem
      ? await api.update(editItem.id_culture as number, payload)
      : await api.create(payload);
    if (res.error) { setFormError(res.error); return; }
    notify("success", editItem ? "Culture mise à jour" : "Culture créée");
    setModalOpen(false); setEditItem(null); setForm(emptyForm);
    fetchData();
  };

  const handleDelete = async (id: number) => {
    const res = await api.delete(id);
    if (res.error) { notify("error", res.error); return; }
    notify("success", "Culture supprimée");
    fetchData();
  };

  const openEdit = (row: Record<string, unknown>) => {
    setEditItem(row);
    setForm({
      nom_culture: String(row.nom_culture),
      besoin_eau_base: String(row.besoin_eau_base),
      seuil_stress_hyd: String(row.seuil_stress_hyd),
      coeff_sol_sable: String(row.coeff_sol_sable ?? "1.30"),
      coeff_sol_limon: String(row.coeff_sol_limon ?? "1.00"),
      coeff_sol_argile: String(row.coeff_sol_argile ?? "0.75"),
    });
    setFormError("");
    setModalOpen(true);
  };

  const columns: Column[] = [
    { key: "nom_culture", label: "Culture", sortable: true, render: (v) => <span className="font-semibold text-foreground">{String(v)}</span> },
    { key: "besoin_eau_base", label: "Besoin eau (mm/j)", sortable: true },
    { key: "seuil_stress_hyd", label: "Seuil stress (%)", sortable: true },
    { key: "coeff_sol_sable", label: "Coeff Sable" },
    { key: "coeff_sol_limon", label: "Coeff Limon" },
    { key: "coeff_sol_argile", label: "Coeff Argile" },
    {
      key: "actions", label: "Actions", render: (_, row) => (
        <div className="table-actions" onClick={(e) => e.stopPropagation()}>
          <Button variant="ghost" size="sm" className="font-semibold" onClick={() => openEdit(row)}>Modifier</Button>
          <Button variant="ghost" size="sm" className="text-destructive font-semibold" onClick={() => handleDelete(row.id_culture as number)}>Supprimer</Button>
        </div>
      ),
    },
  ];

  const isFormOpen = modalOpen || !!editItem;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-secondary/[0.08] flex items-center justify-center">
            <Sprout className="w-5 h-5 text-secondary" />
          </div>
          <div>
            <h1 className="page-title">Cultures</h1>
            <p className="text-sm text-muted-foreground">{rows.length} culture{rows.length !== 1 ? "s" : ""} référencée{rows.length !== 1 ? "s" : ""}</p>
          </div>
        </div>
        <Button onClick={() => { setModalOpen(true); setEditItem(null); setForm(emptyForm); setFormError(""); }} className="rounded-full px-5 shadow-md shadow-primary/15">
          <Plus className="w-4 h-4" /> Nouvelle culture
        </Button>
      </div>

      <div className="filter-bar rounded-2xl">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
          <input className="field-input pl-9 py-1.5" placeholder="Rechercher..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div>
          <input className="field-input w-40 py-1.5" type="number" placeholder="Besoin max (mm/j)" value={besoinMax} onChange={(e) => setBesoinMax(e.target.value)} />
        </div>
      </div>

      <DataTable columns={columns} rows={filtered} loading={loading} />

      <Modal open={isFormOpen} onClose={() => { setModalOpen(false); setEditItem(null); }} title={editItem ? "Modifier culture" : "Nouvelle culture"} footer={
        <><Button variant="outline" onClick={() => { setModalOpen(false); setEditItem(null); }} className="rounded-xl">Annuler</Button><Button onClick={handleSave} className="rounded-xl">{editItem ? "Enregistrer" : "Créer"}</Button></>
      }>
        <div className="space-y-5">
          {formError && <p className="text-sm text-destructive bg-destructive/[0.08] border border-destructive/20 p-3 rounded-xl">{formError}</p>}
          <FormField label="Nom culture" required><input className="field-input" value={form.nom_culture} onChange={(e) => setForm({ ...form, nom_culture: e.target.value })} /></FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Besoin eau base (mm/j)" required><input type="number" step="0.01" min="0" className="field-input" value={form.besoin_eau_base} onChange={(e) => setForm({ ...form, besoin_eau_base: e.target.value })} /></FormField>
            <FormField label="Seuil stress (%)" required><input type="number" step="0.01" min="0" max="100" className="field-input" value={form.seuil_stress_hyd} onChange={(e) => setForm({ ...form, seuil_stress_hyd: e.target.value })} /></FormField>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <FormField label="Coeff Sable"><input type="number" step="0.01" className="field-input" value={form.coeff_sol_sable} onChange={(e) => setForm({ ...form, coeff_sol_sable: e.target.value })} /></FormField>
            <FormField label="Coeff Limon"><input type="number" step="0.01" className="field-input" value={form.coeff_sol_limon} onChange={(e) => setForm({ ...form, coeff_sol_limon: e.target.value })} /></FormField>
            <FormField label="Coeff Argile"><input type="number" step="0.01" className="field-input" value={form.coeff_sol_argile} onChange={(e) => setForm({ ...form, coeff_sol_argile: e.target.value })} /></FormField>
          </div>
        </div>
      </Modal>
    </div>
  );
}
