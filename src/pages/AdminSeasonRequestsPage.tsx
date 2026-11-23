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
import AdminSeasonPriceEditor from "@/components/admin/AdminSeasonPriceEditor";
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
import { Switch } from "@/components/ui/switch";
import { useSearchParams } from "react-router-dom";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Season2027RequestEditor from "@/components/admin/Season2027RequestEditor";
import SmartPricingNotice from "@/components/SmartPricingNotice";
import { sendSeasonRequestToCadence } from "@/lib/admin-season-cadence-api";

const AdminSeasonRequestsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const seasonYear = searchParams.get("year") === "2026" ? 2026 : 2027;
  const [smartRoomIds, setSmartRoomIds] = useState<string[]>([]);
  const [linkedRoomIds, setLinkedRoomIds] = useState<string[]>([]);
  const [editingRequest, setEditingRequest] = useState<SeasonPricingRequest | null>(null);
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
  const [editingRoom, setEditingRoom] = useState<AdminUserRoom | null>(null);
  const [showOnlyNotDone, setShowOnlyNotDone] = useState<boolean>(false);

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
        const [rooms, assignments] = await Promise.all([
          getAllUserRooms(),
          supabase.from("channel_property_assignments").select("user_room_id,beyond_linked"),
        ]);
        if (assignments.error) throw new Error(assignments.error.message);
        setAllUserRooms(rooms);
        setLinkedRoomIds((assignments.data || []).map(link => link.user_room_id).filter(Boolean));
        setSmartRoomIds((assignments.data || []).filter(link => link.beyond_linked).map(link => link.user_room_id).filter(Boolean));
      } catch (err: any) {
        console.error("Erreur chargement des logements admin:", err);
        setError(err.message || "Impossible de charger les attributions Cadence.");
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

  // NEW: forcer le statut "done" pour un logement (sans envoi d'email)
  const forceDoneForRoom = async (room: AdminUserRoom) => {
    // Chercher une demande 2026 existante pour ce logement
    let query = supabase
      .from('season_price_requests')
      .select('id, status, user_id, season_year, room_id, room_name')
      .eq('user_id', room.user_id)
      .eq('season_year', 2026);

    if (room.room_id) {
      query = query.eq('room_id', room.room_id);
    } else if (room.room_name) {
      query = query.eq('room_name', room.room_name);
    }

    const { data: existing, error: searchError } = await query;
    if (searchError) {
      throw new Error(searchError.message);
    }

    if (existing && existing.length > 0) {
      const current = existing[0];
      if (current.status !== 'done') {
        // MAJ directe sans email
        const { error: updateError } = await supabase
          .from('season_price_requests')
          .update({ status: 'done' })
          .eq('id', current.id);
        if (updateError) throw new Error(updateError.message);
      }
      // MAJ locale
      setRequests(prev => {
        const found = prev.find(r => r.id === current.id);
        if (found) {
          return prev.map(r => r.id === current.id ? { ...r, status: 'done' } as SeasonPricingRequest : r);
        }
        return [{ ...(current as any), status: 'done' } as SeasonPricingRequest, ...prev];
      });
    } else {
      // Créer une demande "terminée" minimaliste
      const { data: inserted, error: insertError } = await supabase
        .from('season_price_requests')
        .insert({
          user_id: room.user_id,
          season_year: 2026,
          room_id: room.room_id ?? null,
          room_name: room.room_name ?? null,
          items: [],
          status: 'done',
        })
        .select('*')
        .single();
      if (insertError) throw new Error(insertError.message);
      if (inserted) {
        setRequests(prev => [inserted as unknown as SeasonPricingRequest, ...prev]);
      }
    }
  };

  // NEW: handler avec toasts pour clic par ligne
  const handleForceDoneClick = async (room: AdminUserRoom) => {
    const toastId = toast.loading("Mise à jour du statut...");
    try {
      await forceDoneForRoom(room);
      toast.success("Statut 'Terminé' appliqué.", { id: toastId });
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de la mise à jour.", { id: toastId });
    }
  };

  const roomsSummary = useMemo(() => {
    const list = requests.filter(r => r.season_year === seasonYear);
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
  }, [allUserRooms, requests, seasonYear]);

  const roomsFiltered = useMemo(() => {
    return showOnlyNotDone ? roomsSummary.filter(({ room, status }) => status !== 'done' && !(seasonYear === 2027 && smartRoomIds.includes(room.id))) : roomsSummary;
  }, [roomsSummary, showOnlyNotDone, seasonYear, smartRoomIds]);

  const seasonRequests = requests.filter(request => request.season_year === seasonYear);
  const filtered = seasonRequests.filter(request => request.status === tab);

  // ADD: handler pour mise à jour locale après création
  const handleAdminCreatedRequest = (req: SeasonPricingRequest) => {
    setRequests(prev => [req, ...prev]);
    toast.success("Demande validée créée par l'admin.");
  };

  const requestRoom = (req: SeasonPricingRequest) => allUserRooms.find(room => room.user_id === req.user_id && room.room_id === req.room_id);
  const sending = (req: SeasonPricingRequest) => applyingId === req.id || (req.cadence_send_status === 'sending' && Date.parse(req.cadence_send_started_at || '') > Date.now() - 120000);
  const canSend = (req: SeasonPricingRequest) => {
    const room = requestRoom(req);
    return !roomsLoading && room && linkedRoomIds.includes(room.id) && !smartRoomIds.includes(room.id) && req.status !== 'cancelled' && req.cadence_send_status !== 'sent' && !sending(req)
      && req.items.some(item => !item.closed) && req.items.filter(item => !item.closed).every(item => typeof item.price === 'number' && item.price > 0 && Number.isInteger(item.min_stay) && item.min_stay > 0);
  };
  const open2027Editor = (room: AdminUserRoom, req?: SeasonPricingRequest) => {
    setEditingRoom(room);
    setEditingRequest(req ?? requests.find(request => request.season_year === 2027 && request.user_id === room.user_id && request.room_id === room.room_id && request.status !== 'cancelled') ?? null);
  };
  const refreshFollowUp = async () => {
    try {
      const [list, assignments] = await Promise.all([getAllSeasonPricingRequests(), supabase.from('channel_property_assignments').select('user_room_id,beyond_linked')]);
      if (assignments.error) throw new Error(assignments.error.message);
      setRequests(list);
      setLinkedRoomIds((assignments.data || []).map(link => link.user_room_id).filter(Boolean));
      setSmartRoomIds((assignments.data || []).filter(link => link.beyond_linked).map(link => link.user_room_id).filter(Boolean));
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Actualisation impossible.'); }
  };

  const applyRequestToRoom = async (req: SeasonPricingRequest) => {
    const toastId = toast.loading(req.season_year === 2027 ? "Validation et envoi à Cadence…" : "Application des prix & restrictions...");
    try {
      setApplyingId(req.id);
      if (req.season_year === 2027) {
        const result = await sendSeasonRequestToCadence(req);
        setRequests(prev => prev.map(request => request.id === req.id ? { ...request, ...result.request } : request));
        if (result.warning) toast.warning(`Tarifs reçus par Cadence. ${result.warning}`, { id: toastId });
        else toast.success(result.already_sent ? "Cette demande a déjà été envoyée à Cadence." : "Tarifs reçus par Cadence. Vous pouvez terminer la demande après vérification.", { id: toastId });
        setPendingApply(null);
        return;
      }

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
      if (req.season_year === 2027) {
        try { setRequests(await getAllSeasonPricingRequests()); } catch { toast.error("Rechargez le suivi pour consulter le résultat de l’envoi."); }
      }
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
    const subject = `Relance – Formulaire Saison ${seasonYear} à compléter`;
    const formUrl = new URL(`/season-${seasonYear}`, window.location.origin).href;
    const bodyHtml = `
      <p>${name},</p>
      <p>Nous vous invitons à compléter le formulaire Saison ${seasonYear} pour votre logement ${room.room_name ?? ""} afin de préparer vos tarifs et restrictions.</p>
      <p>Votre demande sera examinée par notre équipe avant toute application des prix.</p>
      <p><a data-btn href="${formUrl}">Compléter le formulaire ${seasonYear}</a></p>
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

  // NEW: Smart Pricing + marquer le statut 2026 comme terminé pour le logement
  const complete2026ForRoom = async (room: AdminUserRoom) => {
    const toastId = toast.loading("Smart Pricing: envoi de l'email et clôture 2026...");
    try {
      // 1) Envoyer l'email Smart Pricing
      await sendSmartPricingEmailByUserId(room.user_id);

      // 2) Chercher une demande 2026 existante pour ce logement
      let query = supabase
        .from('season_price_requests')
        .select('id, status, user_id, season_year, room_id, room_name')
        .eq('user_id', room.user_id)
        .eq('season_year', 2026);

      if (room.room_id) {
        query = query.eq('room_id', room.room_id);
      } else if (room.room_name) {
        query = query.eq('room_name', room.room_name);
      }

      const { data: existing, error: searchError } = await query;

      if (searchError) {
        throw new Error(searchError.message);
      }

      if (existing && existing.length > 0) {
        const current = existing[0];
        if (current.status !== 'done') {
          await updateSeasonPricingRequestStatus(current.id, 'done');
          setRequests(prev => prev.map(r => r.id === current.id ? { ...r, status: 'done' } : r));
        }
      } else {
        // 3) Créer une demande "terminée" minimaliste si aucune n'existe
        const { data: inserted, error: insertError } = await supabase
          .from('season_price_requests')
          .insert({
            user_id: room.user_id,
            season_year: 2026,
            room_id: room.room_id ?? null,
            room_name: room.room_name ?? null,
            items: [],
            status: 'done',
          })
          .select('*')
          .single();

        if (insertError) {
          throw new Error(insertError.message);
        }

        setRequests(prev => [inserted as any, ...prev]);
      }

      toast.success("Statut 2026 marqué comme terminé.", { id: toastId });
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de la mise à jour du statut 2026.", { id: toastId });
    }
  };

  // ADD: tableau des demandes par onglet (avec détails et actions)
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
                {seasonYear === 2027 && <div className="mt-2 max-w-xs text-xs text-muted-foreground">
                  {req.cadence_send_status === 'sent' ? `Reçu par Cadence le ${safeFormat(req.cadence_sent_at, 'dd/MM/yyyy HH:mm')}` : req.cadence_send_status === 'sending' ? 'Envoi Cadence en cours — actualisez le suivi' : req.cadence_send_status === 'failed' ? 'Échec de l’envoi Cadence' : 'Non envoyé à Cadence'}
                  {req.cadence_error && <p className="mt-1 text-amber-700">{req.cadence_error}</p>}
                </div>}
              </TableCell>
              <TableCell>{format(new Date(req.created_at), 'dd/MM/yyyy', { locale: fr })}</TableCell>
              <TableCell className="text-right space-x-2">
                <Button variant="outline" size="sm" onClick={() => setExpandedId(expandedId === req.id ? null : req.id)}>
                  <Eye className="h-4 w-4 mr-2" /> Détails
                </Button>
                {seasonYear === 2027 && requestRoom(req) && !smartRoomIds.includes(requestRoom(req)!.id) && <Button variant="outline" size="sm" disabled={sending(req)} onClick={() => open2027Editor(requestRoom(req)!, req)}>Compléter / modifier</Button>}
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setPendingApply(req)}
                  disabled={seasonYear === 2027 ? !canSend(req) : applyingId === req.id}
                >
                  <Wrench className="h-4 w-4 mr-2" /> {seasonYear === 2027 ? 'Valider et envoyer à Cadence' : 'Appliquer au logement'}
                </Button>
                {req.status !== "processing" && (
                  <Button variant="outline" size="sm" disabled={sending(req)} onClick={() => updateStatus(req.id, "processing")}>
                    <CalendarDays className="h-4 w-4 mr-2" /> En cours
                  </Button>
                )}
                {req.status !== "done" && (
                  <Button size="sm" disabled={sending(req)} onClick={() => updateStatus(req.id, "done")}>
                    <CheckCircle className="h-4 w-4 mr-2" /> Terminer
                  </Button>
                )}
                {req.status !== "cancelled" && (
                  <Button variant="destructive" size="sm" disabled={sending(req)} onClick={() => updateStatus(req.id, "cancelled")}>
                    <Ban className="h-4 w-4 mr-2" /> Annuler
                  </Button>
                )}
                <SingleRequestExportMenu request={req} />
                {seasonYear === 2026 && <Button
                  variant="default"
                  size="sm"
                  onClick={() => sendSmartPricingEmail(req)}
                >
                  Smart Pricing
                </Button>}
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
                      {seasonYear === 2027 && requestRoom(req) && smartRoomIds.includes(requestRoom(req)!.id) && <div className="mb-4"><SmartPricingNotice /></div>}
                      {seasonYear === 2027 && <p className="mb-3 text-sm text-muted-foreground">Complétez tous les prix et séjours minimums ouverts avant l’envoi. Les fermetures sont à gérer séparément dans Cadence ; les statuts « En cours » et « Terminer » n’envoient rien.</p>}
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
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <CalendarDays className="h-6 w-6" />
            Demandes Saison {seasonYear}
          </h1>
          <div className="flex flex-wrap items-center gap-3">
            <Select value={String(seasonYear)} onValueChange={value => { setSearchParams({ year: value }); setEditingRoom(null); setEditingRequest(null); setPendingApply(null); }}>
              <SelectTrigger className="w-32" aria-label="Saison à afficher"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="2027">2027</SelectItem><SelectItem value="2026">2026</SelectItem></SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={() => void refreshFollowUp()}>Actualiser</Button>
            {!loading && (
              <span className="text-sm text-muted-foreground">
                Total: {seasonRequests.length}
              </span>
            )}
            <ExportRequestsMenu data={filtered} tableRef={tableRef} currentStatus={tab} seasonYear={seasonYear} />
          </div>
        </div>

        {/* RESTORED: Carte avec onglets pour gérer les demandes */}
        <Card>
          <CardHeader>
            <CardTitle>Suivi des demandes</CardTitle>
            <CardDescription>{seasonYear === 2027 ? 'Les demandes sont stockées ici en attente. Seul « Valider et envoyer à Cadence », suivi de votre confirmation, transmet les tarifs. Les autres boutons modifient uniquement le suivi.' : "Filtrez par statut et mettez à jour l'état des demandes."}</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-48 w-full" />
            ) : (
              <Tabs value={tab} onValueChange={(v) => setTab(v as SeasonPricingStatus)}>
                {!filtered.length && <p className="mb-4 text-sm text-muted-foreground">Aucune demande Saison {seasonYear} dans cet onglet.</p>}
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="pending">En attente ({seasonRequests.filter(r => r.status === 'pending').length})</TabsTrigger>
                  <TabsTrigger value="processing">En cours ({seasonRequests.filter(r => r.status === 'processing').length})</TabsTrigger>
                  <TabsTrigger value="done">Terminées ({seasonRequests.filter(r => r.status === 'done').length})</TabsTrigger>
                  <TabsTrigger value="cancelled">Annulées ({seasonRequests.filter(r => r.status === 'cancelled').length})</TabsTrigger>
                </TabsList>
                <TabsContent value="pending" className="mt-4"><div ref={tableRef}>{renderTable()}</div></TabsContent>
                <TabsContent value="processing" className="mt-4"><div ref={tableRef}>{renderTable()}</div></TabsContent>
                <TabsContent value="done" className="mt-4"><div ref={tableRef}>{renderTable()}</div></TabsContent>
                <TabsContent value="cancelled" className="mt-4"><div ref={tableRef}>{renderTable()}</div></TabsContent>
              </Tabs>
            )}
          </CardContent>
        </Card>

        {/* KEPT: Tableau unique de suivi des logements */}
        <Card>
          <CardHeader>
            <div className="flex items-start md:items-center justify-between gap-4 flex-wrap">
              <div>
                <CardTitle>Suivi des logements Saison {seasonYear}</CardTitle>
                <CardDescription>{seasonYear === 2027 ? 'Smart Pricing : aucune demande attendue. Les logements sans mapping Cadence doivent être associés avant tout envoi.' : 'Statut par logement (vert = terminé, rouge = non terminé) et actions.'}</CardDescription>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Switch id="only-not-done" checked={showOnlyNotDone} onCheckedChange={setShowOnlyNotDone} />
                  <label htmlFor="only-not-done" className="text-sm text-muted-foreground">Afficher non terminés</label>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {(roomsLoading || loading) ? (
              <Skeleton className="h-48 w-full" />
            ) : (
              <div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Propriétaire</TableHead>
                      <TableHead>Logement</TableHead>
                      <TableHead>Identifiant</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Statut {seasonYear}</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {roomsFiltered.map(({ room, status }) => {
                      const profile = profilesById[room.user_id];
                      const ownerName = profile ? (`${profile.first_name ?? ""} ${profile.last_name ?? ""}`).trim() || "—" : "—";
                      const email = profile?.email ?? "—";
                      const isDone = status === "done";
                      const smartPricing = seasonYear === 2027 && smartRoomIds.includes(room.id);
                      return (
                        <TableRow key={room.id}>
                          <TableCell className="font-medium">{ownerName}</TableCell>
                          <TableCell>{room.room_name || "—"}</TableCell>
                          <TableCell>{room.room_id || "—"}</TableCell>
                          <TableCell>{email}</TableCell>
                          <TableCell>
                            {smartPricing ? <span className="text-sm text-indigo-700">Smart Pricing — aucune action attendue</span> : isDone ? (
                              <span className="inline-flex items-center gap-2 text-green-600">
                                <CheckCircle className="h-4 w-4" /> Terminé
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-2 text-red-600">
                                <XCircle className="h-4 w-4" /> {status === 'none' ? 'Sans demande' : status === 'pending' ? 'En attente' : status === 'processing' ? 'En cours' : 'Annulé'}
                              </span>
                            )}
                            {seasonYear === 2027 && !linkedRoomIds.includes(room.id) && <p className="mt-1 text-xs text-amber-700">Mapping Cadence manquant</p>}
                          </TableCell>
                          <TableCell className="text-right space-x-2">
                            {status === 'none' && !smartPricing && (
                              <>
                                <Button size="sm" onClick={() => sendSeasonReminderEmail(room)}>
                                  Relancer
                                </Button>
                              </>
                            )}
                            {status !== 'done' && !smartPricing && (
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => seasonYear === 2027 ? open2027Editor(room) : setEditingRoom(room)}
                              >
                                Définir les prix
                              </Button>
                            )}
                            {seasonYear === 2026 && <Button variant="outline" size="sm" onClick={() => sendSmartPricingEmailByUserId(room.user_id)}>
                              Smart Pricing
                            </Button>}
                            {seasonYear === 2026 && !isDone && (
                              <Button variant="ghost" size="sm" onClick={() => handleForceDoneClick(room)}>
                                Forcer "Terminé"
                              </Button>
                            )}
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
              <AlertDialogTitle>{pendingApply?.season_year === 2027 ? 'Valider et envoyer les tarifs 2027 à Cadence ?' : 'Appliquer sur le logement ?'}</AlertDialogTitle>
              <AlertDialogDescription>
                {pendingApply?.season_year === 2027 ? `Vous validez les prix et séjours minimums de ${pendingApply.room_name || pendingApply.room_id}. Seule cette confirmation les enverra à Cadence. Les tarifs propriétaire hors des périodes modifiées seront conservés. Les fermetures (${pendingApply.items.filter(item => item.closed).length} période(s)) ne seront pas envoyées et devront être traitées séparément. La demande restera « En cours » jusqu’à votre clôture manuelle.` : 'Cette action enverra les prix et restrictions de la demande au Channel Manager et enregistrera les modifications comme overrides. Confirmez pour continuer.'}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <Button variant="outline" onClick={() => setPendingApply(null)} disabled={!!applyingId}>Annuler</Button>
              <AlertDialogAction
                disabled={!!applyingId || (pendingApply?.season_year === 2027 && !canSend(pendingApply))}
                onClick={() => pendingApply && applyRequestToRoom(pendingApply)}
              >
                {pendingApply?.season_year === 2027 ? 'Confirmer la validation et l’envoi' : 'Confirmer'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* RENDU: afficher l'éditeur seulement si un logement est sélectionné */}
        {editingRoom && (seasonYear === 2027 ? <Season2027RequestEditor
          key={editingRequest?.id || editingRoom.id}
          room={editingRoom}
          request={editingRequest || undefined}
          smartPricing={smartRoomIds.includes(editingRoom.id)}
          onClose={() => { setEditingRoom(null); setEditingRequest(null); }}
          onSaved={saved => setRequests(prev => {
            const enriched = { ...saved, profiles: profilesById[saved.user_id] || null };
            return prev.some(request => request.id === saved.id) ? prev.map(request => request.id === saved.id ? enriched : request) : [enriched, ...prev];
          })}
        /> : (
          <AdminSeasonPriceEditor
            open={true}
            onOpenChange={(open) => setEditingRoom(open ? editingRoom : null)}
            room={editingRoom}
            onCreated={handleAdminCreatedRequest}
          />
        ))}
      </div>
    </AdminLayout>
  );
};

export default AdminSeasonRequestsPage;