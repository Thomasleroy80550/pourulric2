import React, { useEffect, useMemo, useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { getServiceStatuses, upsertServiceStatus, deleteServiceStatus, ServiceStatus, ServiceStatusValue } from "@/lib/status-api";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { BadgeCheck, AlertTriangle, Wrench, CloudOff, Plus, Trash2, Save, RefreshCw } from "lucide-react";

const STATUS_OPTIONS: { value: ServiceStatusValue; label: string }[] = [
  { value: "operational", label: "Opérationnel" },
  { value: "degraded", label: "Dégradé" },
  { value: "outage", label: "Panne" },
  { value: "maintenance", label: "Maintenance" },
];

interface ReservationEmailSyncRun {
  id: string;
  source: string;
  inspect_only: boolean;
  requested_limit: number;
  total_fetched: number;
  matched_krossbooking: number;
  ingested: number;
  status: string;
  error_message: string | null;
  details: {
    duplicates?: number;
    ignored?: number;
    failed?: number;
  } | null;
  started_at: string;
  finished_at: string | null;
  created_at: string;
}

interface ReservationEmailEvent {
  id: string;
  event_type: string;
  reservation_reference: string | null;
  room_name: string;
  guest_name: string | null;
  arrival_date: string | null;
  departure_date: string | null;
  total_amount: number | null;
  processing_status: string;
  error_message: string | null;
  reservation_status: string | null;
  created_at: string;
  processed_at: string | null;
}

function StatusIcon({ status }: { status: ServiceStatusValue }) {
  const iconProps = { className: "h-4 w-4" };
  switch (status) {
    case "operational": return <BadgeCheck {...iconProps} />;
    case "degraded": return <AlertTriangle {...iconProps} />;
    case "outage": return <CloudOff {...iconProps} />;
    case "maintenance": return <Wrench {...iconProps} />;
  }
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleString("fr-FR");
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("fr-FR");
}

function formatAmount(value: number | null | undefined) {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(value);
}

function getRunStatusBadge(status: string) {
  switch (status) {
    case "success":
      return <Badge className="bg-emerald-600 hover:bg-emerald-600">Succès</Badge>;
    case "completed_with_errors":
      return <Badge variant="secondary">Avec erreurs</Badge>;
    case "error":
      return <Badge variant="destructive">Erreur</Badge>;
    default:
      return <Badge variant="outline">En cours</Badge>;
  }
}

function getEventTypeBadge(eventType: string) {
  switch (eventType) {
    case "new":
      return <Badge className="bg-emerald-600 hover:bg-emerald-600">Nouvelle</Badge>;
    case "modified":
      return <Badge variant="secondary">Modifiée</Badge>;
    case "cancelled":
      return <Badge variant="destructive">Annulée</Badge>;
    default:
      return <Badge variant="outline">Inconnue</Badge>;
  }
}

function getProcessingStatusBadge(status: string) {
  switch (status) {
    case "matched":
      return <Badge className="bg-emerald-600 hover:bg-emerald-600">Matché</Badge>;
    case "unmatched":
      return <Badge variant="secondary">Non matché</Badge>;
    case "received":
      return <Badge variant="outline">Reçu</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

const AdminStatusPage: React.FC = () => {
  const [statuses, setStatuses] = useState<ServiceStatus[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [syncingEmails, setSyncingEmails] = useState(false);
  const [syncResult, setSyncResult] = useState<string>("");
  const [monitoringLoading, setMonitoringLoading] = useState(true);
  const [syncRuns, setSyncRuns] = useState<ReservationEmailSyncRun[]>([]);
  const [reservationEvents, setReservationEvents] = useState<ReservationEmailEvent[]>([]);
  const [monitoringError, setMonitoringError] = useState<string | null>(null);

  const [newServiceKey, setNewServiceKey] = useState("");
  const [newServiceName, setNewServiceName] = useState("");
  const [newServiceStatus, setNewServiceStatus] = useState<ServiceStatusValue>("operational");
  const [newServiceMessage, setNewServiceMessage] = useState("");

  const loadServiceStatuses = async () => {
    setLoading(true);
    try {
      const data = await getServiceStatuses();
      setStatuses(data);
      setError(null);
    } catch (e: any) {
      setError(e.message || "Erreur lors du chargement des services.");
    } finally {
      setLoading(false);
    }
  };

  const loadMonitoring = async (showToast = false) => {
    setMonitoringLoading(true);
    try {
      const [runsResult, eventsResult] = await Promise.all([
        supabase
          .from("reservation_email_sync_runs")
          .select("id, source, inspect_only, requested_limit, total_fetched, matched_krossbooking, ingested, status, error_message, details, started_at, finished_at, created_at")
          .order("started_at", { ascending: false })
          .limit(10),
        supabase
          .from("reservation_email_events")
          .select("id, event_type, reservation_reference, room_name, guest_name, arrival_date, departure_date, total_amount, processing_status, error_message, reservation_status, created_at, processed_at")
          .order("created_at", { ascending: false })
          .limit(10),
      ]);

      if (runsResult.error) throw runsResult.error;
      if (eventsResult.error) throw eventsResult.error;

      setSyncRuns((runsResult.data ?? []) as ReservationEmailSyncRun[]);
      setReservationEvents((eventsResult.data ?? []) as ReservationEmailEvent[]);
      setMonitoringError(null);

      if (showToast) {
        toast.success("Suivi des synchronisations actualisé.");
      }
    } catch (e: any) {
      const message = e?.message || "Erreur lors du chargement du suivi.";
      setMonitoringError(message);
      if (showToast) {
        toast.error(message);
      }
    } finally {
      setMonitoringLoading(false);
    }
  };

  useEffect(() => {
    loadServiceStatuses();
    loadMonitoring();
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

  const onInspectKrossbookingEmails = async () => {
    setSyncingEmails(true);
    setSyncResult("");

    try {
      const { data, error } = await supabase.functions.invoke("sync-resend-krossbooking-emails", {
        body: {
          cron_secret: "abc123-test-notify",
          limit: 20,
          inspect_only: true,
          include_raw: true,
        },
      });

      if (error) {
        throw error;
      }

      setSyncResult(JSON.stringify(data, null, 2));
      toast.success("Inspection des emails terminée.");
      await loadMonitoring();
    } catch (e: any) {
      const message = e?.message || "Erreur lors de l'inspection des emails.";
      setSyncResult(message);
      toast.error(message);
    } finally {
      setSyncingEmails(false);
    }
  };

  const onImportKrossbookingEmails = async () => {
    setSyncingEmails(true);
    setSyncResult("");

    try {
      const { data, error } = await supabase.functions.invoke("sync-resend-krossbooking-emails", {
        body: {
          cron_secret: "abc123-test-notify",
          limit: 20,
          inspect_only: false,
          include_raw: false,
        },
      });

      if (error) {
        throw error;
      }

      setSyncResult(JSON.stringify(data, null, 2));
      toast.success("Import des emails terminé.");
      await loadMonitoring();
    } catch (e: any) {
      const message = e?.message || "Erreur lors de l'import des emails.";
      setSyncResult(message);
      toast.error(message);
    } finally {
      setSyncingEmails(false);
    }
  };

  const servicesContent = useMemo(() => {
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
                <Select defaultValue={s.status} onValueChange={(val: ServiceStatusValue) => onUpdateService(s, { status: val })}>
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
                  <Button variant="outline" size="sm" onClick={() => onUpdateService(s, { message: s.message ?? "" })}>
                    <Save className="mr-1 h-4 w-4" /> Enregistrer
                  </Button>
                </div>
              </TableCell>
              <TableCell className="text-sm">{formatDateTime(s.updated_at)}</TableCell>
              <TableCell className="text-right">
                <Button variant="destructive" size="sm" onClick={() => onDeleteService(s.id)}>
                  <Trash2 className="mr-1 h-4 w-4" /> Supprimer
                </Button>
              </TableCell>
            </TableRow>
          ))}
          {statuses.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="py-6 text-center text-sm text-muted-foreground">
                Aucun service configuré pour le moment.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    );
  }, [statuses, loading, error]);

  const latestRun = syncRuns[0] ?? null;
  const latestRunDuplicates = latestRun?.details?.duplicates ?? 0;
  const latestRunIgnored = latestRun?.details?.ignored ?? 0;
  const latestRunFailed = latestRun?.details?.failed ?? 0;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Test emails Krossbooking</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Clique sur le bouton pour lire les 20 derniers emails reçus dans Resend et vérifier si un email de réservation Krossbooking est détecté.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button onClick={onInspectKrossbookingEmails} disabled={syncingEmails} variant="outline">
                {syncingEmails ? "Inspection en cours..." : "Tester les emails reçus"}
              </Button>
              <Button onClick={onImportKrossbookingEmails} disabled={syncingEmails}>
                {syncingEmails ? "Import en cours..." : "Importer les emails trouvés"}
              </Button>
              <Button variant="secondary" onClick={() => loadMonitoring(true)} disabled={monitoringLoading || syncingEmails}>
                <RefreshCw className="mr-1 h-4 w-4" /> Actualiser le suivi
              </Button>
            </div>
            {syncResult && (
              <pre className="max-h-[420px] overflow-auto rounded-md border bg-muted p-4 text-xs whitespace-pre-wrap break-words">
                {syncResult}
              </pre>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Suivi des synchronisations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {monitoringError && (
              <Alert variant="destructive">
                <AlertTitle>Erreur de suivi</AlertTitle>
                <AlertDescription>{monitoringError}</AlertDescription>
              </Alert>
            )}

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">Dernier passage</p>
                <p className="mt-2 text-lg font-semibold">{latestRun ? formatDateTime(latestRun.finished_at ?? latestRun.started_at) : "Aucun run"}</p>
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">Statut du dernier run</p>
                <div className="mt-2">{latestRun ? getRunStatusBadge(latestRun.status) : <Badge variant="outline">Aucun</Badge>}</div>
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">Emails créés au dernier run</p>
                <p className="mt-2 text-lg font-semibold">{latestRun?.ingested ?? 0}</p>
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">Doublons / ignorés / erreurs</p>
                <p className="mt-2 text-lg font-semibold">{latestRunDuplicates} / {latestRunIgnored} / {latestRunFailed}</p>
              </div>
            </div>

            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Début</TableHead>
                    <TableHead>Fin</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Inspect</TableHead>
                    <TableHead>Fetch</TableHead>
                    <TableHead>Krossbooking</TableHead>
                    <TableHead>Créés</TableHead>
                    <TableHead>Doublons</TableHead>
                    <TableHead>Erreurs</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {monitoringLoading ? (
                    <TableRow>
                      <TableCell colSpan={9} className="py-6 text-center text-sm text-muted-foreground">
                        Chargement du suivi...
                      </TableCell>
                    </TableRow>
                  ) : syncRuns.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="py-6 text-center text-sm text-muted-foreground">
                        Aucun historique de synchronisation pour le moment.
                      </TableCell>
                    </TableRow>
                  ) : (
                    syncRuns.map((run) => (
                      <TableRow key={run.id}>
                        <TableCell className="text-sm">{formatDateTime(run.started_at)}</TableCell>
                        <TableCell className="text-sm">{formatDateTime(run.finished_at)}</TableCell>
                        <TableCell>{getRunStatusBadge(run.status)}</TableCell>
                        <TableCell>{run.inspect_only ? "Oui" : "Non"}</TableCell>
                        <TableCell>{run.total_fetched}</TableCell>
                        <TableCell>{run.matched_krossbooking}</TableCell>
                        <TableCell>{run.ingested}</TableCell>
                        <TableCell>{run.details?.duplicates ?? 0}</TableCell>
                        <TableCell>{run.details?.failed ?? 0}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Derniers événements de réservation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Créé le</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Référence</TableHead>
                    <TableHead>Logement</TableHead>
                    <TableHead>Voyageur</TableHead>
                    <TableHead>Séjour</TableHead>
                    <TableHead>Montant</TableHead>
                    <TableHead>Traitement</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {monitoringLoading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="py-6 text-center text-sm text-muted-foreground">
                        Chargement des événements...
                      </TableCell>
                    </TableRow>
                  ) : reservationEvents.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="py-6 text-center text-sm text-muted-foreground">
                        Aucun événement importé pour le moment.
                      </TableCell>
                    </TableRow>
                  ) : (
                    reservationEvents.map((event) => (
                      <TableRow key={event.id}>
                        <TableCell className="text-sm">{formatDateTime(event.created_at)}</TableCell>
                        <TableCell>{getEventTypeBadge(event.event_type)}</TableCell>
                        <TableCell className="font-medium">{event.reservation_reference ?? "—"}</TableCell>
                        <TableCell>{event.room_name}</TableCell>
                        <TableCell>{event.guest_name ?? "—"}</TableCell>
                        <TableCell className="text-sm">
                          {formatDate(event.arrival_date)} → {formatDate(event.departure_date)}
                        </TableCell>
                        <TableCell>{formatAmount(event.total_amount)}</TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div>{getProcessingStatusBadge(event.processing_status)}</div>
                            {event.error_message && (
                              <p className="max-w-xs text-xs text-muted-foreground">{event.error_message}</p>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

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
                <Plus className="mr-1 h-4 w-4" /> Ajouter / Mettre à jour
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Statuts des services</CardTitle>
          </CardHeader>
          <CardContent>{servicesContent}</CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminStatusPage;
