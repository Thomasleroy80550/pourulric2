import React, { useEffect, useMemo, useState } from 'react';
import { format, parseISO, startOfDay, endOfDay, addDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { AlertTriangle, BedDouble, CalendarDays, Copy, Package, RefreshCw, Save, ShoppingCart } from 'lucide-react';
import { toast } from 'sonner';

import MainLayout from '@/components/MainLayout';
import AdminLayout from '@/components/AdminLayout';
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
import { fetchKrossbookingReservations, KrossbookingReservation } from '@/lib/krossbooking';
import { getUserRooms, updateUserRoom, UserRoom } from '@/lib/user-room-api';

const defaultEndDate = format(addDays(new Date(), 14), 'yyyy-MM-dd');
const defaultStartDate = format(new Date(), 'yyyy-MM-dd');
const excludedStatuses = new Set(['CANC', 'PROP0']);

type LinenDraft = {
  linen_single_bed_qty: number;
  linen_double_bed_qty: number;
  linen_bath_towel_qty: number;
  linen_hand_towel_qty: number;
  linen_bath_mat_qty: number;
  linen_kitchen_towel_qty: number;
};

type LinenTotals = LinenDraft;

type ReservationWithLinen = {
  reservation: KrossbookingReservation;
  room: UserRoom | undefined;
  totals: LinenTotals;
  totalPieces: number;
  hasConfiguration: boolean;
};

interface LaundryOrdersPageProps {
  adminView?: boolean;
}

const emptyTotals = (): LinenTotals => ({
  linen_single_bed_qty: 0,
  linen_double_bed_qty: 0,
  linen_bath_towel_qty: 0,
  linen_hand_towel_qty: 0,
  linen_bath_mat_qty: 0,
  linen_kitchen_towel_qty: 0,
});

const getRoomLinenDraft = (room: UserRoom): LinenDraft => ({
  linen_single_bed_qty: room.linen_single_bed_qty ?? 0,
  linen_double_bed_qty: room.linen_double_bed_qty ?? 0,
  linen_bath_towel_qty: room.linen_bath_towel_qty ?? 0,
  linen_hand_towel_qty: room.linen_hand_towel_qty ?? 0,
  linen_bath_mat_qty: room.linen_bath_mat_qty ?? 0,
  linen_kitchen_towel_qty: room.linen_kitchen_towel_qty ?? 0,
});

const sumLinen = (totals: LinenTotals) => Object.values(totals).reduce((sum, value) => sum + value, 0);

const formatLinenDetails = (totals: LinenTotals) => {
  const items = [
    { label: 'Lits simples', value: totals.linen_single_bed_qty },
    { label: 'Lits doubles', value: totals.linen_double_bed_qty },
    { label: 'Serviettes bain', value: totals.linen_bath_towel_qty },
    { label: 'Serviettes mains', value: totals.linen_hand_towel_qty },
    { label: 'Tapis de bain', value: totals.linen_bath_mat_qty },
    { label: 'Torchons', value: totals.linen_kitchen_towel_qty },
  ].filter((item) => item.value > 0);

  return items.length > 0
    ? items.map((item) => `${item.label}: ${item.value}`).join(' • ')
    : 'Configuration linge non renseignée';
};

const LaundryOrdersPage: React.FC<LaundryOrdersPageProps> = ({ adminView = false }) => {
  const { profile } = useSession();
  const Layout = adminView ? AdminLayout : MainLayout;

  const [userRooms, setUserRooms] = useState<UserRoom[]>([]);
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
      const rooms = await getUserRooms();
      const bookingData = await fetchKrossbookingReservations(rooms, true);

      setUserRooms(rooms);
      setReservations(bookingData);
      setRoomDrafts(Object.fromEntries(rooms.map((room) => [room.id, getRoomLinenDraft(room)])));
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
      const totals = room ? getRoomLinenDraft(room) : emptyTotals();

      return {
        reservation,
        room,
        totals,
        totalPieces: sumLinen(totals),
        hasConfiguration: sumLinen(totals) > 0,
      };
    });
  }, [filteredReservations, roomByKrossbookingId]);

  const aggregatedTotals = useMemo(() => {
    return reservationsWithLinen.reduce<LinenTotals>((acc, item) => {
      acc.linen_single_bed_qty += item.totals.linen_single_bed_qty;
      acc.linen_double_bed_qty += item.totals.linen_double_bed_qty;
      acc.linen_bath_towel_qty += item.totals.linen_bath_towel_qty;
      acc.linen_hand_towel_qty += item.totals.linen_hand_towel_qty;
      acc.linen_bath_mat_qty += item.totals.linen_bath_mat_qty;
      acc.linen_kitchen_towel_qty += item.totals.linen_kitchen_towel_qty;
      return acc;
    }, emptyTotals());
  }, [reservationsWithLinen]);

  const roomsMissingConfiguration = useMemo(() => {
    const missingRooms = new Map<string, UserRoom>();

    reservationsWithLinen.forEach((item) => {
      if (item.room && !item.hasConfiguration) {
        missingRooms.set(item.room.id, item.room);
      }
    });

    return Array.from(missingRooms.values());
  }, [reservationsWithLinen]);

  const totalPiecesToOrder = sumLinen(aggregatedTotals);

  const orderPreview = useMemo(() => {
    const lines = [
      'Commande blanchisserie',
      `Prestataire : ${profile?.linen_type || 'Blanchisserie'}`,
      `Période : du ${format(parseISO(startDate), 'dd/MM/yyyy')} au ${format(parseISO(endDate), 'dd/MM/yyyy')}`,
      `Réservations prises en compte : ${reservationsWithLinen.length}`,
      '',
      'Quantités à prévoir :',
      `- Lits simples : ${aggregatedTotals.linen_single_bed_qty}`,
      `- Lits doubles : ${aggregatedTotals.linen_double_bed_qty}`,
      `- Serviettes bain : ${aggregatedTotals.linen_bath_towel_qty}`,
      `- Serviettes mains : ${aggregatedTotals.linen_hand_towel_qty}`,
      `- Tapis de bain : ${aggregatedTotals.linen_bath_mat_qty}`,
      `- Torchons : ${aggregatedTotals.linen_kitchen_towel_qty}`,
      '',
      'Détail par arrivée :',
    ];

    if (reservationsWithLinen.length === 0) {
      lines.push('- Aucune réservation sur cette période');
    } else {
      reservationsWithLinen.forEach((item) => {
        lines.push(
          `- ${format(parseISO(item.reservation.check_in_date), 'dd/MM/yyyy', { locale: fr })} • ${item.reservation.property_name} • ${item.reservation.guest_name} • ${formatLinenDetails(item.totals)}`,
        );
      });
    }

    return lines.join('\n');
  }, [aggregatedTotals, endDate, profile?.linen_type, reservationsWithLinen, startDate]);

  const handleDraftChange = (roomId: string, field: keyof LinenDraft, value: string) => {
    const parsedValue = Number.isNaN(Number(value)) ? 0 : Math.max(0, Number(value));

    setRoomDrafts((prev) => ({
      ...prev,
      [roomId]: {
        ...(prev[roomId] || emptyTotals()),
        [field]: parsedValue,
      },
    }));
  };

  const handleSaveRoom = async (room: UserRoom) => {
    const draft = roomDrafts[room.id] || emptyTotals();
    setSavingRoomId(room.id);

    try {
      const updatedRoom = await updateUserRoom(room.id, draft);
      setUserRooms((prev) => prev.map((item) => (item.id === room.id ? updatedRoom : item)));
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
              Calculez automatiquement le linge à commander à partir des réservations à venir.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">Prestataire : {profile?.linen_type || 'Blanchisserie'}</Badge>
            <Button variant="outline" onClick={loadData} disabled={loading}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Actualiser
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Filtrer la période de commande</CardTitle>
            <CardDescription>
              Les quantités sont calculées à partir des arrivées comprises dans la période sélectionnée.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="laundry-start-date">Début</Label>
              <Input
                id="laundry-start-date"
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="laundry-end-date">Fin</Label>
              <Input
                id="laundry-end-date"
                type="date"
                value={endDate}
                min={startDate}
                onChange={(event) => setEndDate(event.target.value)}
              />
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
                      {room.room_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="grid gap-4 md:grid-cols-4">
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-28 w-full" />
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
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
                <CardDescription>Total pièces</CardDescription>
                <CardTitle className="text-3xl">{totalPiecesToOrder}</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center gap-2 text-sm text-muted-foreground">
                <Package className="h-4 w-4" />
                Quantité globale à commander
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Lits à préparer</CardDescription>
                <CardTitle className="text-3xl">
                  {aggregatedTotals.linen_single_bed_qty + aggregatedTotals.linen_double_bed_qty}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex items-center gap-2 text-sm text-muted-foreground">
                <BedDouble className="h-4 w-4" />
                Simples + doubles
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Configurations manquantes</CardDescription>
                <CardTitle className="text-3xl">{roomsMissingConfiguration.length}</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center gap-2 text-sm text-muted-foreground">
                <AlertTriangle className="h-4 w-4" />
                Logements à compléter
              </CardContent>
            </Card>
          </div>
        )}

        {roomsMissingConfiguration.length > 0 && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Configurations linge incomplètes</AlertTitle>
            <AlertDescription>
              Complétez les quantités pour {roomsMissingConfiguration.map((room) => room.room_name).join(', ')} afin d’obtenir une commande exacte.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <Card>
            <CardHeader>
              <CardTitle>Détail des réservations prises en compte</CardTitle>
              <CardDescription>
                Une ligne de commande est calculée pour chaque arrivée active sur la période.
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
                        <TableHead>Logement</TableHead>
                        <TableHead>Voyageur</TableHead>
                        <TableHead>Quantités</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reservationsWithLinen.map((item) => (
                        <TableRow key={item.reservation.id}>
                          <TableCell>
                            {format(parseISO(item.reservation.check_in_date), 'dd/MM/yyyy', { locale: fr })}
                          </TableCell>
                          <TableCell>{item.reservation.property_name}</TableCell>
                          <TableCell>{item.reservation.guest_name}</TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <p className="text-sm">{formatLinenDetails(item.totals)}</p>
                              {!item.hasConfiguration && (
                                <Badge variant="outline">Configuration manquante</Badge>
                              )}
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
                  <p className="text-muted-foreground">Serviettes bain</p>
                  <p className="text-2xl font-semibold">{aggregatedTotals.linen_bath_towel_qty}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-muted-foreground">Torchons</p>
                  <p className="text-2xl font-semibold">{aggregatedTotals.linen_kitchen_towel_qty}</p>
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
            <CardTitle>Configuration linge par logement</CardTitle>
            <CardDescription>
              Renseignez les quantités à prévoir pour une réservation de chaque logement.
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
                  const draft = roomDrafts[room.id] || emptyTotals();
                  const configured = sumLinen(draft) > 0;

                  return (
                    <Card key={room.id} className="border-dashed">
                      <CardHeader className="pb-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <CardTitle className="text-lg">{room.room_name}</CardTitle>
                            <CardDescription>ID chambre : {room.room_id}</CardDescription>
                          </div>
                          <Badge variant={configured ? 'secondary' : 'outline'}>
                            {configured ? 'Configuré' : 'À compléter'}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Lits simples</Label>
                            <Input
                              type="number"
                              min={0}
                              value={draft.linen_single_bed_qty}
                              onChange={(event) => handleDraftChange(room.id, 'linen_single_bed_qty', event.target.value)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Lits doubles</Label>
                            <Input
                              type="number"
                              min={0}
                              value={draft.linen_double_bed_qty}
                              onChange={(event) => handleDraftChange(room.id, 'linen_double_bed_qty', event.target.value)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Serviettes bain</Label>
                            <Input
                              type="number"
                              min={0}
                              value={draft.linen_bath_towel_qty}
                              onChange={(event) => handleDraftChange(room.id, 'linen_bath_towel_qty', event.target.value)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Serviettes mains</Label>
                            <Input
                              type="number"
                              min={0}
                              value={draft.linen_hand_towel_qty}
                              onChange={(event) => handleDraftChange(room.id, 'linen_hand_towel_qty', event.target.value)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Tapis de bain</Label>
                            <Input
                              type="number"
                              min={0}
                              value={draft.linen_bath_mat_qty}
                              onChange={(event) => handleDraftChange(room.id, 'linen_bath_mat_qty', event.target.value)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Torchons</Label>
                            <Input
                              type="number"
                              min={0}
                              value={draft.linen_kitchen_towel_qty}
                              onChange={(event) => handleDraftChange(room.id, 'linen_kitchen_towel_qty', event.target.value)}
                            />
                          </div>
                        </div>
                        <div className="flex items-center justify-between gap-3 rounded-lg bg-muted/50 p-3 text-sm">
                          <div>
                            <p className="font-medium">Quantité totale par réservation</p>
                            <p className="text-muted-foreground">{sumLinen(draft)} pièce(s)</p>
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

        <Alert>
          <ShoppingCart className="h-4 w-4" />
          <AlertTitle>Comment ça fonctionne ?</AlertTitle>
          <AlertDescription>
            Chaque réservation active de la période reprend automatiquement la configuration de linge du logement concerné. Vous obtenez ainsi la quantité totale à commander pour votre blanchisserie.
          </AlertDescription>
        </Alert>
      </div>
    </Layout>
  );
};

export default LaundryOrdersPage;
