import React, { useEffect, useState } from "react";
import { parcelles as api, agriculteurs as agriApi, cultures as cultApi } from "@/lib/api";
import { useNotificationStore } from "@/lib/stores";
import { DataTable, type Column } from "@/components/smart/DataTable";
import { Badge } from "@/components/smart/Badge";
import { Modal } from "@/components/smart/Modal";
import { FormField } from "@/components/smart/FormField";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";

export default function ParcellesList() {
  const nav = useNavigate();
  const notify = useNotificationStore((s) => s.notify);
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [formError, setFormError] = useState("");
  const [agriOptions, setAgriOptions] = useState<{ id: number; nom: string }[]>([]);
  const [cultureOptions, setCultureOptions] = useState<{ id: number; nom: string }[]>([]);

  // Filters
  const [filterAgri, setFilterAgri] = useState("");
  const [filterSaison, setFilterSaison] = useState("");
  const [filterSol, setFilterSol] = useState("");

  const [form, setForm] = useState({
    id_agriculteur: "", id_culture: "", surface: "", type_de_sol: "Sable", capacite_eau: "", latitude: "", longitude: "",
  });

  const fetchData = async () => {
    setLoading(true);
    const params: Record<string, string> = { include_culture: "true" };
    if (filterAgri) params.agriculteur_id = filterAgri;
    if (filterSaison) params.saison_active = filterSaison;
    const res = await api.getAll(params);
    if (res.data) setRows(res.data as Record<string, unknown>[]);
    setLoading(false);
  };

  const loadOptions = async () => {
    const [a, c] = await Promise.all([agriApi.getAll(), cultApi.getAll()]);
    if (a.data) setAgriOptions((a.data as Record<string, unknown>[]).map((x) => ({ id: x.id_agriculteur as number, nom: String(x.nom) })));
    if (c.data) setCultureOptions((c.data as Record<string, unknown>[]).map((x) => ({ id: x.id_culture as number, nom: String(x.nom_culture) })));
  };

  useEffect(() => { fetchData(); loadOptions(); }, [filterAgri, filterSaison]);

  const filtered = rows.filter((r) => !filterSol || r.type_de_sol === filterSol);

  const handleCreate = async () => {
    setFormError("");
    const payload: Record<string, unknown> = {
      id_agriculteur: parseInt(form.id_agriculteur),
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
    { key: "id_parcelle", label: "ID", sortable: true },
    { key: "culture", label: "Culture", render: (_, row) => {
      const c = row.culture as Record<string, unknown> | null;
      return c ? String(c.nom_culture) : "—";
    }},
    { key: "id_agriculteur", label: "Agriculteur", render: (v) => {
      const a = agriOptions.find((x) => x.id === v);
      return a ? a.nom : String(v);
    }},
    { key: "surface", label: "Surface (ha)", sortable: true },
    { key: "type_de_sol", label: "Sol" },
    { key: "capacite_eau", label: "Capacité eau (L)", sortable: true, render: (v) => Number(v).toLocaleString("fr-FR") },
    { key: "saison_active", label: "Saison", render: (v) => <Badge value={v ? "Active" : "Inactive"} type={v ? "success" : "neutral"} /> },
    {
      key: "actions", label: "Actions", render: (_, row) => (
        <div className="table-actions" onClick={(e) => e.stopPropagation()}>
          <Button variant="ghost" size="sm" onClick={() => nav(`/parcelles/${row.id_parcelle}`)}>Voir</Button>
          {!row.saison_active && <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleDelete(row.id_parcelle as number)}>Supprimer</Button>}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="page-header">
        <h1 className="page-title">Parcelles</h1>
        <Button onClick={() => { setModalOpen(true); setFormError(""); }}><Plus className="w-4 h-4" /> Nouvelle parcelle</Button>
      </div>

      <div className="filter-bar">
        <select className="border rounded-md px-3 py-2 text-sm bg-background" value={filterAgri} onChange={(e) => setFilterAgri(e.target.value)}>
          <option value="">Tous les agriculteurs</option>
          {agriOptions.map((a) => <option key={a.id} value={a.id}>{a.nom}</option>)}
        </select>
        <select className="border rounded-md px-3 py-2 text-sm bg-background" value={filterSaison} onChange={(e) => setFilterSaison(e.target.value)}>
          <option value="">Toutes saisons</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
        <select className="border rounded-md px-3 py-2 text-sm bg-background" value={filterSol} onChange={(e) => setFilterSol(e.target.value)}>
          <option value="">Tout type de sol</option>
          <option value="Sable">Sable</option>
          <option value="Limon">Limon</option>
          <option value="Argile">Argile</option>
        </select>
      </div>

      <DataTable columns={columns} rows={filtered} loading={loading} onRowClick={(row) => nav(`/parcelles/${row.id_parcelle}`)} />

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nouvelle parcelle" size="lg" footer={
        <><Button variant="outline" onClick={() => setModalOpen(false)}>Annuler</Button><Button onClick={handleCreate}>Créer</Button></>
      }>
        <div className="space-y-4">
          {formError && <p className="text-sm text-destructive bg-destructive/10 p-2 rounded">{formError}</p>}
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Agriculteur" required>
              <select className="w-full border rounded-md px-3 py-2 text-sm bg-background" value={form.id_agriculteur} onChange={(e) => setForm({ ...form, id_agriculteur: e.target.value })}>
                <option value="">Sélectionner...</option>
                {agriOptions.map((a) => <option key={a.id} value={a.id}>{a.nom}</option>)}
              </select>
            </FormField>
            <FormField label="Culture">
              <select className="w-full border rounded-md px-3 py-2 text-sm bg-background" value={form.id_culture} onChange={(e) => setForm({ ...form, id_culture: e.target.value })}>
                <option value="">Aucune</option>
                {cultureOptions.map((c) => <option key={c.id} value={c.id}>{c.nom}</option>)}
              </select>
            </FormField>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <FormField label="Surface (ha)" required><input type="number" step="0.01" min="0" className="w-full border rounded-md px-3 py-2 text-sm bg-background" value={form.surface} onChange={(e) => setForm({ ...form, surface: e.target.value })} /></FormField>
            <FormField label="Type de sol" required>
              <select className="w-full border rounded-md px-3 py-2 text-sm bg-background" value={form.type_de_sol} onChange={(e) => setForm({ ...form, type_de_sol: e.target.value })}>
                <option value="Sable">Sable</option><option value="Limon">Limon</option><option value="Argile">Argile</option>
              </select>
            </FormField>
            <FormField label="Capacité eau (L)" required><input type="number" step="0.01" min="0" className="w-full border rounded-md px-3 py-2 text-sm bg-background" value={form.capacite_eau} onChange={(e) => setForm({ ...form, capacite_eau: e.target.value })} /></FormField>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Latitude"><input type="number" step="0.000001" className="w-full border rounded-md px-3 py-2 text-sm bg-background" value={form.latitude} onChange={(e) => setForm({ ...form, latitude: e.target.value })} /></FormField>
            <FormField label="Longitude"><input type="number" step="0.000001" className="w-full border rounded-md px-3 py-2 text-sm bg-background" value={form.longitude} onChange={(e) => setForm({ ...form, longitude: e.target.value })} /></FormField>
          </div>
        </div>
      </Modal>
    </div>
  );
}
