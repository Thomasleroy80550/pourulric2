import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { CalendarDays, CheckCircle2, Loader2, Lock } from "lucide-react";
import { toast } from "sonner";
import MainLayout from "@/components/MainLayout";
import SmartPricingNotice from "@/components/SmartPricingNotice";
import { useSession } from "@/components/SessionContextProvider";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SEASON_2027_PERIODS, SEASON_2027_YEAR, type SeasonPeriod } from "@/lib/season-2027";
import {
  createSeasonPricingRequest,
  getExistingSeasonPricingRoomIds,
  getSmartPricingRoomIds,
  hasExistingSeasonPricingRequest,
  type SeasonPricingItem,
} from "@/lib/season-pricing-api";
import { getUserRooms, type UserRoom } from "@/lib/user-room-api";

type PeriodInput = { price?: string; minStay?: string };
type RoomState = "smart-pricing" | "requested" | "open";

const PLATFORM_MARKUPS = [
  { name: "Airbnb", multiplier: 1.17 },
  { name: "Booking", multiplier: 1.19 },
  { name: "Abritel", multiplier: 1.17 },
];

function dayOfMonth(date: Date) {
  return date.getDate() === 1 ? "1er" : String(date.getDate());
}

function periodDates(period: SeasonPeriod) {
  const start = parseISO(period.start);
  const end = parseISO(period.end);
  const year = end.getFullYear() === SEASON_2027_YEAR ? "" : ` ${end.getFullYear()}`;
  const endMonth = format(end, "MMMM", { locale: fr });
  if (start.getMonth() === end.getMonth()) return `${dayOfMonth(start)}–${dayOfMonth(end)} ${endMonth}${year}`;
  return `${dayOfMonth(start)} ${format(start, "MMMM", { locale: fr })} – ${dayOfMonth(end)} ${endMonth}${year}`;
}

function buildItems(inputs: Record<number, PeriodInput>): { items: SeasonPricingItem[] } | { error: string } {
  const items: SeasonPricingItem[] = [];
  for (const [index, period] of SEASON_2027_PERIODS.entries()) {
    const item = { start_date: period.start, end_date: period.end, period_type: period.label };
    if (period.minStay === null) {
      items.push({ ...item, price: null, min_stay: null, closed: true });
      continue;
    }
    const name = `${period.label} (${periodDates(period)})`;
    const priceText = inputs[index]?.price?.trim() ?? "";
    const minStayText = inputs[index]?.minStay?.trim() ?? "";
    const price = priceText ? Number(priceText) : null;
    const minStay = minStayText ? Number(minStayText) : period.minStay;
    if (price !== null && !(price >= 1 && price <= 100000)) {
      return { error: `${name} : le prix par nuit doit être compris entre 1 et 100 000 €.` };
    }
    if (!Number.isInteger(minStay) || minStay < 1 || minStay > 365) {
      return { error: `${name} : le séjour minimum doit être un nombre entier de nuits, entre 1 et 365.` };
    }
    items.push({ ...item, price, min_stay: minStay });
  }
  return { items };
}

const Season2027Page = () => {
  const { profile } = useSession();
  const userId = profile?.id;
  const [selectedRoomId, setSelectedRoomId] = useState("");
  const [inputs, setInputs] = useState<Record<number, PeriodInput>>({});
  const [submitting, setSubmitting] = useState(false);

  const roomsQuery = useQuery({
    queryKey: ["season-2027", "rooms", userId],
    queryFn: getUserRooms,
    enabled: Boolean(userId),
    refetchOnWindowFocus: false,
  });
  const requestedQuery = useQuery({
    queryKey: ["season-2027", "requested-rooms", userId],
    queryFn: () => getExistingSeasonPricingRoomIds(SEASON_2027_YEAR),
    enabled: Boolean(userId),
    refetchOnWindowFocus: false,
  });
  const smartPricingQuery = useQuery({
    queryKey: ["season-2027", "smart-pricing-rooms", userId],
    queryFn: getSmartPricingRoomIds,
    enabled: Boolean(userId),
    refetchOnWindowFocus: false,
    retry: false,
  });
  const queries = [roomsQuery, requestedQuery, smartPricingQuery];
  const loading = queries.some(query => query.isPending);
  const failed = queries.some(query => query.isError);

  const rooms = roomsQuery.data ?? [];
  const requestedRoomIds = requestedQuery.data ?? [];
  const smartPricingRoomIds = smartPricingQuery.data ?? [];

  const roomState = (room: UserRoom): RoomState => {
    if (smartPricingRoomIds.includes(room.id)) return "smart-pricing";
    return requestedRoomIds.includes(room.room_id) ? "requested" : "open";
  };
  const roomLabel = (room: UserRoom) => {
    const state = roomState(room);
    if (state === "smart-pricing") return `${room.room_name} • Smart Pricing`;
    return state === "requested" ? `${room.room_name} • déjà demandé` : room.room_name;
  };
  const defaultRoom = rooms.find(room => roomState(room) === "open") ?? rooms[0];
  const defaultRoomId = defaultRoom?.id;
  const selectedRoom = rooms.find(room => room.id === selectedRoomId) ?? defaultRoom;
  const selectedState = selectedRoom ? roomState(selectedRoom) : null;

  // Fige le choix initial : un changement de statut ne doit pas faire changer de logement en cours de saisie.
  useEffect(() => {
    if (!loading && !failed && !selectedRoomId && defaultRoomId) setSelectedRoomId(defaultRoomId);
  }, [loading, failed, selectedRoomId, defaultRoomId]);

  const setInput = (index: number, field: keyof PeriodInput, value: string) => {
    setInputs(previous => ({ ...previous, [index]: { ...previous[index], [field]: value } }));
  };

  const handleSubmit = async () => {
    if (!selectedRoom || selectedState !== "open" || submitting) return;
    const built = buildItems(inputs);
    if ("error" in built) {
      toast.error(built.error);
      return;
    }
    setSubmitting(true);
    const toastId = toast.loading("Envoi de la demande en cours…");
    try {
      if (await hasExistingSeasonPricingRequest(SEASON_2027_YEAR, selectedRoom.room_id)) {
        toast.error("Une demande existe déjà pour ce logement en 2027.", { id: toastId });
        return;
      }
      await createSeasonPricingRequest({
        season_year: SEASON_2027_YEAR,
        room_id: selectedRoom.room_id,
        room_name: selectedRoom.room_name,
        items: built.items,
      });
      toast.success("Votre demande a bien été envoyée. Notre équipe va la traiter.", { id: toastId });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible d'envoyer la demande.", { id: toastId });
      // Le serveur refuse un logement passé en Smart Pricing depuis l'ouverture de la page.
      void smartPricingQuery.refetch();
    } finally {
      await requestedQuery.refetch();
      setSubmitting(false);
    }
  };

  return (
    <MainLayout>
      <div className="container mx-auto space-y-6 py-6">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold sm:text-3xl">
            <CalendarDays className="h-6 w-6" />
            Saison 2027
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Votre demande sera enregistrée en attente dans notre suivi admin. Aucun tarif n’est envoyé à Cadence sans validation explicite de notre équipe.
          </p>
        </div>

        {failed ? (
          <Alert variant="destructive">
            <AlertTitle>Chargement impossible</AlertTitle>
            <AlertDescription className="space-y-3">
              <p>Vos logements n'ont pas pu être chargés. Aucune demande ne peut être envoyée pour le moment.</p>
              <Button variant="outline" size="sm" onClick={() => queries.forEach(query => void query.refetch())}>
                Réessayer
              </Button>
            </AlertDescription>
          </Alert>
        ) : loading ? (
          <div className="space-y-3">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-96 w-full" />
          </div>
        ) : !selectedRoom ? (
          <Card>
            <CardHeader>
              <CardTitle>Aucun logement</CardTitle>
              <CardDescription>Aucun logement ne vous a encore été attribué par un administrateur.</CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <>
            <Card>
              <CardContent className="space-y-2 p-4 sm:p-6">
                <Label htmlFor="season-2027-room">Logement concerné</Label>
                <Select value={selectedRoom.id} onValueChange={setSelectedRoomId} disabled={submitting}>
                  <SelectTrigger id="season-2027-room" className="w-full sm:max-w-md">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {rooms.map(room => (
                      <SelectItem key={room.id} value={room.id}>{roomLabel(room)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            {selectedState === "smart-pricing" && <SmartPricingNotice />}

            {selectedState === "requested" && (
              <Alert role="status">
                <CheckCircle2 className="h-4 w-4" />
                <AlertTitle>Demande déjà envoyée</AlertTitle>
                <AlertDescription>
                  Une demande de tarifs 2027 a déjà été envoyée pour ce logement. Contactez-nous si vous souhaitez la modifier.
                </AlertDescription>
              </Alert>
            )}

            {selectedState === "open" && (
              <Card>
                <CardHeader>
                  <CardTitle>Périodes de la saison 2027</CardTitle>
                  <CardDescription>
                    Les séjours minimums proposés sont modifiables. Si vous laissez un prix vide, notre équipe appliquera ses règles pour cette période.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Période</TableHead>
                        <TableHead>Dates</TableHead>
                        <TableHead>Séjour minimum</TableHead>
                        <TableHead>Prix par nuit (€)</TableHead>
                        <TableHead>Prix plateformes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {SEASON_2027_PERIODS.map((period, index) => {
                        const dates = periodDates(period);
                        if (period.minStay === null) {
                          return (
                            <TableRow key={period.start} className="bg-muted/40 hover:bg-muted/40">
                              <TableCell className="font-medium">{period.label}</TableCell>
                              <TableCell className="whitespace-nowrap">{dates}</TableCell>
                              <TableCell colSpan={3} className="text-muted-foreground">
                                <span className="inline-flex items-center gap-2">
                                  <Lock className="h-4 w-4" />
                                  Fermé à la location
                                </span>
                              </TableCell>
                            </TableRow>
                          );
                        }
                        const price = Number(inputs[index]?.price);
                        return (
                          <TableRow key={period.start}>
                            <TableCell className="font-medium">{period.label}</TableCell>
                            <TableCell className="whitespace-nowrap">{dates}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Input
                                  type="number"
                                  min={1}
                                  max={365}
                                  step={1}
                                  inputMode="numeric"
                                  aria-label={`Séjour minimum en nuits, ${period.label} (${dates})`}
                                  placeholder={String(period.minStay)}
                                  value={inputs[index]?.minStay ?? ""}
                                  onChange={event => setInput(index, "minStay", event.target.value)}
                                  disabled={submitting}
                                  className="w-20"
                                />
                                <span className="text-sm text-muted-foreground">nuits</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                min={1}
                                max={100000}
                                step={1}
                                inputMode="decimal"
                                aria-label={`Prix par nuit en euros, ${period.label} (${dates})`}
                                placeholder="ex. 120"
                                value={inputs[index]?.price ?? ""}
                                onChange={event => setInput(index, "price", event.target.value)}
                                disabled={submitting}
                                className="w-28"
                              />
                            </TableCell>
                            <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                              {price > 0
                                ? PLATFORM_MARKUPS.map(platform => `${platform.name} ${Math.round(price * platform.multiplier)} €`).join(" · ")
                                : "—"}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    <p className="text-xs text-muted-foreground">
                      Prix plateformes : estimation après majoration ({PLATFORM_MARKUPS.map(platform => `${platform.name} +${Math.round((platform.multiplier - 1) * 100)} %`).join(", ")}).
                    </p>
                    <Button onClick={() => void handleSubmit()} disabled={submitting}>
                      {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Envoyer ma demande
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </MainLayout>
  );
};

export default Season2027Page;
