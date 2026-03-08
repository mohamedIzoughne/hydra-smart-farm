import React, { useEffect, useState } from "react";
import { mesures as api } from "@/lib/api";
import { DataTable, type Column } from "@/components/smart/DataTable";
import { useNotificationStore } from "@/lib/stores";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

export default function MesuresPage() {
  const notify = useNotificationStore((s) => s.notify);
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [parcelleId, setParcelleId] = useState("1");
  const [depuis, setDepuis] = useState("");
  const [jusqu, setJusqu] = useState("");

  const fetchData = async () => {
    if (!parcelleId) return;
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

  const handleDelete = async (id: number) => {
    const res = await api.delete(id);
    if (res.error) { notify("error", res.error); return; }
    notify("success", "Mesure supprimée");
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
      key: "actions", label: "", render: (_, row) => (
        <div onClick={(e) => e.stopPropagation()}>
          <Button variant="ghost" size="icon" className="text-destructive h-8 w-8" onClick={() => handleDelete(row.id_mesure as number)}>
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <h1 className="page-title">Mesures Climatiques</h1>
      <div className="filter-bar">
        <div>
          <label className="text-xs text-muted-foreground">Parcelle ID</label>
          <input type="number" className="w-24 border rounded-md px-3 py-2 text-sm bg-background block" value={parcelleId} onChange={(e) => setParcelleId(e.target.value)} />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Depuis</label>
          <input type="date" className="border rounded-md px-3 py-2 text-sm bg-background block" value={depuis} onChange={(e) => setDepuis(e.target.value)} />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Jusqu'à</label>
          <input type="date" className="border rounded-md px-3 py-2 text-sm bg-background block" value={jusqu} onChange={(e) => setJusqu(e.target.value)} />
        </div>
      </div>
      <DataTable columns={columns} rows={rows} loading={loading} emptyMessage="Aucune mesure" />
    </div>
  );
}
