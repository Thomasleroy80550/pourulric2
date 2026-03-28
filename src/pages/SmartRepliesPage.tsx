import { useCallback, useEffect, useMemo, useState } from "react";
import { format, parseISO, subDays } from "date-fns";
import { fr } from "date-fns/locale";
import { Bot, Loader2, RefreshCw, Send, Sparkles } from "lucide-react";
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
  if (!value) {
    return "—";
  }

  try {
    return format(parseISO(value), "dd MMM yyyy à HH:mm", { locale: fr });
  } catch {
    return value;
  }
}

function formatDate(value?: string | null) {
  if (!value) {
    return "—";
  }

  try {
    return format(parseISO(value), "dd MMM yyyy", { locale: fr });
  } catch {
    return value;
  }
}

function buildRecentLastUpdate() {
  return format(subDays(new Date(), 90), "yyyy-MM-dd HH:mm:ss");
}

function roomHighlights(room: RoomContext | null) {
  if (!room) {
    return [] as Array<{ label: string; value: string }>;
  }

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
  const [search, setSearch] = useState("");
  const [unreadOnly, setUnreadOnly] = useState(true);
  const [additionalInstructions, setAdditionalInstructions] = useState("");
  const [draft, setDraft] = useState("");
  const [aiResult, setAiResult] = useState<GeneratedReply | null>(null);
  const [loadingPage, setLoadingPage] = useState(true);
  const [loadingThreads, setLoadingThreads] = useState(false);
  const [loadingThread, setLoadingThread] = useState(false);
  const [generatingReply, setGeneratingReply] = useState(false);
  const [sendingReply, setSendingReply] = useState(false);

  const loadThreads = useCallback(
    async (options?: { keepSelection?: boolean }) => {
      setLoadingThreads(true);
      try {
        const data = await listAuthorizedMessageThreads({
          search: search.trim() || undefined,
          unreadOnly,
          lastUpdate: buildRecentLastUpdate(),
        });

        setThreads(data);

        const nextSelectedId = options?.keepSelection
          ? data.find((thread) => thread.id_thread === selectedThreadId)?.id_thread ?? data[0]?.id_thread ?? null
          : data[0]?.id_thread ?? null;

        setSelectedThreadId(nextSelectedId);
      } catch (error: any) {
        toast.error(error.message || "Erreur lors du chargement des messages.");
      } finally {
        setLoadingThreads(false);
      }
    },
    [search, selectedThreadId, unreadOnly],
  );

  useEffect(() => {
    if (sessionLoading || !profile) {
      return;
    }

    const initialize = async () => {
      setLoadingPage(true);
      try {
        const loadedRooms = isAdmin
          ? ((await getAllUserRooms()) as RoomContext[])
          : ((await getUserRooms()) as RoomContext[]);

        setRooms(loadedRooms);

        const data = await listAuthorizedMessageThreads({
          unreadOnly: true,
          lastUpdate: buildRecentLastUpdate(),
        });
        setThreads(data);
        setSelectedThreadId(data[0]?.id_thread ?? null);
      } catch (error: any) {
        toast.error(error.message || "Erreur lors de l'initialisation.");
      } finally {
        setLoadingPage(false);
      }
    };

    initialize();
  }, [isAdmin, profile, sessionLoading]);

  useEffect(() => {
    const loadSelectedThread = async () => {
      if (!selectedThreadId) {
        setSelectedThread(null);
        return;
      }

      const selectedSummary = threads.find((thread) => thread.id_thread === selectedThreadId);

      setLoadingThread(true);
      setAiResult(null);
      setDraft("");

      try {
        const data = await getAuthorizedMessageThread(selectedThreadId, selectedSummary?.id_reservation);
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

  const selectedRoom = useMemo(() => {
    const roomId = selectedThread?.reservation?.room_id;
    if (!roomId) {
      return null;
    }

    return rooms.find((room) => room.room_id === roomId) ?? null;
  }, [rooms, selectedThread]);

  const selectedHighlights = useMemo(() => roomHighlights(selectedRoom), [selectedRoom]);
  const ownerLabel = useMemo(() => {
    const firstName = selectedRoom?.profiles?.first_name?.trim();
    const lastName = selectedRoom?.profiles?.last_name?.trim();
    return [firstName, lastName].filter(Boolean).join(" ") || null;
  }, [selectedRoom]);

  const handleGenerateReply = async () => {
    if (!selectedThread) {
      return;
    }

    setGeneratingReply(true);
    try {
      const result = await generateKrossbookingReply({
        thread: selectedThread.thread,
        reservation: selectedThread.reservation,
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
    if (!selectedThread || !draft.trim()) {
      return;
    }

    setSendingReply(true);
    try {
      await sendMessageToAuthorizedThread(
        selectedThread.thread.id_thread,
        draft.trim(),
        selectedThread.reservation?.id_reservation,
      );
      toast.success("Message envoyé.");
      await Promise.all([
        loadThreads({ keepSelection: true }),
        (async () => {
          const refreshedThread = await getAuthorizedMessageThread(
            selectedThread.thread.id_thread,
            selectedThread.reservation?.id_reservation,
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
                ? "Module prioritairement pensé pour l’équipe admin : analyse des demandes voyageurs et préparation d’un brouillon avant envoi."
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
                {isAdmin ? "Vue globale des fils reliés aux réservations connues dans l'application." : "Filtrés sur vos réservations autorisées."}
              </CardDescription>
              <div className="flex gap-2">
                <Input
                  placeholder="Rechercher un voyageur ou un message"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      loadThreads();
                    }
                  }}
                />
                <Button variant="secondary" onClick={() => loadThreads()} disabled={loadingThreads}>
                  Rechercher
                </Button>
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
                    {threads.map((thread) => (
                      <button
                        key={thread.id_thread}
                        type="button"
                        onClick={() => setSelectedThreadId(thread.id_thread)}
                        className={cn(
                          "w-full rounded-xl border p-4 text-left transition hover:border-primary/40 hover:bg-muted/40",
                          selectedThreadId === thread.id_thread && "border-primary bg-primary/5",
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="font-medium">{thread.reservation?.label || `Réservation #${thread.id_reservation}`}</div>
                            <div className="text-sm text-muted-foreground">{thread.reservation?.room_name || "Logement non identifié"}</div>
                          </div>
                          <Badge variant="secondary">{thread.cod_channel}</Badge>
                        </div>
                        <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{thread.last_message_text || "Aperçu indisponible"}</p>
                        <div className="mt-3 text-xs text-muted-foreground">{formatDateTime(thread.last_message_date)}</div>
                      </button>
                    ))}
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
                      <Badge variant="outline">{selectedThread.reservation?.room_name || "Logement non trouvé"}</Badge>
                      {ownerLabel && <Badge variant="outline">Client {ownerLabel}</Badge>}
                      <Badge variant="outline">
                        {formatDate(selectedThread.reservation?.arrival)} → {formatDate(selectedThread.reservation?.departure)}
                      </Badge>
                    </div>

                    {!selectedRoom && (
                      <Alert>
                        <AlertTitle>Contexte logement incomplet</AlertTitle>
                        <AlertDescription>
                          Ce fil est bien rattaché à une réservation, mais aucun logement détaillé n'a été retrouvé pour enrichir la réponse IA.
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
                        {selectedThread.thread.messages.map((message) => {
                          const isHost = message.sender === "host";
                          return (
                            <div key={message.id_message} className={cn("flex", isHost ? "justify-end" : "justify-start")}>
                              <div
                                className={cn(
                                  "max-w-[85%] rounded-2xl px-4 py-3 text-sm",
                                  isHost ? "bg-primary text-primary-foreground" : "bg-muted",
                                )}
                              >
                                <div className="mb-1 text-xs opacity-80">
                                  {isHost ? "Vous" : "Voyageur"} • {formatDateTime(message.date)}
                                </div>
                                <div className="whitespace-pre-wrap break-words">{message.text}</div>
                              </div>
                            </div>
                          );
                        })}
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
                  placeholder="Consignes supplémentaires optionnelles pour l'IA (ex: ton plus formel, rappeler l'heure d'arrivée, etc.)"
                  value={additionalInstructions}
                  onChange={(event) => setAdditionalInstructions(event.target.value)}
                  rows={3}
                />

                {aiResult && (
                  <div className="rounded-xl border bg-muted/20 p-4 space-y-3">
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
