import React, { useEffect, useState } from "react";
import { cultures as api } from "@/lib/api";
import { useNotificationStore } from "@/lib/stores";
import { DataTable, type Column } from "@/components/smart/DataTable";
import { Modal } from "@/components/smart/Modal";
import { FormField } from "@/components/smart/FormField";
import { Button } from "@/components/ui/button";
import { Plus, Search } from "lucide-react";

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
    { key: "nom_culture", label: "Culture", sortable: true },
    { key: "besoin_eau_base", label: "Besoin eau (mm/j)", sortable: true },
    { key: "seuil_stress_hyd", label: "Seuil stress (%)", sortable: true },
    { key: "coeff_sol_sable", label: "Coeff Sable" },
    { key: "coeff_sol_limon", label: "Coeff Limon" },
    { key: "coeff_sol_argile", label: "Coeff Argile" },
    {
      key: "actions", label: "Actions", render: (_, row) => (
        <div className="table-actions" onClick={(e) => e.stopPropagation()}>
          <Button variant="ghost" size="sm" onClick={() => openEdit(row)}>Modifier</Button>
          <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleDelete(row.id_culture as number)}>Supprimer</Button>
        </div>
      ),
    },
  ];

  const isFormOpen = modalOpen || !!editItem;

  return (
    <div className="space-y-4">
      <div className="page-header">
        <h1 className="page-title">Cultures</h1>
        <Button onClick={() => { setModalOpen(true); setEditItem(null); setForm(emptyForm); setFormError(""); }}><Plus className="w-4 h-4" /> Nouvelle culture</Button>
      </div>

      <div className="filter-bar">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
          <input className="w-full pl-8 pr-3 py-2 border rounded-md text-sm bg-background" placeholder="Rechercher..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <input className="w-36 border rounded-md px-3 py-2 text-sm bg-background" type="number" placeholder="Besoin max (mm/j)" value={besoinMax} onChange={(e) => setBesoinMax(e.target.value)} />
      </div>

      <DataTable columns={columns} rows={filtered} loading={loading} />

      <Modal open={isFormOpen} onClose={() => { setModalOpen(false); setEditItem(null); }} title={editItem ? "Modifier culture" : "Nouvelle culture"} footer={
        <><Button variant="outline" onClick={() => { setModalOpen(false); setEditItem(null); }}>Annuler</Button><Button onClick={handleSave}>{editItem ? "Enregistrer" : "Créer"}</Button></>
      }>
        <div className="space-y-4">
          {formError && <p className="text-sm text-destructive bg-destructive/10 p-2 rounded">{formError}</p>}
          <FormField label="Nom culture" required><input className="w-full border rounded-md px-3 py-2 text-sm bg-background" value={form.nom_culture} onChange={(e) => setForm({ ...form, nom_culture: e.target.value })} /></FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Besoin eau base (mm/j)" required><input type="number" step="0.01" min="0" className="w-full border rounded-md px-3 py-2 text-sm bg-background" value={form.besoin_eau_base} onChange={(e) => setForm({ ...form, besoin_eau_base: e.target.value })} /></FormField>
            <FormField label="Seuil stress (%)" required><input type="number" step="0.01" min="0" max="100" className="w-full border rounded-md px-3 py-2 text-sm bg-background" value={form.seuil_stress_hyd} onChange={(e) => setForm({ ...form, seuil_stress_hyd: e.target.value })} /></FormField>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <FormField label="Coeff Sable"><input type="number" step="0.01" className="w-full border rounded-md px-3 py-2 text-sm bg-background" value={form.coeff_sol_sable} onChange={(e) => setForm({ ...form, coeff_sol_sable: e.target.value })} /></FormField>
            <FormField label="Coeff Limon"><input type="number" step="0.01" className="w-full border rounded-md px-3 py-2 text-sm bg-background" value={form.coeff_sol_limon} onChange={(e) => setForm({ ...form, coeff_sol_limon: e.target.value })} /></FormField>
            <FormField label="Coeff Argile"><input type="number" step="0.01" className="w-full border rounded-md px-3 py-2 text-sm bg-background" value={form.coeff_sol_argile} onChange={(e) => setForm({ ...form, coeff_sol_argile: e.target.value })} /></FormField>
          </div>
        </div>
      </Modal>
    </div>
  );
}
