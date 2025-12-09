import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getServiceStatuses, ServiceStatus, ServiceStatusValue } from "@/lib/status-api";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { BadgeCheck, AlertTriangle, Wrench, CloudOff } from "lucide-react";

function StatusBadge({ status }: { status: ServiceStatusValue }) {
  const base = "inline-flex items-center gap-2 px-2.5 py-1 rounded-md text-xs font-medium";
  switch (status) {
    case "operational":
      return <span className={`${base} bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300`}><BadgeCheck className="h-3 w-3" /> Opérationnel</span>;
    case "degraded":
      return <span className={`${base} bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300`}><AlertTriangle className="h-3 w-3" /> Dégradé</span>;
    case "outage":
      return <span className={`${base} bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300`}><CloudOff className="h-3 w-3" /> Panne</span>;
    case "maintenance":
      return <span className={`${base} bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300`}><Wrench className="h-3 w-3" /> Maintenance</span>;
  }
}

const StatusPage: React.FC = () => {
  const [statuses, setStatuses] = useState<ServiceStatus[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await getServiceStatuses();
        setStatuses(data);
        setError(null);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertTitle>Erreur</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Statut des services</h1>
        <p className="text-muted-foreground mt-1">Sur cette page, vous pouvez consulter l’état en temps réel de nos intégrations et services.</p>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Chargement...</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {statuses.map((s) => (
            <Card key={s.id}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-lg font-semibold">{s.name}</CardTitle>
                <StatusBadge status={s.status} />
              </CardHeader>
              <CardContent>
                {s.message ? (
                  <p className="text-sm">{s.message}</p>
                ) : (
                  <p className="text-sm text-muted-foreground">Aucune information supplémentaire.</p>
                )}
                <p className="mt-3 text-xs text-muted-foreground">
                  Dernière mise à jour: {new Date(s.updated_at).toLocaleString("fr-FR")}
                </p>
              </CardContent>
            </Card>
          ))}

          {statuses.length === 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Aucun service</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Aucun service n’est configuré pour le moment.</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};

export default StatusPage;