"use client";

import React, { useEffect, useMemo, useState, useRef } from "react";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { CalendarDays, Eye, CheckCircle, Ban } from "lucide-react";
import { getAllSeasonPricingRequests, updateSeasonPricingRequestStatus, SeasonPricingRequest, SeasonPricingStatus } from "@/lib/season-pricing-api";
import ExportRequestsMenu from "@/components/admin/ExportRequestsMenu";
import SingleRequestExportMenu from "@/components/admin/SingleRequestExportMenu";

const AdminSeasonRequestsPage: React.FC = () => {
  const [requests, setRequests] = useState<SeasonPricingRequest[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [tab, setTab] = useState<SeasonPricingStatus>("pending");
  const tableRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const data = await getAllSeasonPricingRequests();
        setRequests(data);
      } catch (err: any) {
        setError(err.message || "Erreur lors du chargement des demandes.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const filtered = useMemo(() => requests.filter(r => r.status === tab), [requests, tab]);

  const updateStatus = async (id: string, status: SeasonPricingStatus) => {
    const toastId = toast.loading("Mise à jour du statut...");
    try {
      await updateSeasonPricingRequestStatus(id, status);
      setRequests(prev => prev.map(r => r.id === id ? { ...r, status } : r));
      toast.success("Statut mis à jour.", { id: toastId });
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de la mise à jour.", { id: toastId });
    }
  };

  const renderTable = () => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Utilisateur</TableHead>
          <TableHead>Logement</TableHead>
          <TableHead>Année</TableHead>
          <TableHead>Périodes</TableHead>
          <TableHead>Statut</TableHead>
          <TableHead>Date</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {filtered.map(req => (
          <React.Fragment key={req.id}>
            <TableRow>
              <TableCell className="font-medium">
                {req.profiles ? `${req.profiles.first_name || ''} ${req.profiles.last_name || ''}`.trim() : '—'}
              </TableCell>
              <TableCell>{req.room_name || req.room_id || '—'}</TableCell>
              <TableCell>{req.season_year}</TableCell>
              <TableCell>{Array.isArray(req.items) ? req.items.length : 0}</TableCell>
              <TableCell>
                <span className="text-xs rounded bg-muted px-2 py-1 capitalize">{req.status}</span>
              </TableCell>
              <TableCell>{format(new Date(req.created_at), 'dd/MM/yyyy', { locale: fr })}</TableCell>
              <TableCell className="text-right space-x-2">
                <Button variant="outline" size="sm" onClick={() => setExpandedId(expandedId === req.id ? null : req.id)}>
                  <Eye className="h-4 w-4 mr-2" /> Détails
                </Button>
                {req.status !== "processing" && (
                  <Button variant="outline" size="sm" onClick={() => updateStatus(req.id, "processing")}>
                    <CalendarDays className="h-4 w-4 mr-2" /> En cours
                  </Button>
                )}
                {req.status !== "done" && (
                  <Button size="sm" onClick={() => updateStatus(req.id, "done")}>
                    <CheckCircle className="h-4 w-4 mr-2" /> Terminer
                  </Button>
                )}
                {req.status !== "cancelled" && (
                  <Button variant="destructive" size="sm" onClick={() => updateStatus(req.id, "cancelled")}>
                    <Ban className="h-4 w-4 mr-2" /> Annuler
                  </Button>
                )}
                <SingleRequestExportMenu request={req} />
              </TableCell>
            </TableRow>

            {expandedId === req.id && (
              <TableRow>
                <TableCell colSpan={7}>
                  <Card className="mt-2">
                    <CardHeader>
                      <CardTitle>Détails des périodes ({Array.isArray(req.items) ? req.items.length : 0})</CardTitle>
                      <CardDescription>Prix et restrictions soumis par l'utilisateur.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-2">
                        {Array.isArray(req.items) && req.items.length > 0 ? req.items.map((it, idx) => (
                          <div key={idx} className="grid grid-cols-2 md:grid-cols-6 gap-2 text-sm p-2 rounded bg-muted">
                            <div><span className="font-semibold">Du:</span> {it.start_date}</div>
                            <div><span className="font-semibold">Au:</span> {it.end_date}</div>
                            <div className="hidden md:block"><span className="font-semibold">Type:</span> {it.period_type || '—'}</div>
                            <div className="hidden md:block"><span className="font-semibold">Saison:</span> {it.season || '—'}</div>
                            <div><span className="font-semibold">Prix:</span> {typeof it.price === "number" ? `${it.price} €` : '—'}</div>
                            <div><span className="font-semibold">Min séjour:</span> {typeof it.min_stay === "number" ? it.min_stay : '—'}</div>
                            <div><span className="font-semibold">Fermé:</span> {it.closed ? 'Oui' : 'Non'}</div>
                            <div><span className="font-semibold">Arrivée fermée:</span> {it.closed_on_arrival ? 'Oui' : 'Non'}</div>
                            <div><span className="font-semibold">Départ fermé:</span> {it.closed_on_departure ? 'Oui' : 'Non'}</div>
                            {it.comment && <div className="md:col-span-6"><span className="font-semibold">Commentaire:</span> {it.comment}</div>}
                          </div>
                        )) : <p className="text-muted-foreground">Aucun détail fourni.</p>}
                      </div>
                    </CardContent>
                  </Card>
                </TableCell>
              </TableRow>
            )}
          </React.Fragment>
        ))}
      </TableBody>
    </Table>
  );

  if (error) {
    return (
      <AdminLayout>
        <Card>
          <CardHeader>
            <CardTitle>Erreur</CardTitle>
            <CardDescription>Impossible de charger les demandes.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-destructive">{error}</p>
          </CardContent>
        </Card>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <CalendarDays className="h-6 w-6" />
            Demandes Saison 2026
          </h1>
          <div className="flex items-center gap-3">
            {!loading && (
              <span className="text-sm text-muted-foreground">
                Total: {requests.length}
              </span>
            )}
            <ExportRequestsMenu data={requests.filter(r => r.status === tab)} tableRef={tableRef} currentStatus={tab} />
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Suivi des demandes</CardTitle>
            <CardDescription>Filtrez par statut et mettez à jour l'état des demandes.</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-48 w-full" />
            ) : (
              <Tabs value={tab} onValueChange={(v) => setTab(v as SeasonPricingStatus)}>
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="pending">En attente ({requests.filter(r => r.status === 'pending').length})</TabsTrigger>
                  <TabsTrigger value="processing">En cours ({requests.filter(r => r.status === 'processing').length})</TabsTrigger>
                  <TabsTrigger value="done">Terminées ({requests.filter(r => r.status === 'done').length})</TabsTrigger>
                  <TabsTrigger value="cancelled">Annulées ({requests.filter(r => r.status === 'cancelled').length})</TabsTrigger>
                </TabsList>
                <TabsContent value="pending" className="mt-4"><div ref={tableRef}>{renderTable()}</div></TabsContent>
                <TabsContent value="processing" className="mt-4"><div ref={tableRef}>{renderTable()}</div></TabsContent>
                <TabsContent value="done" className="mt-4"><div ref={tableRef}>{renderTable()}</div></TabsContent>
                <TabsContent value="cancelled" className="mt-4"><div ref={tableRef}>{renderTable()}</div></TabsContent>
              </Tabs>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminSeasonRequestsPage;