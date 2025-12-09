import React, { useEffect, useMemo, useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { getServiceStatuses, upsertServiceStatus, deleteServiceStatus, ServiceStatus, ServiceStatusValue } from "@/lib/status-api";
import { toast } from "sonner";
import { BadgeCheck, AlertTriangle, Wrench, CloudOff, Plus, Trash2, Save } from "lucide-react";

const STATUS_OPTIONS: { value: ServiceStatusValue; label: string }[] = [
  { value: "operational", label: "Opérationnel" },
  { value: "degraded", label: "Dégradé" },
  { value: "outage", label: "Panne" },
  { value: "maintenance", label: "Maintenance" },
];

function StatusIcon({ status }: { status: ServiceStatusValue }) {
  const iconProps = { className: "h-4 w-4" };
  switch (status) {
    case "operational": return <BadgeCheck {...iconProps} />;
    case "degraded": return <AlertTriangle {...iconProps} />;
    case "outage": return <CloudOff {...iconProps} />;
    case "maintenance": return <Wrench {...iconProps} />;
  }
}

const AdminStatusPage: React.FC = () => {
  const [statuses, setStatuses] = useState<ServiceStatus[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Form pour ajout d'un service
  const [newServiceKey, setNewServiceKey] = useState("");
  const [newServiceName, setNewServiceName] = useState("");
  const [newServiceStatus, setNewServiceStatus] = useState<ServiceStatusValue>("operational");
  const [newServiceMessage, setNewServiceMessage] = useState("");

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

  const onCreateService = async () => {
    if (!newServiceKey.trim() || !newServiceName.trim()) {
      toast.error("Veuillez saisir une clé et un nom.");
      return;
    }
    try {
      const created = await upsertServiceStatus({
        service_key: newServiceKey.trim(),
        name: newServiceName.trim(),
        status: newServiceStatus,
        message: newServiceMessage.trim() || null,
      });
      setStatuses(prev => {
        const idx = prev.findIndex(s => s.service_key === created.service_key);
        if (idx >= 0) {
          const copy = [...prev];
          copy[idx] = created;
          return copy;
        }
        return [created, ...prev];
      });
      setNewServiceKey("");
      setNewServiceName("");
      setNewServiceMessage("");
      setNewServiceStatus("operational");
      toast.success("Service créé/mis à jour.");
    } catch (e: any) {
      toast.error(e.message || "Erreur lors de l'enregistrement.");
    }
  };

  const onUpdateService = async (current: ServiceStatus, updates: Partial<ServiceStatus>) => {
    try {
      const saved = await upsertServiceStatus({
        id: current.id,
        service_key: updates.service_key ?? current.service_key,
        name: updates.name ?? current.name,
        status: (updates.status ?? current.status) as ServiceStatusValue,
        message: updates.message ?? current.message ?? null,
      });
      setStatuses(prev => prev.map(s => s.id === saved.id ? saved : s));
      toast.success("Statut mis à jour.");
    } catch (e: any) {
      toast.error(e.message || "Erreur lors de la mise à jour.");
    }
  };

  const onDeleteService = async (id: string) => {
    try {
      await deleteServiceStatus(id);
      setStatuses(prev => prev.filter(s => s.id !== id));
      toast.success("Service supprimé.");
    } catch (e: any) {
      toast.error(e.message || "Erreur lors de la suppression.");
    }
  };

  const content = useMemo(() => {
    if (error) {
      return (
        <Alert variant="destructive">
          <AlertTitle>Erreur</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      );
    }
    if (loading) {
      return <p className="text-sm text-muted-foreground">Chargement...</p>;
    }
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Service</TableHead>
            <TableHead>Clé</TableHead>
            <TableHead>Statut</TableHead>
            <TableHead>Message</TableHead>
            <TableHead>Mis à jour</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {statuses.map(s => (
            <TableRow key={s.id}>
              <TableCell className="font-medium">{s.name}</TableCell>
              <TableCell className="text-xs text-muted-foreground">{s.service_key}</TableCell>
              <TableCell className="flex items-center gap-2">
                <StatusIcon status={s.status} />
                <Select
                  defaultValue={s.status}
                  onValueChange={(val: ServiceStatusValue) => onUpdateService(s, { status: val })}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Statut" />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </TableCell>
              <TableCell className="max-w-md">
                <div className="flex items-center gap-2">
                  <Input
                    defaultValue={s.message ?? ""}
                    onBlur={(e) => onUpdateService(s, { message: e.target.value })}
                    placeholder="Message d'incident / maintenance (facultatif)"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onUpdateService(s, { message: s.message ?? "" })}
                  >
                    <Save className="h-4 w-4 mr-1" /> Enregistrer
                  </Button>
                </div>
              </TableCell>
              <TableCell className="text-sm">
                {new Date(s.updated_at).toLocaleString("fr-FR")}
              </TableCell>
              <TableCell className="text-right">
                <Button variant="destructive" size="sm" onClick={() => onDeleteService(s.id)}>
                  <Trash2 className="h-4 w-4 mr-1" /> Supprimer
                </Button>
              </TableCell>
            </TableRow>
          ))}
          {statuses.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-6">
                Aucun service configuré pour le moment.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    );
  }, [statuses, loading, error]);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Ajouter un service</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Clé technique</label>
              <Input
                placeholder="ex: pennylane, stripe, krossbooking"
                value={newServiceKey}
                onChange={(e) => setNewServiceKey(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Nom affiché</label>
              <Input
                placeholder="Nom du service"
                value={newServiceName}
                onChange={(e) => setNewServiceName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Statut</label>
              <Select value={newServiceStatus} onValueChange={(v: ServiceStatusValue) => setNewServiceStatus(v)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choisir un statut" />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 lg:col-span-1 md:col-span-2">
              <label className="text-sm font-medium">Message (optionnel)</label>
              <Input
                placeholder="Détails / incident / maintenance"
                value={newServiceMessage}
                onChange={(e) => setNewServiceMessage(e.target.value)}
              />
            </div>
            <div className="md:col-span-2 lg:col-span-4">
              <Button onClick={onCreateService}>
                <Plus className="h-4 w-4 mr-1" /> Ajouter / Mettre à jour
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Statuts des services</CardTitle>
          </CardHeader>
          <CardContent>
            {content}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminStatusPage;