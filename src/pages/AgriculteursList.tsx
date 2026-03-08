import React, { useEffect, useState } from "react";
import { agriculteurs as api } from "@/lib/api";
import { useNotificationStore } from "@/lib/stores";
import { DataTable, type Column } from "@/components/smart/DataTable";
import { Badge } from "@/components/smart/Badge";
import { Modal } from "@/components/smart/Modal";
import { FormField } from "@/components/smart/FormField";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";

export default function AgriculteursList() {
  const nav = useNavigate();
  const notify = useNotificationStore((s) => s.notify);
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<Record<string, unknown> | null>(null);
  const [form, setForm] = useState({ nom: "", mail: "", mot_de_passe: "" });
  const [editForm, setEditForm] = useState({ nom: "", mail: "", actif: true });
  const [formError, setFormError] = useState("");
  const [confirmId, setConfirmId] = useState<number | null>(null);

  const fetchData = async () => {
    setLoading(true);
    const res = await api.getAll({ include_inactive: "true" });
    if (res.data) setRows(res.data as Record<string, unknown>[]);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleCreate = async () => {
    setFormError("");
    if (!form.nom || !form.mail || !form.mot_de_passe) { setFormError("Tous les champs sont requis"); return; }
    if (form.mot_de_passe.length < 8) { setFormError("Mot de passe: min 8 caractères"); return; }
    const res = await api.create(form);
    if (res.error) { setFormError(res.error); return; }
    notify("success", "Agriculteur créé");
    setModalOpen(false);
    setForm({ nom: "", mail: "", mot_de_passe: "" });
    fetchData();
  };

  const handleUpdate = async () => {
    if (!editItem) return;
    setFormError("");
    const res = await api.update(editItem.id_agriculteur as number, editForm);
    if (res.error) { setFormError(res.error); return; }
    notify("success", "Mis à jour");
    setEditItem(null);
    fetchData();
  };

  const handleDeactivate = async (id: number) => {
    const res = await api.deactivate(id);
    if (res.error) { notify("error", res.error); return; }
    notify("success", "Agriculteur désactivé");
    setConfirmId(null);
    fetchData();
  };

  const columns: Column[] = [
    { key: "nom", label: "Nom", sortable: true },
    { key: "mail", label: "Email", sortable: true },
    { key: "date_inscription", label: "Inscrit le", sortable: true, render: (v) => v ? String(v).slice(0, 10) : "—" },
    { key: "actif", label: "Statut", render: (v) => <Badge value={v ? "Actif" : "Inactif"} type={v ? "success" : "neutral"} /> },
    {
      key: "actions", label: "Actions", render: (_, row) => (
        <div className="table-actions" onClick={(e) => e.stopPropagation()}>
          <Button variant="ghost" size="sm" onClick={() => nav(`/agriculteurs/${row.id_agriculteur}`)}>Voir</Button>
          <Button variant="ghost" size="sm" onClick={() => {
            setEditItem(row);
            setEditForm({ nom: String(row.nom), mail: String(row.mail), actif: Boolean(row.actif) });
            setFormError("");
          }}>Modifier</Button>
          {row.actif && (
            confirmId === row.id_agriculteur
              ? <span className="flex items-center gap-1 text-xs">
                  <Button variant="destructive" size="sm" onClick={() => handleDeactivate(row.id_agriculteur as number)}>Confirmer</Button>
                  <Button variant="ghost" size="sm" onClick={() => setConfirmId(null)}>Annuler</Button>
                </span>
              : <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setConfirmId(row.id_agriculteur as number)}>Désactiver</Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="page-header">
        <h1 className="page-title">Agriculteurs</h1>
        <Button onClick={() => { setModalOpen(true); setFormError(""); }}><Plus className="w-4 h-4" /> Nouvel agriculteur</Button>
      </div>

      <DataTable columns={columns} rows={rows} loading={loading} onRowClick={(row) => nav(`/agriculteurs/${row.id_agriculteur}`)} />

      {/* Create modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nouvel agriculteur" footer={
        <><Button variant="outline" onClick={() => setModalOpen(false)}>Annuler</Button><Button onClick={handleCreate}>Créer</Button></>
      }>
        <div className="space-y-4">
          {formError && <p className="text-sm text-destructive bg-destructive/10 p-2 rounded">{formError}</p>}
          <FormField label="Nom" required><input className="w-full border rounded-md px-3 py-2 text-sm bg-background" value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} /></FormField>
          <FormField label="Email" required><input type="email" className="w-full border rounded-md px-3 py-2 text-sm bg-background" value={form.mail} onChange={(e) => setForm({ ...form, mail: e.target.value })} /></FormField>
          <FormField label="Mot de passe" required><input type="password" className="w-full border rounded-md px-3 py-2 text-sm bg-background" value={form.mot_de_passe} onChange={(e) => setForm({ ...form, mot_de_passe: e.target.value })} /></FormField>
        </div>
      </Modal>

      {/* Edit modal */}
      <Modal open={!!editItem} onClose={() => setEditItem(null)} title="Modifier agriculteur" footer={
        <><Button variant="outline" onClick={() => setEditItem(null)}>Annuler</Button><Button onClick={handleUpdate}>Enregistrer</Button></>
      }>
        <div className="space-y-4">
          {formError && <p className="text-sm text-destructive bg-destructive/10 p-2 rounded">{formError}</p>}
          <FormField label="Nom"><input className="w-full border rounded-md px-3 py-2 text-sm bg-background" value={editForm.nom} onChange={(e) => setEditForm({ ...editForm, nom: e.target.value })} /></FormField>
          <FormField label="Email"><input type="email" className="w-full border rounded-md px-3 py-2 text-sm bg-background" value={editForm.mail} onChange={(e) => setEditForm({ ...editForm, mail: e.target.value })} /></FormField>
          <FormField label="Actif">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={editForm.actif} onChange={(e) => setEditForm({ ...editForm, actif: e.target.checked })} />
              <span className="text-sm">{editForm.actif ? "Actif" : "Inactif"}</span>
            </label>
          </FormField>
        </div>
      </Modal>
    </div>
  );
}
