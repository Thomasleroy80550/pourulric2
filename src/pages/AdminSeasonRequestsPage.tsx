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
import { CalendarDays, Eye, CheckCircle, Ban, Wrench } from "lucide-react";
import { getAllSeasonPricingRequests, updateSeasonPricingRequestStatus, SeasonPricingRequest, SeasonPricingStatus } from "@/lib/season-pricing-api";
import ExportRequestsMenu from "@/components/admin/ExportRequestsMenu";
import SingleRequestExportMenu from "@/components/admin/SingleRequestExportMenu";
import { safeFormat } from "@/lib/date-utils";
import { saveChannelManagerSettings } from "@/lib/krossbooking";
import { addOverrides, NewPriceOverride } from "@/lib/price-override-api";
import { getAllUserRooms, AdminUserRoom } from "@/lib/admin-api";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { sendEmail } from "@/lib/notifications-api";
import { buildNewsletterHtml } from "@/components/EmailNewsletterTheme";
import DOMPurify from "dompurify";

const AdminSeasonRequestsPage: React.FC = () => {
  const [requests, setRequests] = useState<SeasonPricingRequest[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [tab, setTab] = useState<SeasonPricingStatus>("pending");
  const tableRef = useRef<HTMLDivElement>(null);
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [pendingApply, setPendingApply] = useState<SeasonPricingRequest | null>(null);
  const [allUserRooms, setAllUserRooms] = useState<AdminUserRoom[]>([]);
  const [roomsLoading, setRoomsLoading] = useState<boolean>(true);
  const [profilesById, setProfilesById] = useState<Record<string, { first_name: string | null; last_name: string | null; email: string | null }>>({});

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

  useEffect(() => {
    const fetchRooms = async () => {
      try {
        setRoomsLoading(true);
        const rooms = await getAllUserRooms();
        setAllUserRooms(rooms);
      } catch (err: any) {
        console.error("Erreur chargement des logements admin:", err);
      } finally {
        setRoomsLoading(false);
      }
    };
    fetchRooms();
  }, []);

  // NOUVEL effet: charger les profils (nom, email) pour les propriétaires des logements
  useEffect(() => {
    const loadProfiles = async () => {
      try {
        const userIds = Array.from(new Set(allUserRooms.map(r => r.user_id).filter(Boolean)));
        if (userIds.length === 0) {
          setProfilesById({});
          return;
        }
        const { data, error } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, email')
          .in('id', userIds);

        if (error) {
          console.error("Erreur chargement des profils:", error);
          return;
        }

        const map: Record<string, { first_name: string | null; last_name: string | null; email: string | null }> = {};
        (data || []).forEach((p: any) => {
          map[p.id] = { first_name: p.first_name ?? null, last_name: p.last_name ?? null, email: p.email ?? null };
        });
        setProfilesById(map);
      } catch (err) {
        console.error("Erreur inattendue chargement profils:", err);
      }
    };
    loadProfiles();
  }, [allUserRooms]);

  const filtered = useMemo(() => requests.filter(r => r.status === tab), [requests, tab]);

  // Appliquer une demande au logement (Krossbooking + overrides)
  const applyRequestToRoom = async (req: SeasonPricingRequest) => {
    const toastId = toast.loading("Application des prix & restrictions...");
    try {
      setApplyingId(req.id);

      // Trouver le logement correspondant (par user_id et room_id)
      const matchingRoom = allUserRooms.find(
        (r) =>
          r.user_id === req.user_id &&
          ((req.room_id && r.room_id === req.room_id) ||
            (req.room_name && r.room_name === req.room_name))
      );

      // Déterminer l'id_room_type à envoyer au Channel Manager
      const roomTypeId = matchingRoom?.room_id_2
        ? parseInt(matchingRoom.room_id_2, 10)
        : req.room_id
        ? parseInt(req.room_id, 10)
        : NaN;

      if (isNaN(roomTypeId)) {
        toast.error(
          "Impossible de déterminer l'ID de type de chambre (room_id_2/room_id). Vérifiez la configuration du logement.",
          { id: toastId }
        );
        setApplyingId(null);
        return;
      }

      // Construire le payload Channel Manager à partir des items
      const cmBlocks: Record<string, any> = {};
      req.items.forEach((it, idx) => {
        const block: any = {
          id_room_type: roomTypeId,
          id_rate: 1,
          cod_channel: "BE",
          date_from: it.start_date,
          date_to: it.end_date,
        };

        if (typeof it.price === "number") block.price = it.price;
        if (it.closed === true) block.closed = true;

        const restrictions: any = {};
        restrictions.MINST =
          typeof it.min_stay === "number" && it.min_stay > 0 ? it.min_stay : 2;
        if (it.closed_on_arrival === true) restrictions.CLARR = true;
        if (it.closed_on_departure === true) restrictions.CLDEP = true;

        block.restrictions = restrictions;

        cmBlocks[`block_${req.id}_${idx}`] = block;
      });

      const cmPayload = { cm: cmBlocks };

      // Envoyer au Channel Manager
      await saveChannelManagerSettings(cmPayload);

      // Enregistrer des overrides pour traçabilité
      const overrides: NewPriceOverride[] = req.items.map((it) => ({
        room_id: matchingRoom?.room_id || req.room_id || String(roomTypeId),
        room_name: matchingRoom?.room_name || req.room_name || "N/A",
        room_id_2: matchingRoom?.room_id_2 || undefined,
        start_date: it.start_date,
        end_date: it.end_date,
        price: typeof it.price === "number" ? it.price : undefined,
        closed: it.closed === true ? true : false,
        min_stay:
          typeof it.min_stay === "number" && it.min_stay > 0 ? it.min_stay : undefined,
        closed_on_arrival: it.closed_on_arrival === true ? true : false,
        closed_on_departure: it.closed_on_departure === true ? true : false,
      }));

      await addOverrides(overrides);

      toast.success("Prix & restrictions appliqués avec succès.", { id: toastId });
      setPendingApply(null);
    } catch (err: any) {
      console.error("Erreur application de la demande au logement:", err);
      toast.error(err.message || "Erreur lors de l'application de la demande.", { id: toastId });
    } finally {
      setApplyingId(null);
    }
  };

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

  const sendSmartPricingEmail = async (req: SeasonPricingRequest) => {
    const loadingId = toast.loading("Envoi de l'email Smart Pricing...");

    // Récupération de l'email depuis le profil
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("email")
      .eq("id", req.user_id)
      .single();

    if (profileError || !profile?.email) {
      toast.error("Email du propriétaire introuvable.", { id: loadingId });
      return;
    }

    const subject = `Smart Pricing – Validation automatique saison ${req.season_year}`;

    const bodyHtml = `
      <p>Vos tarifs sont ajustés automatiquement grâce à la solution Smart Pricing, en fonction de la demande, de la saisonnalité et du positionnement concurrentiel, afin d'optimiser vos revenus.</p>
      <p>Votre demande de tarifs pour ${req.season_year} est automatiquement validée. Étant déjà utilisateur du Smart Pricing, votre calendrier s'ouvre donc automatiquement.</p>
    `;

    const themedHtml = buildNewsletterHtml({
      subject,
      bodyHtml: DOMPurify.sanitize(bodyHtml),
    });

    await sendEmail(profile.email, subject, themedHtml);

    toast.success("L'email Smart Pricing a été envoyé.", { id: loadingId });
  };

  // NOUVEL calcul: liste des logements sans demande saison 2026 (hors demandes annulées)
  const missingRooms = useMemo(() => {
    const targetYear = 2026;
    const activeRequests = requests.filter(r => r.season_year === targetYear && r.status !== 'cancelled');

    return allUserRooms.filter(room => {
      const hasRequest = activeRequests.some(r =>
        r.user_id === room.user_id &&
        (
          (r.room_id && r.room_id === room.room_id) ||
          (!r.room_id && r.room_name && r.room_name === room.room_name)
        )
      );
      return !hasRequest;
    });
  }, [allUserRooms, requests]);

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
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setPendingApply(req)}
                  disabled={applyingId === req.id}
                >
                  <Wrench className="h-4 w-4 mr-2" /> Appliquer au logement
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
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setExpandedId(expandedId === req.id ? null : req.id)}
                >
                  <Eye className="h-4 w-4 mr-2" /> Détails
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => sendSmartPricingEmail(req)}
                >
                  Smart Pricing
                </Button>
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
                            <div><span className="font-semibold">Du:</span> {safeFormat(it.start_date, 'dd/MM/yyyy')}</div>
                            <div><span className="font-semibold">Au:</span> {safeFormat(it.end_date, 'dd/MM/yyyy')}</div>
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

        {/* NOUVELLE CARTE: logements sans demande saison 2026 */}
        <Card>
          <CardHeader>
            <CardTitle>Logements sans demande Saison 2026</CardTitle>
            <CardDescription>Suivi des logements dont le formulaire 2026 n'a pas été rempli.</CardDescription>
          </CardHeader>
          <CardContent>
            {(roomsLoading || loading) ? (
              <Skeleton className="h-32 w-full" />
            ) : (
              missingRooms.length === 0 ? (
                <p className="text-muted-foreground">Tous les logements ont une demande pour 2026.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Propriétaire</TableHead>
                      <TableHead>Logement</TableHead>
                      <TableHead>Identifiant</TableHead>
                      <TableHead>Email</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {missingRooms.map((room) => {
                      const profile = profilesById[room.user_id];
                      const ownerName = profile ? (`${profile.first_name ?? ''} ${profile.last_name ?? ''}`).trim() || '—' : '—';
                      return (
                        <TableRow key={room.id}>
                          <TableCell className="font-medium">{ownerName}</TableCell>
                          <TableCell>{room.room_name || '—'}</TableCell>
                          <TableCell>{room.room_id || '—'}</TableCell>
                          <TableCell>{profile?.email ?? '—'}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )
            )}
          </CardContent>
        </Card>

        {/* Dialog de confirmation pour l'application */}
        <AlertDialog open={!!pendingApply} onOpenChange={(open) => !open && setPendingApply(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Appliquer sur le logement ?</AlertDialogTitle>
              <AlertDialogDescription>
                Cette action enverra les prix et restrictions de la demande au Channel Manager
                et enregistrera les modifications comme overrides. Confirmez pour continuer.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogAction
                onClick={() => pendingApply && applyRequestToRoom(pendingApply)}
              >
                Confirmer
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AdminLayout>
  );
};

export default AdminSeasonRequestsPage;