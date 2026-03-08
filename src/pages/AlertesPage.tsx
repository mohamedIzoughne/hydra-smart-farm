import React, { useEffect, useState } from "react";
import { stress as api } from "@/lib/api";
import { DataTable, type Column } from "@/components/smart/DataTable";
import { Badge, stressBadgeType } from "@/components/smart/Badge";
import { useNavigate } from "react-router-dom";

export default function AlertesPage() {
  const nav = useNavigate();
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterNiveau, setFilterNiveau] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      const params: Record<string, string> = { alerte_active: "true" };
      if (filterNiveau) params.niveau = filterNiveau;
      const res = await api.getAll(params);
      if (res.data) setRows(res.data as Record<string, unknown>[]);
      setLoading(false);
    })();
  }, [filterNiveau]);

  const columns: Column[] = [
    { key: "id_parcelle", label: "Parcelle" },
    { key: "date_calcul", label: "Date", sortable: true },
    { key: "niveau_stress", label: "Niveau", render: (v) => <Badge value={String(v)} type={stressBadgeType(String(v))} /> },
    { key: "besoin_total_saison", label: "Besoin total (L)", sortable: true, render: (v) => Number(v).toLocaleString("fr-FR") },
    { key: "deficit_calcule", label: "Déficit (L)", sortable: true, render: (v) => Number(v).toLocaleString("fr-FR") },
    { key: "cultures_suggere", label: "Cultures suggérées", render: (v) => v ? String(v) : "—" },
    { key: "recommandation", label: "Recommandation", render: (v) => v ? <span className="text-xs">{String(v).slice(0, 80)}...</span> : "—" },
  ];

  return (
    <div className="space-y-4">
      <h1 className="page-title">Alertes de Stress Hydrique</h1>
      <div className="filter-bar">
        <select className="border rounded-md px-3 py-2 text-sm bg-background" value={filterNiveau} onChange={(e) => setFilterNiveau(e.target.value)}>
          <option value="">Tous niveaux</option>
          <option value="Critique">Critique</option>
          <option value="Élevé">Élevé</option>
          <option value="Moyen">Moyen</option>
          <option value="Faible">Faible</option>
        </select>
      </div>
      <DataTable columns={columns} rows={rows} loading={loading} emptyMessage="Aucune alerte active" onRowClick={(row) => nav(`/parcelles/${row.id_parcelle}`)} />
    </div>
  );
}
