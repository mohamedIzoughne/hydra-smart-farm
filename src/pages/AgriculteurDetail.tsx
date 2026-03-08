import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { agriculteurs as api } from "@/lib/api";
import { DataTable, type Column } from "@/components/smart/DataTable";
import { Badge } from "@/components/smart/Badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Plus } from "lucide-react";

export default function AgriculteurDetail() {
  const { id } = useParams();
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const res = await api.getById(Number(id));
      if (res.data) setData(res.data as Record<string, unknown>);
      setLoading(false);
    })();
  }, [id]);

  if (loading) return <div className="animate-pulse h-40 bg-muted rounded-lg" />;
  if (!data) return <p className="text-muted-foreground">Agriculteur non trouvé</p>;

  const parcelles = (data.parcelles || []) as Record<string, unknown>[];

  const columns: Column[] = [
    { key: "id_parcelle", label: "ID" },
    { key: "type_de_sol", label: "Sol" },
    { key: "surface", label: "Surface (ha)" },
    { key: "saison_active", label: "Saison", render: (v) => <Badge value={v ? "Active" : "Inactive"} type={v ? "success" : "neutral"} /> },
  ];

  return (
    <div className="space-y-6">
      <Link to="/agriculteurs" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="w-4 h-4" /> Retour
      </Link>

      <div className="bg-card border rounded-xl p-6">
        <h1 className="text-xl font-bold font-heading">{String(data.nom)}</h1>
        <p className="text-muted-foreground mt-1">{String(data.mail)}</p>
        <div className="flex gap-4 mt-3 text-sm">
          <span>Inscrit le: {String(data.date_inscription).slice(0, 10)}</span>
          <Badge value={data.actif ? "Actif" : "Inactif"} type={data.actif ? "success" : "neutral"} />
        </div>
      </div>

      <div className="page-header">
        <h2 className="text-lg font-semibold font-heading">Parcelles</h2>
        <Button asChild size="sm"><Link to={`/parcelles?agriculteur_id=${id}`}><Plus className="w-4 h-4" /> Ajouter une parcelle</Link></Button>
      </div>
      <DataTable columns={columns} rows={parcelles} emptyMessage="Aucune parcelle" onRowClick={(row) => window.location.href = `/parcelles/${row.id_parcelle}`} />
    </div>
  );
}
