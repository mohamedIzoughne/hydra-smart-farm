import React, { useEffect, useState, useCallback } from "react";
import { parcelles as parcellesApi, stress as stressApi, cultures as culturesApi } from "@/lib/api";
import { StatCard } from "@/components/smart/StatCard";
import { DataTable, type Column } from "@/components/smart/DataTable";
import { Badge, stressBadgeType } from "@/components/smart/Badge";
import { useNavigate } from "react-router-dom";
import { Map, Activity, AlertTriangle, Sprout } from "lucide-react";

export default function Dashboard() {
  const nav = useNavigate();
  const [loading, setLoading] = useState(true);
  const [allParcelles, setAllParcelles] = useState<Record<string, unknown>[]>([]);
  const [alertes, setAlertes] = useState<Record<string, unknown>[]>([]);
  const [culturesCount, setCulturesCount] = useState(0);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [pRes, sRes, cRes] = await Promise.all([
      parcellesApi.getAll({ include_culture: "true" }),
      stressApi.getAll({ alerte_active: "true" }),
      culturesApi.getAll(),
    ]);
    if (pRes.data) setAllParcelles(pRes.data as Record<string, unknown>[]);
    if (sRes.data) setAlertes(sRes.data as Record<string, unknown>[]);
    if (cRes.total !== undefined) setCulturesCount(cRes.total);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const activeParcelles = allParcelles.filter((p) => p.saison_active);

  const parcelleColumns: Column[] = [
    { key: "id_parcelle", label: "ID", sortable: true },
    { key: "culture", label: "Culture", render: (_, row) => {
      const c = row.culture as Record<string, unknown> | null;
      return c ? String(c.nom_culture) : "—";
    }},
    { key: "type_de_sol", label: "Sol" },
    { key: "surface", label: "Surface (ha)", sortable: true },
    { key: "date_debut_saison", label: "Saison depuis", render: (v) => v ? String(v) : "—" },
  ];

  const alerteColumns: Column[] = [
    { key: "id_parcelle", label: "Parcelle" },
    { key: "niveau_stress", label: "Niveau", render: (v) => <Badge value={String(v)} type={stressBadgeType(String(v))} /> },
    { key: "deficit_calcule", label: "Déficit (L)", sortable: true, render: (v) => Number(v).toLocaleString("fr-FR") },
    { key: "cultures_suggere", label: "Cultures suggérées", render: (v) => v ? String(v) : "—" },
    { key: "date_calcul", label: "Date" },
  ];

  return (
    <div className="space-y-6">
      <h1 className="page-title">Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Parcelles" value={allParcelles.length} icon={<Map className="w-6 h-6" />} color="primary" />
        <StatCard label="Parcelles Actives" value={activeParcelles.length} icon={<Activity className="w-6 h-6" />} color="accent" />
        <StatCard label="Alertes de Stress" value={alertes.length} icon={<AlertTriangle className="w-6 h-6" />} color="destructive" />
        <StatCard label="Cultures" value={culturesCount} icon={<Sprout className="w-6 h-6" />} color="secondary" />
      </div>

      <section>
        <h2 className="text-lg font-semibold font-heading mb-3">Parcelles Actives</h2>
        <DataTable
          columns={parcelleColumns}
          rows={activeParcelles}
          loading={loading}
          emptyMessage="Aucune parcelle active"
          onRowClick={(row) => nav(`/parcelles/${row.id_parcelle}`)}
        />
      </section>

      <section>
        <h2 className="text-lg font-semibold font-heading mb-3">Alertes de Stress Récentes</h2>
        <DataTable
          columns={alerteColumns}
          rows={alertes}
          loading={loading}
          emptyMessage="Aucune alerte active"
          onRowClick={(row) => nav(`/parcelles/${row.id_parcelle}`)}
        />
      </section>
    </div>
  );
}
