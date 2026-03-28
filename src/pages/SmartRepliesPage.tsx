import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { format, parseISO, startOfDay, subDays } from "date-fns";
import { fr } from "date-fns/locale";
import { Bot, CalendarRange, Loader2, RefreshCw, Send, Sparkles } from "lucide-react";
import { toast } from "sonner";

import AdminLayout from "@/components/AdminLayout";
import MainLayout from "@/components/MainLayout";
import { useSession } from "@/components/SessionContextProvider";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { getAllUserRooms } from "@/lib/admin-api";
import {
  getReservationEmailEventLookups,
  type ReservationEmailEventLookup,
} from "@/lib/reservation-email-events-admin";

import {
  AuthorizedMessageThread,
  AuthorizedMessageThreadSummary,
  GeneratedReply,
  generateKrossbookingReply,
  getAuthorizedMessageThread,
  listAuthorizedMessageThreads,
  sendMessageToAuthorizedThread,
} from "@/lib/krossbooking-messaging-ai";
import { cn } from "@/lib/utils";
import { getUserRooms, UserRoom } from "@/lib/user-room-api";

type RoomContext = UserRoom & {
  profiles?: {
    first_name?: string | null;
    last_name?: string | null;
  } | null;
};

function formatDateTime(value?: string | null) {
  if (!value) return "—";
  try {
    return format(parseISO(value), "dd MMM yyyy à HH:mm", { locale: fr });
  } catch {
    return value;
  }
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  try {
    return format(parseISO(value), "dd MMM yyyy", { locale: fr });
  } catch {
    return value;
  }
}

function formatDateInput(value: Date) {
  return format(value, "yyyy-MM-dd");
}

function buildDateTimeRange(fromDate: string, toDate: string) {
  const safeFrom = fromDate || formatDateInput(subDays(new Date(), 365));
  const safeTo = toDate || formatDateInput(new Date());

  return {
    lastUpdate: `${safeFrom} 00:00:00`,
    dateTo: `${safeTo} 23:59:59`,
  };
}

function roomHighlights(room: RoomContext | null) {
  if (!room) return [] as Array<{ label: string; value: string }>;

  return [
    room.arrival_instructions ? { label: "Arrivée", value: room.arrival_instructions } : null,
    room.departure_instructions ? { label: "Départ", value: room.departure_instructions } : null,
    room.parking_info ? { label: "Parking", value: room.parking_info } : null,
    room.wifi_code || room.wifi_ssid
      ? { label: "Wi‑Fi", value: [room.wifi_ssid, room.wifi_code].filter(Boolean).join(" · ") }
      : null,
    room.house_rules ? { label: "Règles", value: room.house_rules } : null,
    room.logement_specificities ? { label: "Particularités", value: room.logement_specificities } : null,
  ].filter(Boolean) as Array<{ label: string; value: string }>;
}

const SmartRepliesPage = () => {
  const { profile, loading: sessionLoading } = useSession();
  const isAdmin = profile?.role === "admin";
  const Layout = isAdmin ? AdminLayout : MainLayout;

  const [rooms, setRooms] = useState<RoomContext[]>([]);
  const [threads, setThreads] = useState<AuthorizedMessageThreadSummary[]>([]);
  const [selectedThreadId, setSelectedThreadId] = useState<number | null>(null);
  const [selectedThread, setSelectedThread] = useState<AuthorizedMessageThread | null>(null);
  const [reservationLookupMap, setReservationLookupMap] = useState<Record<string, ReservationEmailEventLookup>>({});
  const [search, setSearch] = useState("");
  const [unreadOnly, setUnreadOnly] = useState(true);
  const [fromDate, setFromDate] = useState(formatDateInput(subDays(startOfDay(new Date()), 365)));
  const [toDate, setToDate] = useState(formatDateInput(new Date()));
  const [additionalInstructions, setAdditionalInstructions] = useState("");
  const [draft, setDraft] = useState("");
  const [aiResult, setAiResult] = useState<GeneratedReply | null>(null);
  const [loadingPage, setLoadingPage] = useState(true);
  const [loadingThreads, setLoadingThreads] = useState(false);
  const [loadingThread, setLoadingThread] = useState(false);
  const [sendingReply, setSendingReply] = useState(false);
  const [generatingReply, setGeneratingReply] = useState(false);
  const initializedRef = useRef(false);

  const currentRange = useMemo(() => buildDateTimeRange(fromDate, toDate), [fromDate, toDate]);

  const hydrateReservationLookups = useCallback(
    async (threadRows: AuthorizedMessageThreadSummary[]) => {
      if (!isAdmin) {
        setReservationLookupMap({});
        return;
      }

      const reservationIds = threadRows
        .map((thread) => thread.id_reservation)
        .filter((value): value is string => typeof value === "string" && value.trim().length > 0);

      if (reservationIds.length === 0) {
        setReservationLookupMap({});
        return;
      }

      try {
        const lookups = await getReservationEmailEventLookups(reservationIds);
        setReservationLookupMap(
          lookups.reduce<Record<string, ReservationEmailEventLookup>>((acc, row) => {
            if (row.reservation_id) {
              acc[String(row.reservation_id)] = row;
            }
            return acc;
          }, {}),
        );
      } catch (error: any) {
        toast.error(error.message || "Erreur lors du chargement du contexte réservation.");
      }
    },
    [isAdmin],
  );

  const loadThreads = useCallback(
    async (options?: { keepSelection?: boolean }) => {
      setLoadingThreads(true);
      try {
        const data = await listAuthorizedMessageThreads({
          search: search.trim() || undefined,
          unreadOnly,
          lastUpdate: currentRange.lastUpdate,
          dateTo: currentRange.dateTo,
        });

        setThreads(data);
        await hydrateReservationLookups(data);

        const nextSelectedId = options?.keepSelection
          ? data.find((thread) => thread.id_thread === selectedThreadId)?.id_thread ?? data[0]?.id_thread ?? null
          : data[0]?.id_thread ?? null;

        setSelectedThreadId(Number.isFinite(nextSelectedId) ? nextSelectedId : null);
      } catch (error: any) {
        toast.error(error.message || "Erreur lors du chargement des messages.");
      } finally {
        setLoadingThreads(false);
      }
    },
    [currentRange.dateTo, currentRange.lastUpdate, hydrateReservationLookups, search, selectedThreadId, unreadOnly],
  );

  useEffect(() => {
    if (sessionLoading || !profile || initializedRef.current) {
      return;
    }

    initializedRef.current = true;

    const initialize = async () => {
      setLoadingPage(true);
      try {
        const loadedRooms = isAdmin
          ? ((await getAllUserRooms()) as RoomContext[])
          : ((await getUserRooms()) as RoomContext[]);

        setRooms(loadedRooms);

        const data = await listAuthorizedMessageThreads({
          unreadOnly: true,
          lastUpdate: currentRange.lastUpdate,
          dateTo: currentRange.dateTo,
        });

        setThreads(data);
        await hydrateReservationLookups(data);
        setSelectedThreadId(Number.isFinite(data[0]?.id_thread) ? data[0].id_thread : null);
      } catch (error: any) {
        toast.error(error.message || "Erreur lors de l'initialisation.");
      } finally {
        setLoadingPage(false);
      }
    };

    initialize();
  }, [currentRange.dateTo, currentRange.lastUpdate, hydrateReservationLookups, isAdmin, profile, sessionLoading]);

  useEffect(() => {
    const loadSelectedThread = async () => {
      if (!selectedThreadId || !Number.isFinite(selectedThreadId)) {
        setSelectedThread(null);
        return;
      }

      const selectedSummary = threads.find((thread) => thread.id_thread === selectedThreadId);

      setLoadingThread(true);
      setAiResult(null);
      setDraft("");

      try {
        const data = await getAuthorizedMessageThread(selectedThreadId, selectedSummary?.id_reservation ?? undefined);
        setSelectedThread(data);
      } catch (error: any) {
        toast.error(error.message || "Erreur lors du chargement du fil.");
        setSelectedThread(null);
      } finally {
        setLoadingThread(false);
      }
    };

    loadSelectedThread();
  }, [selectedThreadId, threads]);

  const selectedSummary = useMemo(
    () => threads.find((thread) => thread.id_thread === selectedThreadId) ?? null,
    [selectedThreadId, threads],
  );

  const selectedLookup = useMemo(() => {
    const reservationId = selectedThread?.thread.id_reservation ?? selectedSummary?.id_reservation;
    if (!reservationId) return null;
    return reservationLookupMap[String(reservationId)] ?? null;
  }, [reservationLookupMap, selectedSummary, selectedThread]);

  const effectiveReservation = useMemo(() => {
    const reservationId = selectedThread?.thread.id_reservation ?? selectedSummary?.id_reservation;

    if (!reservationId) {
      return selectedThread?.reservation ?? selectedSummary?.reservation ?? null;
    }

    return {
      ...(selectedSummary?.reservation ?? {}),
      ...(selectedThread?.reservation ?? {}),
      id_reservation: reservationId,
      label:
        selectedThread?.reservation?.label ||
        selectedSummary?.reservation?.label ||
        selectedLookup?.guest_name ||
        undefined,
      arrival:
        selectedThread?.reservation?.arrival ||
        selectedSummary?.reservation?.arrival ||
        selectedLookup?.arrival_date ||
        undefined,
      departure:
        selectedThread?.reservation?.departure ||
        selectedSummary?.reservation?.departure ||
        selectedLookup?.departure_date ||
        undefined,
      room_name:
        selectedThread?.reservation?.room_name ||
        selectedSummary?.reservation?.room_name ||
        selectedLookup?.room_name ||
        undefined,
      room_id:
        selectedThread?.reservation?.room_id ||
        selectedSummary?.reservation?.room_id ||
        undefined,
    };
  }, [selectedLookup, selectedSummary, selectedThread]);

  const selectedRoom = useMemo(() => {
    const roomId = effectiveReservation?.room_id;
    if (roomId) {
      const byRoomId = rooms.find((room) => room.room_id === roomId);
      if (byRoomId) return byRoomId;
    }

    const matchedRoomId = selectedLookup?.matched_user_room_ids?.[0];
    if (matchedRoomId) {
      const byMatchedId = rooms.find((room) => room.id === matchedRoomId);
      if (byMatchedId) return byMatchedId;
    }

    const roomName = effectiveReservation?.room_name;
    if (roomName) {
      const byName = rooms.find((room) => room.room_name.toLowerCase() === roomName.toLowerCase());
      if (byName) return byName;
    }

    return null;
  }, [effectiveReservation, rooms, selectedLookup]);

  const selectedHighlights = useMemo(() => roomHighlights(selectedRoom), [selectedRoom]);

  const ownerLabel = useMemo(() => {
    const firstName = selectedRoom?.profiles?.first_name?.trim();
    const lastName = selectedRoom?.profiles?.last_name?.trim();
    return [firstName, lastName].filter(Boolean).join(" ") || null;
  }, [selectedRoom]);

  const handleGenerateReply = async () => {
    if (!selectedThread) return;

    setGeneratingReply(true);
    try {
      const result = await generateKrossbookingReply({
        thread: selectedThread.thread,
        reservation: effectiveReservation,
        room: selectedRoom,
        additionalInstructions,
      });

      setAiResult(result);
      setDraft(result.suggestedReply || "");
      toast.success("Brouillon généré.");
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de la génération du brouillon.");
    } finally {
      setGeneratingReply(false);
    }
  };

  const handleSendReply = async () => {
    if (!selectedThread || !draft.trim()) return;

    setSendingReply(true);
    try {
      await sendMessageToAuthorizedThread(
        selectedThread.thread.id_thread,
        draft.trim(),
        effectiveReservation?.id_reservation,
      );
      toast.success("Message envoyé.");

      await Promise.all([
        loadThreads({ keepSelection: true }),
        (async () => {
          const refreshedThread = await getAuthorizedMessageThread(
            selectedThread.thread.id_thread,
            effectiveReservation?.id_reservation,
          );
          setSelectedThread(refreshedThread);
        })(),
      ]);

      setDraft("");
      setAiResult(null);
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de l'envoi du message.");
    } finally {
      setSendingReply(false);
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Réponses IA</h1>
            <p className="text-muted-foreground">
              {isAdmin
                ? "Chargement des fils non lus de tous les logements via Messaging - Get threads, avec filtre de plage de dates."
                : "Analysez les demandes voyageurs et préparez un brouillon basé sur les informations de vos logements."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 rounded-md border bg-background px-3 py-2">
              <Switch checked={unreadOnly} onCheckedChange={setUnreadOnly} />
              <span className="text-sm">Non lus uniquement</span>
            </div>
            <Button variant="outline" onClick={() => loadThreads()} disabled={loadingThreads}>
              {loadingThreads ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              Actualiser
            </Button>
          </div>
        </div>

        {rooms.length === 0 && !loadingPage && (
          <Alert>
            <AlertTitle>Aucun logement exploitable</AlertTitle>
            <AlertDescription>
              {isAdmin
                ? "Aucun logement utilisateur n'est encore relié pour enrichir les réponses IA."
                : "Renseignez au moins un logement dans « Mes logements » pour que l'IA puisse utiliser votre contexte métier."}
            </AlertDescription>
          </Alert>
        )}

        <div className="grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
          <Card className="min-h-[70vh]">
            <CardHeader>
              <CardTitle>Fils Krossbooking</CardTitle>
              <CardDescription>
                {isAdmin ? "Tous les fils remontés par Get threads sur la plage choisie." : "Filtrés sur vos réservations autorisées."}
              </CardDescription>
              <div className="grid gap-2">
                <div className="flex gap-2">
                  <Input
                    placeholder="Rechercher un voyageur ou un message"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") loadThreads();
                    }}
                  />
                  <Button variant="secondary" onClick={() => loadThreads()} disabled={loadingThreads}>
                    Rechercher
                  </Button>
                </div>
                <div className="grid gap-2 md:grid-cols-[1fr_1fr_auto]">
                  <Input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} />
                  <Input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} />
                  <Button variant="outline" onClick={() => loadThreads()} disabled={loadingThreads || fromDate > toDate}>
                    <CalendarRange className="mr-2 h-4 w-4" />
                    Appliquer
                  </Button>
                </div>
                {fromDate > toDate && <p className="text-xs text-destructive">La date de fin doit être postérieure à la date de début.</p>}
              </div>
            </CardHeader>
            <CardContent>
              {loadingPage || loadingThreads || sessionLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-24 w-full" />
                  <Skeleton className="h-24 w-full" />
                  <Skeleton className="h-24 w-full" />
                </div>
              ) : threads.length === 0 ? (
                <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                  Aucun fil trouvé avec les filtres actuels.
                </div>
              ) : (
                <ScrollArea className="h-[60vh] pr-3">
                  <div className="space-y-3">
                    {threads.map((thread) => {
                      const lookup = thread.id_reservation ? reservationLookupMap[String(thread.id_reservation)] ?? null : null;
                      const title = thread.reservation?.label || lookup?.guest_name || `Fil #${thread.id_thread}`;
                      const roomName = thread.reservation?.room_name || lookup?.room_name || "Logement non identifié";

                      return (
                        <button
                          key={`${thread.id_thread}-${thread.id_reservation ?? "none"}`}
                          type="button"
                          onClick={() => setSelectedThreadId(Number.isFinite(thread.id_thread) ? thread.id_thread : null)}
                          className={cn(
                            "w-full rounded-xl border p-4 text-left transition hover:border-primary/40 hover:bg-muted/40",
                            selectedThreadId === thread.id_thread && "border-primary bg-primary/5",
                          )}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="font-medium">{title}</div>
                              <div className="text-sm text-muted-foreground">{roomName}</div>
                            </div>
                            <Badge variant="secondary">{thread.cod_channel}</Badge>
                          </div>
                          <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{thread.last_message_text || "Aperçu indisponible"}</p>
                          <div className="mt-3 text-xs text-muted-foreground">{formatDateTime(thread.last_message_date)}</div>
                        </button>
                      );
                    })}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Détail du fil</CardTitle>
                <CardDescription>Conversation et contexte du logement.</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingThread ? (
                  <div className="space-y-3">
                    <Skeleton className="h-20 w-full" />
                    <Skeleton className="h-20 w-full" />
                    <Skeleton className="h-20 w-full" />
                  </div>
                ) : !selectedThread ? (
                  <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                    Sélectionnez un fil à analyser.
                  </div>
                ) : (
                  <div className="space-y-5">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge>{selectedThread.thread.cod_channel}</Badge>
                      <Badge variant="outline">{effectiveReservation?.room_name || "Logement non identifié"}</Badge>
                      {ownerLabel && <Badge variant="outline">Client {ownerLabel}</Badge>}
                      <Badge variant="outline">
                        {formatDate(effectiveReservation?.arrival)} → {formatDate(effectiveReservation?.departure)}
                      </Badge>
                    </div>

                    {!selectedRoom && (
                      <Alert>
                        <AlertTitle>Contexte logement incomplet</AlertTitle>
                        <AlertDescription>
                          Le fil est bien chargé depuis Krossbooking, mais son logement n'a pas encore été relié automatiquement aux données internes.
                        </AlertDescription>
                      </Alert>
                    )}

                    {selectedHighlights.length > 0 && (
                      <div className="grid gap-3 md:grid-cols-2">
                        {selectedHighlights.map((item) => (
                          <div key={item.label} className="rounded-lg border bg-muted/20 p-3">
                            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{item.label}</div>
                            <div className="mt-1 text-sm">{item.value}</div>
                          </div>
                        ))}
                      </div>
                    )}

                    <Separator />

                    <ScrollArea className="h-[340px] rounded-lg border p-4">
                      <div className="space-y-4">
                        {selectedThread.thread.messages?.length ? (
                          selectedThread.thread.messages.map((message) => {
                            const isHost = message.sender === "host";
                            return (
                              <div key={`${message.id_message}-${message.date}`} className={cn("flex", isHost ? "justify-end" : "justify-start")}>
                                <div
                                  className={cn(
                                    "max-w-[85%] rounded-2xl px-4 py-3 text-sm",
                                    isHost ? "bg-primary text-primary-foreground" : "bg-muted",
                                  )}
                                >
                                  <div className="mb-1 text-xs opacity-80">
                                    {isHost ? "Vous" : effectiveReservation?.label || selectedLookup?.guest_name || "Voyageur"} • {formatDateTime(message.date)}
                                  </div>
                                  <div className="whitespace-pre-wrap break-words">{message.text}</div>
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <div className="text-sm text-muted-foreground">Aucun message exploitable dans ce fil.</div>
                        )}
                      </div>
                    </ScrollArea>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Bot className="h-5 w-5" />
                      Brouillon semi-automatique
                    </CardTitle>
                    <CardDescription>GPT identifie la demande et prépare une réponse éditable avant envoi.</CardDescription>
                  </div>
                  <Button onClick={handleGenerateReply} disabled={!selectedThread || generatingReply}>
                    {generatingReply ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                    Générer le brouillon
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  placeholder="Consignes supplémentaires optionnelles pour l'IA"
                  value={additionalInstructions}
                  onChange={(event) => setAdditionalInstructions(event.target.value)}
                  rows={3}
                />

                {aiResult && (
                  <div className="space-y-3 rounded-xl border bg-muted/20 p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary">{aiResult.intentCategory}</Badge>
                      <Badge variant="outline">Confiance {Math.round((aiResult.confidence || 0) * 100)}%</Badge>
                    </div>
                    <p className="text-sm">{aiResult.intentSummary}</p>
                    {aiResult.factsUsed?.length > 0 && (
                      <div>
                        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Faits utilisés</div>
                        <div className="mt-1 text-sm">{aiResult.factsUsed.join(" • ")}</div>
                      </div>
                    )}
                    {aiResult.missingInformation?.length > 0 && (
                      <div>
                        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Informations manquantes</div>
                        <div className="mt-1 text-sm">{aiResult.missingInformation.join(" • ")}</div>
                      </div>
                    )}
                  </div>
                )}

                <Textarea
                  placeholder="Le brouillon apparaîtra ici…"
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  rows={8}
                />

                <div className="flex justify-end">
                  <Button onClick={handleSendReply} disabled={!selectedThread || !draft.trim() || sendingReply}>
                    {sendingReply ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                    Envoyer dans Krossbooking
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default SmartRepliesPage;