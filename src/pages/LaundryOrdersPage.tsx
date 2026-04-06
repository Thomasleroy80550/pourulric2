import React, { useEffect, useMemo, useState } from 'react';
import { addDays, endOfDay, format, parseISO, startOfDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import { AlertTriangle, CalendarDays, Copy, Package, RefreshCw, Save, ShoppingCart, Users } from 'lucide-react';
import { toast } from 'sonner';

import AdminLayout from '@/components/AdminLayout';
import MainLayout from '@/components/MainLayout';
import BannedUserMessage from '@/components/BannedUserMessage';
import SuspendedAccountMessage from '@/components/SuspendedAccountMessage';
import { useSession } from '@/components/SessionContextProvider';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { AdminUserRoom, getAllUserRooms } from '@/lib/admin-api';
import { fetchKrossbookingReservations, KrossbookingReservation } from '@/lib/krossbooking';
import { updateUserRoom } from '@/lib/user-room-api';

const defaultEndDate = format(addDays(new Date(), 14), 'yyyy-MM-dd');
const defaultStartDate = format(new Date(), 'yyyy-MM-dd');
const excludedStatuses = new Set(['CANC', 'PROP0']);

interface LaundryOrdersPageProps {
  adminView?: boolean;
}

type LinenDraft = {
  linen_guest_capacity: number;
  linen_large_sheet_qty: number;
  linen_large_duvet_cover_qty: number;
  linen_small_sheet_qty: number;
  linen_small_duvet_cover_qty: number;
};

type ReservationLinenTotals = {
  guest_capacity: number;
  pillowcase_qty: number;
  bath_sheet_qty: number;
  towel_qty: number;
  linen_large_sheet_qty: number;
  linen_large_duvet_cover_qty: number;
  linen_small_sheet_qty: number;
  linen_small_duvet_cover_qty: number;
};

type ReservationWithLinen = {
  reservation: KrossbookingReservation;
  room?: AdminUserRoom;
  totals: ReservationLinenTotals;
  totalPieces: number;
  hasConfiguration: boolean;
};

const emptyDraft = (): LinenDraft => ({
  linen_guest_capacity: 0,
  linen_large_sheet_qty: 0,
  linen_large_duvet_cover_qty: 0,
  linen_small_sheet_qty: 0,
  linen_small_duvet_cover_qty: 0,
});

const emptyReservationTotals = (): ReservationLinenTotals => ({
  guest_capacity: 0,
  pillowcase_qty: 0,
  bath_sheet_qty: 0,
  towel_qty: 0,
  linen_large_sheet_qty: 0,
  linen_large_duvet_cover_qty: 0,
  linen_small_sheet_qty: 0,
  linen_small_duvet_cover_qty: 0,
});

const getRoomDraft = (room: AdminUserRoom): LinenDraft => ({
  linen_guest_capacity: room.linen_guest_capacity ?? 0,
  linen_large_sheet_qty: room.linen_large_sheet_qty ?? 0,
  linen_large_duvet_cover_qty: room.linen_large_duvet_cover_qty ?? 0,
  linen_small_sheet_qty: room.linen_small_sheet_qty ?? 0,
  linen_small_duvet_cover_qty: room.linen_small_duvet_cover_qty ?? 0,
});

const computeReservationTotals = (room?: AdminUserRoom): ReservationLinenTotals => {
  if (!room) return emptyReservationTotals();

  const guestCapacity = room.linen_guest_capacity ?? 0;

  return {
    guest_capacity: guestCapacity,
    pillowcase_qty: guestCapacity,
    bath_sheet_qty: guestCapacity,
    towel_qty: guestCapacity,
    linen_large_sheet_qty: room.linen_large_sheet_qty ?? 0,
    linen_large_duvet_cover_qty: room.linen_large_duvet_cover_qty ?? 0,
    linen_small_sheet_qty: room.linen_small_sheet_qty ?? 0,
    linen_small_duvet_cover_qty: room.linen_small_duvet_cover_qty ?? 0,
  };
};

const countPieces = (totals: ReservationLinenTotals) =>
  totals.pillowcase_qty +
  totals.bath_sheet_qty +
  totals.towel_qty +
  totals.linen_large_sheet_qty +
  totals.linen_large_duvet_cover_qty +
  totals.linen_small_sheet_qty +
  totals.linen_small_duvet_cover_qty;

const isConfigured = (draft: LinenDraft) =>
  draft.linen_guest_capacity > 0 ||
  draft.linen_large_sheet_qty > 0 ||
  draft.linen_large_duvet_cover_qty > 0 ||
  draft.linen_small_sheet_qty > 0 ||
  draft.linen_small_duvet_cover_qty > 0;

const ownerName = (room?: AdminUserRoom) => {
  if (!room?.profiles) return 'Non attribué';
  return [room.profiles.first_name, room.profiles.last_name].filter(Boolean).join(' ') || 'Sans nom';
};

const formatLinenDetails = (totals: ReservationLinenTotals) => {
  const items = [
    { label: 'Taies', value: totals.pillowcase_qty },
    { label: 'Draps de bain', value: totals.bath_sheet_qty },
    { label: 'Serviettes', value: totals.towel_qty },
    { label: 'Grands draps', value: totals.linen_large_sheet_qty },
    { label: 'Grandes housses', value: totals.linen_large_duvet_cover_qty },
    { label: 'Petits draps', value: totals.linen_small_sheet_qty },
    { label: 'Petites housses', value: totals.linen_small_duvet_cover_qty },
  ].filter((item) => item.value > 0);

  return items.length > 0
    ? items.map((item) => `${item.label}: ${item.value}`).join(' • ')
    : 'Configuration linge non renseignée';
};

const LaundryOrdersPage: React.FC<LaundryOrdersPageProps> = ({ adminView = false }) => {
  const { profile } = useSession();
  const Layout = adminView ? AdminLayout : MainLayout;

  const [userRooms, setUserRooms] = useState<AdminUserRoom[]>([]);
  const [reservations, setReservations] = useState<KrossbookingReservation[]>([]);
  const [roomDrafts, setRoomDrafts] = useState<Record<string, LinenDraft>>({});
  const [loading, setLoading] = useState(true);
  const [savingRoomId, setSavingRoomId] = useState<string | null>(null);
  const [filterRoomId, setFilterRoomId] = useState('all');
  const [startDate, setStartDate] = useState(defaultStartDate);
  const [endDate, setEndDate] = useState(defaultEndDate);

  const loadData = async () => {
    setLoading(true);
    try {
      const rooms = await getAllUserRooms();
      const bookingData = await fetchKrossbookingReservations(rooms, true);

      setUserRooms(rooms);
      setReservations(bookingData);
      setRoomDrafts(Object.fromEntries(rooms.map((room) => [room.id, getRoomDraft(room)])));
    } catch (error: any) {
      toast.error(error.message || 'Impossible de charger la blanchisserie.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (profile?.role === 'admin' && !profile?.is_banned && !profile?.is_payment_suspended) {
      loadData();
    } else {
      setLoading(false);
    }
  }, [profile?.role, profile?.is_banned, profile?.is_payment_suspended]);

  const roomByKrossbookingId = useMemo(
    () => new Map(userRooms.map((room) => [room.room_id, room])),
    [userRooms],
  );

  const filteredReservations = useMemo(() => {
    const start = startOfDay(parseISO(startDate));
    const end = endOfDay(parseISO(endDate));

    return reservations
      .filter((reservation) => !excludedStatuses.has((reservation.status || '').toUpperCase()))
      .filter((reservation) => {
        const checkInDate = parseISO(reservation.check_in_date);
        return checkInDate >= start && checkInDate <= end;
      })
      .filter((reservation) => filterRoomId === 'all' || reservation.krossbooking_room_id === filterRoomId)
      .sort((a, b) => parseISO(a.check_in_date).getTime() - parseISO(b.check_in_date).getTime());
  }, [endDate, filterRoomId, reservations, startDate]);

  const reservationsWithLinen = useMemo<ReservationWithLinen[]>(() => {
    return filteredReservations.map((reservation) => {
      const room = roomByKrossbookingId.get(reservation.krossbooking_room_id);
      const totals = computeReservationTotals(room);

      return {
        reservation,
        room,
        totals,
        totalPieces: countPieces(totals),
        hasConfiguration: room ? isConfigured(getRoomDraft(room)) : false,
      };
    });
  }, [filteredReservations, roomByKrossbookingId]);

  const aggregatedTotals = useMemo(() => {
    return reservationsWithLinen.reduce<ReservationLinenTotals>((acc, item) => {
      acc.guest_capacity += item.totals.guest_capacity;
      acc.pillowcase_qty += item.totals.pillowcase_qty;
      acc.bath_sheet_qty += item.totals.bath_sheet_qty;
      acc.towel_qty += item.totals.towel_qty;
      acc.linen_large_sheet_qty += item.totals.linen_large_sheet_qty;
      acc.linen_large_duvet_cover_qty += item.totals.linen_large_duvet_cover_qty;
      acc.linen_small_sheet_qty += item.totals.linen_small_sheet_qty;
      acc.linen_small_duvet_cover_qty += item.totals.linen_small_duvet_cover_qty;
      return acc;
    }, emptyReservationTotals());
  }, [reservationsWithLinen]);

  const roomsMissingConfiguration = useMemo(() => {
    const missingRooms = new Map<string, AdminUserRoom>();

    reservationsWithLinen.forEach((item) => {
      if (item.room && !item.hasConfiguration) {
        missingRooms.set(item.room.id, item.room);
      }
    });

    return Array.from(missingRooms.values());
  }, [reservationsWithLinen]);

  const totalPiecesToOrder = countPieces(aggregatedTotals);

  const orderPreview = useMemo(() => {
    const lines = [
      'Commande blanchisserie',
      `Période : du ${format(parseISO(startDate), 'dd/MM/yyyy')} au ${format(parseISO(endDate), 'dd/MM/yyyy')}`,
      `Réservations prises en compte : ${reservationsWithLinen.length}`,
      '',
      'Quantités à prévoir :',
      `- Taies : ${aggregatedTotals.pillowcase_qty}`,
      `- Draps de bain : ${aggregatedTotals.bath_sheet_qty}`,
      `- Serviettes : ${aggregatedTotals.towel_qty}`,
      `- Grands draps : ${aggregatedTotals.linen_large_sheet_qty}`,
      `- Grandes housses : ${aggregatedTotals.linen_large_duvet_cover_qty}`,
      `- Petits draps : ${aggregatedTotals.linen_small_sheet_qty}`,
      `- Petites housses : ${aggregatedTotals.linen_small_duvet_cover_qty}`,
      '',
      'Détail par arrivée :',
    ];

    if (reservationsWithLinen.length === 0) {
      lines.push('- Aucune réservation sur cette période');
    } else {
      reservationsWithLinen.forEach((item) => {
        lines.push(
          `- ${format(parseISO(item.reservation.check_in_date), 'dd/MM/yyyy', { locale: fr })} • ${ownerName(item.room)} • ${item.reservation.property_name} • ${item.reservation.guest_name} • ${formatLinenDetails(item.totals)}`,
        );
      });
    }

    return lines.join('\n');
  }, [aggregatedTotals, endDate, reservationsWithLinen, startDate]);

  const handleDraftChange = (roomId: string, field: keyof LinenDraft, value: string) => {
    const parsedValue = Number.isNaN(Number(value)) ? 0 : Math.max(0, Number(value));

    setRoomDrafts((prev) => ({
      ...prev,
      [roomId]: {
        ...(prev[roomId] || emptyDraft()),
        [field]: parsedValue,
      },
    }));
  };

  const handleSaveRoom = async (room: AdminUserRoom) => {
    const draft = roomDrafts[room.id] || emptyDraft();
    setSavingRoomId(room.id);

    try {
      const updatedRoom = await updateUserRoom(room.id, draft);
      setUserRooms((prev) =>
        prev.map((item) => (item.id === room.id ? { ...item, ...updatedRoom, profiles: item.profiles } : item)),
      );
      toast.success(`Configuration linge enregistrée pour ${room.room_name}.`);
    } catch (error: any) {
      toast.error(error.message || 'Impossible d’enregistrer la configuration.');
    } finally {
      setSavingRoomId(null);
    }
  };

  const handleCopyOrder = async () => {
    try {
      await navigator.clipboard.writeText(orderPreview);
      toast.success('La commande blanchisserie a été copiée.');
    } catch {
      toast.error('Impossible de copier la commande.');
    }
  };

  if (profile?.is_banned) {
    return (
      <Layout>
        <BannedUserMessage />
      </Layout>
    );
  }

  if (profile?.is_payment_suspended) {
    return (
      <Layout>
        <SuspendedAccountMessage />
      </Layout>
    );
  }

  if (profile?.role !== 'admin') {
    return (
      <Layout>
        <div className="container mx-auto py-6">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Accès non autorisé</AlertTitle>
            <AlertDescription>
              Le module blanchisserie est réservé aux administrateurs.
            </AlertDescription>
          </Alert>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto space-y-6 py-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Blanchisserie</h1>
            <p className="text-muted-foreground">
              Tous les logements sont visibles ici. La capacité voyageurs sert automatiquement à calculer les taies, draps de bain et serviettes.
            </p>
          </div>
          <Button variant="outline" onClick={loadData} disabled={loading}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Actualiser
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Filtrer la période de commande</CardTitle>
            <CardDescription>
              Les quantités sont calculées à partir des arrivées actives comprises dans la période sélectionnée.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="laundry-start-date">Début</Label>
              <Input id="laundry-start-date" type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="laundry-end-date">Fin</Label>
              <Input id="laundry-end-date" type="date" value={endDate} min={startDate} onChange={(event) => setEndDate(event.target.value)} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Logement</Label>
              <Select value={filterRoomId} onValueChange={setFilterRoomId}>
                <SelectTrigger>
                  <SelectValue placeholder="Tous les logements" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les logements</SelectItem>
                  {userRooms.map((room) => (
                    <SelectItem key={room.id} value={room.room_id}>
                      {room.room_name} — {ownerName(room)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Logements visibles</CardDescription>
                <CardTitle className="text-3xl">{userRooms.length}</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center gap-2 text-sm text-muted-foreground">
                <Package className="h-4 w-4" />
                Tous les logements admin
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Réservations à traiter</CardDescription>
                <CardTitle className="text-3xl">{reservationsWithLinen.length}</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center gap-2 text-sm text-muted-foreground">
                <CalendarDays className="h-4 w-4" />
                Arrivées dans la période
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Capacité cumulée</CardDescription>
                <CardTitle className="text-3xl">{aggregatedTotals.guest_capacity}</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="h-4 w-4" />
                Base de calcul linge / personnes
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Total pièces</CardDescription>
                <CardTitle className="text-3xl">{totalPiecesToOrder}</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center gap-2 text-sm text-muted-foreground">
                <ShoppingCart className="h-4 w-4" />
                Quantité globale à commander
              </CardContent>
            </Card>
          </div>
        )}

        {roomsMissingConfiguration.length > 0 && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Configurations linge incomplètes</AlertTitle>
            <AlertDescription>
              Complétez les logements suivants pour obtenir une commande exacte : {roomsMissingConfiguration.map((room) => `${room.room_name} (${ownerName(room)})`).join(', ')}.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <Card>
            <CardHeader>
              <CardTitle>Détail des réservations prises en compte</CardTitle>
              <CardDescription>
                L’admin voit ici l’ensemble des logements et le détail de linge calculé réservation par réservation.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-3">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : reservationsWithLinen.length === 0 ? (
                <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
                  Aucune réservation active sur cette période.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Arrivée</TableHead>
                        <TableHead>Propriétaire</TableHead>
                        <TableHead>Logement</TableHead>
                        <TableHead>Voyageur</TableHead>
                        <TableHead>Quantités</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reservationsWithLinen.map((item) => (
                        <TableRow key={item.reservation.id}>
                          <TableCell>{format(parseISO(item.reservation.check_in_date), 'dd/MM/yyyy', { locale: fr })}</TableCell>
                          <TableCell>{ownerName(item.room)}</TableCell>
                          <TableCell>{item.reservation.property_name}</TableCell>
                          <TableCell>{item.reservation.guest_name}</TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <p className="text-sm">{formatLinenDetails(item.totals)}</p>
                              {!item.hasConfiguration && <Badge variant="outline">Configuration manquante</Badge>}
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-medium">{item.totalPieces}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Commande prête à envoyer</CardTitle>
              <CardDescription>
                Copiez ce récapitulatif pour l’envoyer à votre blanchisserie.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-lg border p-3">
                  <p className="text-muted-foreground">Taies</p>
                  <p className="text-2xl font-semibold">{aggregatedTotals.pillowcase_qty}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-muted-foreground">Draps de bain</p>
                  <p className="text-2xl font-semibold">{aggregatedTotals.bath_sheet_qty}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-muted-foreground">Serviettes</p>
                  <p className="text-2xl font-semibold">{aggregatedTotals.towel_qty}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-muted-foreground">Grands draps</p>
                  <p className="text-2xl font-semibold">{aggregatedTotals.linen_large_sheet_qty}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-muted-foreground">Grandes housses</p>
                  <p className="text-2xl font-semibold">{aggregatedTotals.linen_large_duvet_cover_qty}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-muted-foreground">Petits draps</p>
                  <p className="text-2xl font-semibold">{aggregatedTotals.linen_small_sheet_qty}</p>
                </div>
                <div className="rounded-lg border p-3 md:col-span-2">
                  <p className="text-muted-foreground">Petites housses</p>
                  <p className="text-2xl font-semibold">{aggregatedTotals.linen_small_duvet_cover_qty}</p>
                </div>
              </div>
              <Textarea value={orderPreview} readOnly className="min-h-[320px] font-mono text-xs" />
              <Button className="w-full" onClick={handleCopyOrder}>
                <Copy className="mr-2 h-4 w-4" />
                Copier la commande
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Configuration linge des logements</CardTitle>
            <CardDescription>
              Capacité voyageurs = nombre de taies + draps de bain + serviettes par réservation. Les draps et housses sont saisis séparément.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="grid gap-4 lg:grid-cols-2">
                <Skeleton className="h-64 w-full" />
                <Skeleton className="h-64 w-full" />
              </div>
            ) : userRooms.length === 0 ? (
              <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
                Aucun logement configuré pour le moment.
              </div>
            ) : (
              <div className="grid gap-4 lg:grid-cols-2">
                {userRooms.map((room) => {
                  const draft = roomDrafts[room.id] || emptyDraft();
                  const configured = isConfigured(draft);

                  return (
                    <Card key={room.id} className="border-dashed">
                      <CardHeader className="pb-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <CardTitle className="text-lg">{room.room_name}</CardTitle>
                            <CardDescription>
                              {ownerName(room)} • ID chambre : {room.room_id}
                            </CardDescription>
                          </div>
                          <Badge variant={configured ? 'secondary' : 'outline'}>
                            {configured ? 'Configuré' : 'À compléter'}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2 col-span-2">
                            <Label>Capacité voyageurs</Label>
                            <Input
                              type="number"
                              min={0}
                              value={draft.linen_guest_capacity}
                              onChange={(event) => handleDraftChange(room.id, 'linen_guest_capacity', event.target.value)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Grand drap</Label>
                            <Input
                              type="number"
                              min={0}
                              value={draft.linen_large_sheet_qty}
                              onChange={(event) => handleDraftChange(room.id, 'linen_large_sheet_qty', event.target.value)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Grande housse</Label>
                            <Input
                              type="number"
                              min={0}
                              value={draft.linen_large_duvet_cover_qty}
                              onChange={(event) => handleDraftChange(room.id, 'linen_large_duvet_cover_qty', event.target.value)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Petit drap</Label>
                            <Input
                              type="number"
                              min={0}
                              value={draft.linen_small_sheet_qty}
                              onChange={(event) => handleDraftChange(room.id, 'linen_small_sheet_qty', event.target.value)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Petite housse</Label>
                            <Input
                              type="number"
                              min={0}
                              value={draft.linen_small_duvet_cover_qty}
                              onChange={(event) => handleDraftChange(room.id, 'linen_small_duvet_cover_qty', event.target.value)}
                            />
                          </div>
                        </div>
                        <div className="rounded-lg bg-muted/50 p-3 text-sm space-y-1">
                          <p className="font-medium">Calcul automatique par réservation</p>
                          <p className="text-muted-foreground">Taies : {draft.linen_guest_capacity}</p>
                          <p className="text-muted-foreground">Draps de bain : {draft.linen_guest_capacity}</p>
                          <p className="text-muted-foreground">Serviettes : {draft.linen_guest_capacity}</p>
                        </div>
                        <div className="flex items-center justify-between gap-3 rounded-lg bg-muted/50 p-3 text-sm">
                          <div>
                            <p className="font-medium">Quantité totale par réservation</p>
                            <p className="text-muted-foreground">{countPieces(computeReservationTotals({ ...room, ...draft }))} pièce(s)</p>
                          </div>
                          <Button onClick={() => handleSaveRoom(room)} disabled={savingRoomId === room.id}>
                            <Save className="mr-2 h-4 w-4" />
                            {savingRoomId === room.id ? 'Enregistrement...' : 'Enregistrer'}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default LaundryOrdersPage;
