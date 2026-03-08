import React, { useState } from "react";
import { useCultures, useCreateCulture, useUpdateCulture, useDeleteCulture } from "@/hooks/useApi";
import { useNotificationStore } from "@/lib/stores";
import { DataTable, type Column } from "@/components/smart/DataTable";
import { Modal } from "@/components/smart/Modal";
import { FormField } from "@/components/smart/FormField";
import { Button } from "@/components/ui/button";
import { Plus, Search, Sprout, Droplets, AlertTriangle, Pencil, Trash2 } from "lucide-react";

const emptyForm = { nom_culture: "", besoin_eau_base: "", seuil_stress_hyd: "", coeff_sol_sable: "1.30", coeff_sol_limon: "1.00", coeff_sol_argile: "0.75" };

function WaterBar({ value, max = 12 }: { value: number; max?: number }) {
  const pct = Math.min((value / max) * 100, 100);
  const color = pct > 66 ? "bg-accent" : pct > 33 ? "bg-primary" : "bg-primary/60";
  return (
    <div className="flex items-center gap-2.5 min-w-[140px]">
      <div className="flex-1 h-2 rounded-full bg-muted/60 overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
      <span className="font-mono text-xs tabular-nums text-foreground/80 w-8 text-right">{value}</span>
    </div>
  );
}

function StressIndicator({ value }: { value: number }) {
  const color = value >= 60 ? "text-destructive" : value >= 40 ? "text-secondary" : "text-primary";
  return (
    <div className="flex items-center gap-1.5">
      <AlertTriangle className={`w-3.5 h-3.5 ${color}`} />
      <span className={`font-mono text-sm tabular-nums font-semibold ${color}`}>{value}%</span>
    </div>
  );
}

function CoeffPill({ label, value }: { label: string; value: unknown }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted/50 text-[11px] font-mono tabular-nums text-foreground/70">
      <span className="text-muted-foreground font-sans text-[10px] uppercase tracking-wide">{label}</span>
      {String(value ?? "—")}
    </span>
  );
}

export default function CulturesList() {
  const notify = useNotificationStore((s) => s.notify);
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<Record<string, unknown> | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState("");
  const [search, setSearch] = useState("");
  const [besoinMax, setBesoinMax] = useState("");

  const params = besoinMax ? { besoin_max: besoinMax } : undefined;
  const { data: culturesData, isLoading: loading } = useCultures(params);
  const createMutation = useCreateCulture();
  const updateMutation = useUpdateCulture();
  const deleteMutation = useDeleteCulture();

  const rows = culturesData?.data ?? [];
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
    try {
      if (editItem) {
        await updateMutation.mutateAsync({ id: editItem.id_culture as number, data: payload });
        notify("success", "Culture mise à jour");
      } else {
        await createMutation.mutateAsync(payload);
        notify("success", "Culture créée");
      }
      setModalOpen(false); setEditItem(null); setForm(emptyForm);
    } catch (e: any) {
      setFormError(e.message);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteMutation.mutateAsync(id);
      notify("success", "Culture supprimée");
    } catch (e: any) {
      notify("error", e.message);
    }
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
    {
      key: "nom_culture", label: "Culture", sortable: true,
      render: (v) => (
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary/[0.08] flex items-center justify-center shrink-0">
            <Sprout className="w-4 h-4 text-primary" />
          </div>
          <span className="font-semibold text-foreground">{String(v)}</span>
        </div>
      ),
    },
    {
      key: "besoin_eau_base", label: "Besoin eau (mm/j)", sortable: true,
      render: (v) => <WaterBar value={Number(v)} />,
    },
    {
      key: "seuil_stress_hyd", label: "Seuil stress", sortable: true,
      render: (v) => <StressIndicator value={Number(v)} />,
    },
    {
      key: "coefficients", label: "Coefficients sol",
      render: (_, row) => (
        <div className="flex items-center gap-1.5 flex-wrap">
          <CoeffPill label="S" value={row.coeff_sol_sable} />
          <CoeffPill label="L" value={row.coeff_sol_limon} />
          <CoeffPill label="A" value={row.coeff_sol_argile} />
        </div>
      ),
    },
    {
      key: "actions", label: "",
      render: (_, row) => (
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200" onClick={(e) => e.stopPropagation()}>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-lg hover:bg-primary/10 hover:text-primary" onClick={() => openEdit(row)}>
            <Pencil className="w-3.5 h-3.5" />
          </Button>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-lg hover:bg-destructive/10 hover:text-destructive" onClick={() => handleDelete(row.id_culture as number)}>
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  const isFormOpen = modalOpen || !!editItem;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-secondary/20 to-primary/10 flex items-center justify-center shadow-sm">
            <Sprout className="w-6 h-6 text-secondary" />
          </div>
          <div>
            <h1 className="page-title">Cultures</h1>
            <p className="text-sm text-muted-foreground">{rows.length} culture{rows.length !== 1 ? "s" : ""} référencée{rows.length !== 1 ? "s" : ""}</p>
          </div>
        </div>
        <Button onClick={() => { setModalOpen(true); setEditItem(null); setForm(emptyForm); setFormError(""); }} className="rounded-full px-5 shadow-md shadow-primary/15 gap-2">
          <Plus className="w-4 h-4" /> Nouvelle culture
        </Button>
      </div>

      <div className="flex flex-wrap items-end gap-3 p-4 rounded-2xl border border-border/40 bg-card/80 backdrop-blur-sm">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input className="field-input pl-9 py-1.5" placeholder="Rechercher une culture..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex items-center gap-2">
          <Droplets className="w-4 h-4 text-accent" />
          <input className="field-input w-40 py-1.5" type="number" placeholder="Besoin max (mm/j)" value={besoinMax} onChange={(e) => setBesoinMax(e.target.value)} />
        </div>
      </div>

      <DataTable
        columns={columns}
        rows={filtered}
        loading={loading}
        emptyMessage="Aucune culture trouvée"
        emptyIcon={<Sprout className="w-12 h-12 text-muted-foreground/15" strokeWidth={1.5} />}
      />

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
