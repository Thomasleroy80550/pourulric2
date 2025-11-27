import React, { useEffect, useMemo, useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Kanban, Users, PhoneCall, Mail, ChevronRight, UserPlus, X, RefreshCcw } from "lucide-react";
import { getLatestProspects, updateProspectStatus, convertProspectToClient, getAllProfiles, type Prospect, type ProspectStatus, type UserProfile } from "@/lib/admin-api";

type ColumnsMap = Record<ProspectStatus, Prospect[]>;

const STATUS_LABELS: Record<ProspectStatus, string> = {
  new: "Nouveaux",
  callback_pending: "À rappeler",
  cancelled: "Annulés",
  converted: "Convertis",
};

const STATUS_ORDER: ProspectStatus[] = ["new", "callback_pending", "converted", "cancelled"];

const AdminCRMPage: React.FC = () => {
  // Pipeline Prospects
  const [prospects, setProspects] = useState<ColumnsMap>({
    new: [],
    callback_pending: [],
    cancelled: [],
    converted: [],
  });
  const [loadingProspects, setLoadingProspects] = useState(false);

  // Prospect sélectionné (panneau de détails)
  const [selected, setSelected] = useState<Prospect | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Clients
  const [clients, setClients] = useState<UserProfile[]>([]);
  const [loadingClients, setLoadingClients] = useState(false);
  const [clientSearch, setClientSearch] = useState("");

  const filteredClients = useMemo(() => {
    const q = clientSearch.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter((c) => {
      const full = `${c.first_name ?? ""} ${c.last_name ?? ""} ${c.email ?? ""}`.toLowerCase();
      return full.includes(q);
    });
  }, [clients, clientSearch]);

  // Charger prospects
  const loadProspects = async () => {
    setLoadingProspects(true);
    try {
      // Charger large (type CRM) – les prospects actifs non archivés
      const list = await getLatestProspects(200);
      const columns: ColumnsMap = { new: [], callback_pending: [], cancelled: [], converted: [] };
      list.forEach((p) => {
        const st = (p.status as ProspectStatus) ?? "new";
        if (!columns[st]) return;
        columns[st].push(p);
      });
      setProspects(columns);
    } catch (e: any) {
      toast.error(`Erreur chargement prospects: ${e?.message || e}`);
    } finally {
      setLoadingProspects(false);
    }
  };

  // Charger clients
  const loadClients = async () => {
    setLoadingClients(true);
    try {
      const list = await getAllProfiles();
      setClients(list);
    } catch (e: any) {
      toast.error(`Erreur chargement clients: ${e?.message || e}`);
    } finally {
      setLoadingClients(false);
    }
  };

  useEffect(() => {
    loadProspects();
    loadClients();
  }, []);

  const onCardDragStart = (ev: React.DragEvent, prospectId: string) => {
    ev.dataTransfer.setData("text/prospectId", prospectId);
  };

  const findProspectLocation = (id: string): { status: ProspectStatus; index: number } | null => {
    for (const st of STATUS_ORDER) {
      const idx = prospects[st].findIndex((p) => p.id === id);
      if (idx !== -1) return { status: st, index: idx };
    }
    return null;
  };

  const onColumnDragOver = (ev: React.DragEvent) => {
    ev.preventDefault();
  };

  const onColumnDrop = async (ev: React.DragEvent, targetStatus: ProspectStatus) => {
    ev.preventDefault();
    const id = ev.dataTransfer.getData("text/prospectId");
    if (!id) return;

    const loc = findProspectLocation(id);
    if (!loc) return;

    const sourceStatus = loc.status;
    if (sourceStatus === targetStatus) return;

    // Optimistic UI
    const moved = prospects[sourceStatus][loc.index];
    const next: ColumnsMap = { ...prospects, [sourceStatus]: [...prospects[sourceStatus]], [targetStatus]: [...prospects[targetStatus]] };
    next[sourceStatus].splice(loc.index, 1);
    next[targetStatus].unshift({ ...moved, status: targetStatus });
    setProspects(next);

    try {
      await updateProspectStatus(id, targetStatus);
      toast.success(`Prospect déplacé: ${STATUS_LABELS[targetStatus]}`);
    } catch (e: any) {
      toast.error(`Échec mise à jour: ${e?.message || e}`);
      // revert
      await loadProspects();
    }
  };

  const openDetails = (p: Prospect) => {
    setSelected(p);
    setDetailOpen(true);
  };

  const closeDetails = () => {
    setDetailOpen(false);
    setSelected(null);
  };

  const quickSetStatus = async (p: Prospect, status: ProspectStatus) => {
    try {
      await updateProspectStatus(p.id, status);
      toast.success("Statut mis à jour.");
      await loadProspects();
      setSelected((prev) => (prev?.id === p.id ? { ...p, status } : prev));
    } catch (e: any) {
      toast.error(`Erreur: ${e?.message || e}`);
    }
  };

  const handleConvert = async (p: Prospect) => {
    try {
      const { userId } = await convertProspectToClient(p);
      toast.success("Prospect converti en client.");
      await loadProspects();
      // Option: scroll aux clients
    } catch (e: any) {
      toast.error(`Conversion impossible: ${e?.message || e}`);
    }
  };

  const prospectCount = (st: ProspectStatus) => prospects[st]?.length ?? 0;

  return (
    <AdminLayout>
      <div className="container mx-auto py-6">
        <div className="flex items-center gap-2 mb-6">
          <Kanban className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">CRM – Prospects & Clients</h1>
        </div>

        <Tabs defaultValue="pipeline" className="w-full">
          <TabsList>
            <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
            <TabsTrigger value="clients">Clients</TabsTrigger>
          </TabsList>

          <TabsContent value="pipeline" className="mt-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Pipeline Prospects</CardTitle>
                  <CardDescription>Faites glisser les cartes entre les colonnes pour changer le statut.</CardDescription>
                </div>
                <Button variant="outline" onClick={() => loadProspects()} disabled={loadingProspects}>
                  <RefreshCcw className="h-4 w-4 mr-2" />
                  Rafraîchir
                </Button>
              </CardHeader>
              <CardContent>
                {loadingProspects ? (
                  <div className="text-sm text-muted-foreground">Chargement du pipeline…</div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {STATUS_ORDER.map((st) => (
                      <div
                        key={st}
                        className="rounded-lg border bg-background"
                        onDragOver={onColumnDragOver}
                        onDrop={(e) => onColumnDrop(e, st)}
                      >
                        <div className="flex items-center justify-between px-3 py-2 border-b">
                          <div className="font-medium">{STATUS_LABELS[st]}</div>
                          <Badge variant="secondary">{prospectCount(st)}</Badge>
                        </div>
                        <div className="p-3 space-y-3 min-h-[220px]">
                          {prospects[st].map((p) => (
                            <div
                              key={p.id}
                              draggable
                              onDragStart={(e) => onCardDragStart(e, p.id)}
                              className="rounded-md border p-3 bg-card hover:shadow-sm transition cursor-grab active:cursor-grabbing"
                              role="button"
                              onClick={() => openDetails(p)}
                            >
                              <div className="flex items-center justify-between">
                                <div className="font-medium truncate">
                                  {(p.first_name || p.last_name) ? `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() : p.email}
                                </div>
                                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                              </div>
                              <div className="text-xs text-muted-foreground mt-1 truncate">{p.email}</div>
                              {p.phone && <div className="text-xs text-muted-foreground mt-0.5 truncate">{p.phone}</div>}
                              {p.message && <div className="text-xs mt-2 line-clamp-2">{p.message}</div>}
                              <div className="text-[11px] text-muted-foreground mt-2">
                                {new Date(p.created_at).toLocaleString()}
                              </div>
                            </div>
                          ))}
                          {prospects[st].length === 0 && (
                            <div className="text-xs text-muted-foreground italic">Aucun prospect ici.</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="clients" className="mt-4">
            <Card>
              <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  <div>
                    <CardTitle>Clients</CardTitle>
                    <CardDescription>Liste des profils. Recherchez par nom ou email.</CardDescription>
                  </div>
                </div>
                <div className="w-full sm:w-80">
                  <Input placeholder="Rechercher un client…" value={clientSearch} onChange={(e) => setClientSearch(e.target.value)} />
                </div>
              </CardHeader>
              <CardContent>
                {loadingClients ? (
                  <div className="text-sm text-muted-foreground">Chargement des clients…</div>
                ) : (
                  <div className="w-full overflow-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nom</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Téléphone</TableHead>
                          <TableHead>Rôle</TableHead>
                          <TableHead>Dernière connexion</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredClients.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-sm text-muted-foreground">
                              Aucun client trouvé.
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredClients.map((c) => (
                            <TableRow key={c.id}>
                              <TableCell className="font-medium">
                                {`${c.first_name ?? ""} ${c.last_name ?? ""}`.trim() || "—"}
                              </TableCell>
                              <TableCell>{c.email ?? "—"}</TableCell>
                              <TableCell>{c.phone_number ?? "—"}</TableCell>
                              <TableCell>
                                <Badge variant={c.role === "admin" ? "default" : "secondary"}>
                                  {c.role ?? "user"}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {c.last_seen_at ? new Date(c.last_seen_at).toLocaleString() : "—"}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Détail prospect */}
      <Dialog open={detailOpen} onOpenChange={(o) => (o ? setDetailOpen(true) : closeDetails())}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>Détail du prospect</DialogTitle>
            <DialogDescription>Consultez les infos et agissez rapidement.</DialogDescription>
          </DialogHeader>

          {selected && (
            <div className="space-y-3">
              <div className="text-sm">
                <div className="font-medium">{(selected.first_name || selected.last_name) ? `${selected.first_name ?? ""} ${selected.last_name ?? ""}`.trim() : selected.email}</div>
                <div className="text-muted-foreground">{selected.email}</div>
                {selected.phone && <div className="text-muted-foreground">{selected.phone}</div>}
                <div className="text-xs text-muted-foreground mt-1">Créé le {new Date(selected.created_at).toLocaleString()}</div>
              </div>

              {selected.message && (
                <div className="rounded-md border p-3 bg-muted/30">
                  <div className="text-xs font-medium mb-1">Message</div>
                  <div className="text-sm whitespace-pre-wrap">{selected.message}</div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                {selected.utm_source && <div>UTM source: {selected.utm_source}</div>}
                {selected.utm_medium && <div>UTM medium: {selected.utm_medium}</div>}
                {selected.utm_campaign && <div>UTM campaign: {selected.utm_campaign}</div>}
                {selected.source && <div>Source: {selected.source}</div>}
                {selected.page_path && <div>Page: {selected.page_path}</div>}
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                <Button variant="secondary" onClick={() => quickSetStatus(selected, "callback_pending")}>
                  <PhoneCall className="h-4 w-4 mr-2" />
                  À rappeler
                </Button>
                <Button variant="outline" onClick={() => quickSetStatus(selected, "cancelled")}>
                  <X className="h-4 w-4 mr-2" />
                  Annuler
                </Button>
                <Button onClick={() => handleConvert(selected)}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Convertir en client
                </Button>
                <Button variant="ghost" onClick={() => window.open(`mailto:${selected.email}`, "_blank")}>
                  <Mail className="h-4 w-4 mr-2" />
                  Envoyer un email
                </Button>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={closeDetails}>Fermer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminCRMPage;