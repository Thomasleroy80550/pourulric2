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
import { CalendarDays, Eye, CheckCircle, Ban, Wrench, XCircle } from "lucide-react";
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

  // NEW: charger profils pour afficher nom/email par logement
  useEffect(() => {
    const loadProfiles = async () => {
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
    };
    loadProfiles();
  }, [allUserRooms]);

  // NEW: résumé par logement (statut 2026)
  const roomsSummary = useMemo(() => {
    const targetYear = 2026;
    const list = requests.filter(r => r.season_year === targetYear);
    const statusByKey: Record<string, SeasonPricingStatus | 'none'> = {};
    list.forEach(r => {
      const key = `${r.user_id}:${r.room_id ?? r.room_name ?? 'unknown'}`;
      const current = statusByKey[key];
      if (r.status === 'done') {
        statusByKey[key] = 'done';
      } else if (!current || current !== 'done') {
        statusByKey[key] = r.status;
      }
    });
    return allUserRooms.map(room => {
      const key = `${room.user_id}:${room.room_id ?? room.room_name ?? 'unknown'}`;
      const status = statusByKey[key] ?? 'none';
      return { room, status };
    });
  }, [allUserRooms, requests]);

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

  // NEW: relance email pour les logements sans demande
  const sendSeasonReminderEmail = async (room: AdminUserRoom) => {
    const loadingId = toast.loading("Envoi de la relance...");
    const profile = profilesById[room.user_id];
    const email = profile?.email;
    if (!email) {
      toast.error("Email du propriétaire introuvable.", { id: loadingId });
      return;
    }
    const name = `${profile?.first_name ?? ""} ${profile?.last_name ?? ""}`.trim() || "Bonjour";
    const subject = "Relance – Formulaire Saison 2026 à compléter";
    const bodyHtml = `
      <p>${name},</p>
      <p>Nous vous invitons à compléter le formulaire Saison 2026 pour votre logement ${room.room_name ?? ""} afin de finaliser vos tarifs et restrictions.</p>
      <p>Cela nous permettra d'ouvrir votre calendrier à temps et d'optimiser vos revenus pour la saison à venir.</p>
      <p><a data-btn href="https://beta.proprietaire.hellokeys.fr">Compléter le formulaire 2026</a></p>
      <p>Cordialement,<br/>L'équipe Hello Keys</p>
    `;
    const themedHtml = buildNewsletterHtml({
      subject,
      bodyHtml: DOMPurify.sanitize(bodyHtml),
    });
    await sendEmail(email, subject, themedHtml);
    toast.success("Relance envoyée.", { id: loadingId });
  };

  // NEW: email Smart Pricing par propriétaire (sans objet SeasonPricingRequest)
  const sendSmartPricingEmailByUserId = async (user_id: string) => {
    const loadingId = toast.loading("Envoi de l'email Smart Pricing...");
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("email, first_name, last_name")
      .eq("id", user_id)
      .single();

    if (profileError || !profile?.email) {
      toast.error("Email du propriétaire introuvable.", { id: loadingId });
      return;
    }

    const subject = `Smart Pricing – Validation automatique saison 2026`;
    const bodyHtml = `
      <p>Vos tarifs sont ajustés automatiquement grâce à la solution Smart Pricing, en fonction de la demande, de la saisonnalité et du positionnement concurrentiel, afin d'optimiser vos revenus.</p>
      <p>Votre demande de tarifs pour 2026 est automatiquement validée. Étant déjà utilisateur du Smart Pricing, votre calendrier s'ouvre donc automatiquement.</p>
    `;
    const themedHtml = buildNewsletterHtml({
      subject,
      bodyHtml: DOMPurify.sanitize(bodyHtml),
    });
    await sendEmail(profile.email, subject, themedHtml);
    toast.success("L'email Smart Pricing a été envoyé.", { id: loadingId });
  };

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
            <ExportRequestsMenu data={requests} tableRef={tableRef} currentStatus={tab} />
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Suivi des logements Saison 2026</CardTitle>
            <CardDescription>Statut par logement (vert = terminé, rouge = non terminé) et actions.</CardDescription>
          </CardHeader>
          <CardContent>
            {(roomsLoading || loading) ? (
              <Skeleton className="h-48 w-full" />
            ) : (
              <div ref={tableRef}>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Propriétaire</TableHead>
                      <TableHead>Logement</TableHead>
                      <TableHead>Identifiant</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Statut 2026</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {roomsSummary.map(({ room, status }) => {
                      const profile = profilesById[room.user_id];
                      const ownerName = profile ? (`${profile.first_name ?? ""} ${profile.last_name ?? ""}`).trim() || "—" : "—";
                      const email = profile?.email ?? "—";
                      const isDone = status === "done";
                      return (
                        <TableRow key={room.id}>
                          <TableCell className="font-medium">{ownerName}</TableCell>
                          <TableCell>{room.room_name || "—"}</TableCell>
                          <TableCell>{room.room_id || "—"}</TableCell>
                          <TableCell>{email}</TableCell>
                          <TableCell>
                            {isDone ? (
                              <span className="inline-flex items-center gap-2 text-green-600">
                                <CheckCircle className="h-4 w-4" /> Terminé
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-2 text-red-600">
                                <XCircle className="h-4 w-4" /> Non terminé
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-right space-x-2">
                            {/* Bouton Relancer uniquement si aucune demande */}
                            {status === 'none' && (
                              <Button size="sm" onClick={() => sendSeasonReminderEmail(room)}>
                                Relancer
                              </Button>
                            )}
                            {/* Bouton Smart Pricing accessible pour tous */}
                            <Button variant="outline" size="sm" onClick={() => sendSmartPricingEmailByUserId(room.user_id)}>
                              Smart Pricing
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
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