import React, { useMemo, useState } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { DatePicker } from '@/components/ui/date-picker';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  fetchAllReservationsDetailedInRange,
  DetailedRangeReservation,
} from '@/lib/krossbooking';
import { toast } from 'sonner';
import {
  format,
  differenceInCalendarDays,
  parseISO,
  isValid,
  startOfMonth,
  endOfMonth,
  subMonths,
  startOfYear,
} from 'date-fns';
import { fr } from 'date-fns/locale';
import { Euro, Users, Moon, CalendarCheck, Loader2, Search } from 'lucide-react';

const OWNER_STATUSES = new Set(['PROP0', 'PROPRI']);
const CANCELLED_STATUS = 'CANC';

const formatCurrency = (value: number) =>
  value.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });

const nightsOf = (res: DetailedRangeReservation): number => {
  const arrival = parseISO(res.check_in_date);
  const departure = parseISO(res.check_out_date);
  if (!isValid(arrival) || !isValid(departure)) return 0;
  return Math.max(0, differenceInCalendarDays(departure, arrival));
};

const AdminKrossStatsPage: React.FC = () => {
  const [dateFrom, setDateFrom] = useState<Date | undefined>(startOfMonth(new Date()));
  const [dateTo, setDateTo] = useState<Date | undefined>(endOfMonth(new Date()));
  const [includeOwner, setIncludeOwner] = useState(false);
  const [loading, setLoading] = useState(false);
  const [reservations, setReservations] = useState<DetailedRangeReservation[] | null>(null);
  const [appliedRange, setAppliedRange] = useState<{ from: string; to: string } | null>(null);

  const applyPreset = (from: Date, to: Date) => {
    setDateFrom(from);
    setDateTo(to);
  };

  const handleFetch = async () => {
    if (!dateFrom || !dateTo) {
      toast.error('Veuillez sélectionner une date de début et de fin.');
      return;
    }
    if (dateFrom > dateTo) {
      toast.error('La date de début doit être avant la date de fin.');
      return;
    }
    setLoading(true);
    try {
      const from = format(dateFrom, 'yyyy-MM-dd');
      const to = format(dateTo, 'yyyy-MM-dd');
      const data = await fetchAllReservationsDetailedInRange(from, to);
      setReservations(data);
      setAppliedRange({ from, to });
      toast.success(`${data.length} réservation(s) récupérée(s) depuis Krossbooking.`);
    } catch (err: any) {
      console.error('Erreur récupération stats Kross:', err);
      toast.error('Erreur lors de la récupération des réservations Krossbooking.');
    } finally {
      setLoading(false);
    }
  };

  // Réservations dont l'arrivée est réellement dans la plage sélectionnée
  // (l'API Krossbooking peut renvoyer des réservations hors plage).
  const inRange = useMemo(() => {
    if (!reservations || !appliedRange) return [];
    return reservations.filter(
      (r) => r.check_in_date >= appliedRange.from && r.check_in_date <= appliedRange.to,
    );
  }, [reservations, appliedRange]);

  const filtered = useMemo(() => {
    return inRange.filter((r) => {
      if (r.status === CANCELLED_STATUS) return false;
      if (!includeOwner && OWNER_STATUSES.has(r.status)) return false;
      return true;
    });
  }, [inRange, includeOwner]);

  const stats = useMemo(() => {
    let ca = 0;
    let nights = 0;
    let clients = 0;
    for (const r of filtered) {
      ca += r.amount;
      nights += nightsOf(r);
      clients += r.guests;
    }
    return { ca, nights, clients, count: filtered.length };
  }, [filtered]);

  const cancelledCount = useMemo(
    () => inRange.filter((r) => r.status === CANCELLED_STATUS).length,
    [inRange],
  );
  const ownerCount = useMemo(
    () => inRange.filter((r) => OWNER_STATUSES.has(r.status)).length,
    [inRange],
  );
  const outOfRangeCount = (reservations?.length ?? 0) - inRange.length;

  const now = new Date();

  return (
    <AdminLayout>
      <div className="container mx-auto py-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Stats Kross par période</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Sélectionnez une plage de dates : Krossbooking renvoie le CA réalisé, le nombre de
            clients, de nuits et de réservations.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Plage de dates</CardTitle>
            <CardDescription>
              Les réservations dont l'arrivée est comprise dans la plage sont prises en compte.
              Les réservations annulées sont exclues.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => applyPreset(startOfMonth(now), endOfMonth(now))}
              >
                Mois en cours
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  applyPreset(startOfMonth(subMonths(now, 1)), endOfMonth(subMonths(now, 1)))
                }
              >
                Mois dernier
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => applyPreset(startOfYear(now), now)}
              >
                Année en cours
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  applyPreset(new Date(now.getFullYear() - 1, 0, 1), new Date(now.getFullYear() - 1, 11, 31))
                }
              >
                Année dernière
              </Button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-2">
                <Label>Date de début</Label>
                <DatePicker value={dateFrom} onChange={setDateFrom} disabled={loading} />
              </div>
              <div className="space-y-2">
                <Label>Date de fin</Label>
                <DatePicker value={dateTo} onChange={setDateTo} disabled={loading} />
              </div>
              <div className="flex items-end">
                <Button onClick={handleFetch} disabled={loading} className="w-full sm:w-auto">
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Récupération...
                    </>
                  ) : (
                    <>
                      <Search className="mr-2 h-4 w-4" />
                      Calculer les stats
                    </>
                  )}
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                id="include-owner"
                checked={includeOwner}
                onCheckedChange={setIncludeOwner}
              />
              <Label htmlFor="include-owner" className="cursor-pointer">
                Inclure les réservations propriétaire (PROP0 / PROPRI)
              </Label>
            </div>
          </CardContent>
        </Card>

        {reservations !== null && (
          <>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">CA réalisé</CardTitle>
                  <Euro className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(stats.ca)}</div>
                  <p className="text-xs text-muted-foreground">Total des réservations</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Réservations</CardTitle>
                  <CalendarCheck className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.count}</div>
                  <p className="text-xs text-muted-foreground">
                    {cancelledCount} annulée(s) exclue(s)
                    {!includeOwner && ownerCount > 0 ? ` · ${ownerCount} proprio exclue(s)` : ''}
                    {outOfRangeCount > 0 ? ` · ${outOfRangeCount} hors plage exclue(s)` : ''}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Clients (voyageurs)</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.clients}</div>
                  <p className="text-xs text-muted-foreground">Total voyageurs sur la période</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Nuits</CardTitle>
                  <Moon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.nights}</div>
                  <p className="text-xs text-muted-foreground">Total des nuitées réservées</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Détail des réservations ({filtered.length})</CardTitle>
                <CardDescription>
                  Période du {dateFrom ? format(dateFrom, 'PPP', { locale: fr }) : '—'} au{' '}
                  {dateTo ? format(dateTo, 'PPP', { locale: fr }) : '—'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {filtered.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Aucune réservation sur cette période.
                  </p>
                ) : (
                  <div className="max-h-[500px] overflow-auto rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Client</TableHead>
                          <TableHead>Arrivée</TableHead>
                          <TableHead>Départ</TableHead>
                          <TableHead className="text-right">Nuits</TableHead>
                          <TableHead className="text-right">Voyageurs</TableHead>
                          <TableHead>Canal</TableHead>
                          <TableHead>Statut</TableHead>
                          <TableHead className="text-right">Montant</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filtered
                          .slice()
                          .sort((a, b) => a.check_in_date.localeCompare(b.check_in_date))
                          .map((r) => (
                            <TableRow key={r.id}>
                              <TableCell className="font-medium">{r.guest_name}</TableCell>
                              <TableCell>{r.check_in_date}</TableCell>
                              <TableCell>{r.check_out_date}</TableCell>
                              <TableCell className="text-right">{nightsOf(r)}</TableCell>
                              <TableCell className="text-right">{r.guests || '—'}</TableCell>
                              <TableCell>
                                <Badge variant="outline">{r.cod_channel}</Badge>
                              </TableCell>
                              <TableCell>
                                <Badge variant="secondary">{r.status}</Badge>
                              </TableCell>
                              <TableCell className="text-right font-medium">
                                {formatCurrency(r.amount)}
                              </TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminKrossStatsPage;
