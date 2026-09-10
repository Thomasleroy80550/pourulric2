import React, { useMemo, useState } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { useQuery } from '@tanstack/react-query';
import { getSavedInvoices, getAllUserRooms, getAllProfiles, SavedInvoice, AdminUserRoom } from '@/lib/admin-api';
import {
  deleteMonthlyFeaturedRoom,
  formatMonthLabel,
  getMonthlyFeaturedRooms,
  upsertMonthlyFeaturedRoom,
} from '@/lib/user-room-api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Trophy, Star, Medal, Terminal, Moon, ReceiptText, Banknote, PiggyBank, Building2 } from 'lucide-react';
import { toast } from 'sonner';

const fmt = (n: number) =>
  n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';

const MONTHS_FR: Record<string, number> = {
  janvier: 0, février: 1, fevrier: 1, mars: 2, avril: 3, mai: 4, juin: 5,
  juillet: 6, août: 7, aout: 7, septembre: 8, octobre: 9, novembre: 10, décembre: 11, decembre: 11,
};

const periodToMonthKey = (period: string): string | null => {
  const parts = (period || '').trim().toLowerCase().split(/\s+/);
  if (parts.length < 2) return null;
  const monthIndex = MONTHS_FR[parts[0]];
  const year = parseInt(parts[parts.length - 1], 10);
  if (monthIndex === undefined || isNaN(year)) return null;
  return `${year}-${String(monthIndex + 1).padStart(2, '0')}`;
};

type MetricKey = 'montantVerse' | 'ca' | 'netProprio' | 'nuits' | 'reservations' | 'commission';

const METRICS: { key: MetricKey; label: string; isMoney: boolean }[] = [
  { key: 'montantVerse', label: 'Montant versé', isMoney: true },
  { key: 'ca', label: 'CA (payé par les voyageurs)', isMoney: true },
  { key: 'netProprio', label: 'Net propriétaire', isMoney: true },
  { key: 'commission', label: 'Commission conciergerie', isMoney: true },
  { key: 'nuits', label: 'Nuits louées', isMoney: false },
  { key: 'reservations', label: 'Réservations', isMoney: false },
];

interface LeaderboardRow {
  userId: string;
  clientName: string;
  agency: string;
  rooms: AdminUserRoom[];
  statementCount: number;
  montantVerse: number;
  ca: number;
  netProprio: number;
  commission: number;
  nuits: number;
  reservations: number;
}

const aggregateStatement = (statement: SavedInvoice) => {
  const totals: any = statement.totals || {};
  const lines: any[] = Array.isArray(statement.invoice_data) ? statement.invoice_data : [];
  const sumOf = (key: string) => lines.reduce((acc, r) => acc + (Number(r?.[key]) || 0), 0);

  const montantVerse = Number(totals.totalMontantVerse) || sumOf('montantVerse');
  const taxeDeSejour = Number(totals.totalTaxeDeSejour) || 0;
  const fraisMenage = (Number(totals.totalFraisMenage) || 0) + (Number(totals.ownerCleaningFee) || 0);
  const commission = Number(totals.totalCommission) || 0;
  const ca = sumOf('ca') || sumOf('originalTotalPaye') || montantVerse;
  const nuits = Number(totals.totalNuits) || sumOf('nuits');
  const reservations = lines.filter((r) => r && (r.voyageur || r.arrivee)).length;

  return {
    montantVerse,
    ca,
    commission,
    nuits,
    reservations,
    netProprio: montantVerse - taxeDeSejour - fraisMenage - commission,
  };
};

const rankStyles = [
  'bg-amber-400 text-white',
  'bg-slate-400 text-white',
  'bg-orange-600 text-white',
];

const AdminLeaderboardPage: React.FC = () => {
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [metric, setMetric] = useState<MetricKey>('montantVerse');
  const [selectedAgency, setSelectedAgency] = useState<string>('Toutes');
  const [roomPickerRow, setRoomPickerRow] = useState<LeaderboardRow | null>(null);

  const { data: statements, isLoading: loadingStatements, error: statementsError } = useQuery({
    queryKey: ['adminLeaderboardStatements'],
    queryFn: getSavedInvoices,
  });

  const { data: userRooms } = useQuery({
    queryKey: ['adminUserRooms'],
    queryFn: getAllUserRooms,
  });

  const { data: profiles } = useQuery({
    queryKey: ['adminAllProfiles'],
    queryFn: getAllProfiles,
    staleTime: 5 * 60 * 1000,
  });

  const agencyByUser = useMemo(() => {
    const map = new Map<string, string>();
    (profiles || []).forEach((p) => {
      map.set(p.id, (p.agency ?? '').trim());
    });
    return map;
  }, [profiles]);

  const availableAgencies = useMemo(
    () => [...new Set([...agencyByUser.values()].filter((a) => a !== ''))].sort(),
    [agencyByUser]
  );

  // Périodes disponibles (basées sur la période des relevés)
  const availableMonths = useMemo(() => {
    return [...new Set(
      (statements || []).map((s) => periodToMonthKey(s.period)).filter((k): k is string => k !== null)
    )].sort().reverse();
  }, [statements]);

  const effectiveMonth = selectedMonth || availableMonths[0] || '';

  const { data: featuredRooms = [], refetch: refetchFeatured } = useQuery({
    queryKey: ['monthlyFeaturedRooms', effectiveMonth],
    queryFn: () => getMonthlyFeaturedRooms(effectiveMonth),
    enabled: !!effectiveMonth,
  });

  const featuredRoomIds = useMemo(
    () => new Set(featuredRooms.map((f) => f.user_room_id)),
    [featuredRooms]
  );

  const roomsByUser = useMemo(() => {
    const map = new Map<string, AdminUserRoom[]>();
    (userRooms || []).forEach((room) => {
      const list = map.get(room.user_id) || [];
      list.push(room);
      map.set(room.user_id, list);
    });
    return map;
  }, [userRooms]);

  const allRows: LeaderboardRow[] = useMemo(() => {
    if (!statements || !effectiveMonth) return [];
    const byUser = new Map<string, LeaderboardRow>();

    statements
      .filter((s) => periodToMonthKey(s.period) === effectiveMonth)
      .forEach((s) => {
        const agg = aggregateStatement(s);
        const existing = byUser.get(s.user_id);
        if (existing) {
          existing.statementCount += 1;
          existing.montantVerse += agg.montantVerse;
          existing.ca += agg.ca;
          existing.netProprio += agg.netProprio;
          existing.commission += agg.commission;
          existing.nuits += agg.nuits;
          existing.reservations += agg.reservations;
        } else {
          byUser.set(s.user_id, {
            userId: s.user_id,
            clientName: s.profiles
              ? `${s.profiles.first_name} ${s.profiles.last_name}`
              : 'Client supprimé',
            agency: agencyByUser.get(s.user_id) || '',
            rooms: roomsByUser.get(s.user_id) || [],
            statementCount: 1,
            ...agg,
          });
        }
      });

    return [...byUser.values()].sort((a, b) => b[metric] - a[metric]);
  }, [statements, effectiveMonth, metric, roomsByUser, agencyByUser]);

  const rows: LeaderboardRow[] = useMemo(() => {
    if (selectedAgency === 'Toutes') return allRows;
    if (selectedAgency === 'Sans agence') return allRows.filter((r) => r.agency === '');
    return allRows.filter((r) => r.agency === selectedAgency);
  }, [allRows, selectedAgency]);

  // Comparatif agence / agence sur la période
  const agencyComparison = useMemo(() => {
    const byAgency = new Map<string, { clients: number; montantVerse: number; ca: number; commission: number; netProprio: number; nuits: number; reservations: number }>();
    allRows.forEach((r) => {
      const key = r.agency || 'Sans agence';
      const entry = byAgency.get(key) || { clients: 0, montantVerse: 0, ca: 0, commission: 0, netProprio: 0, nuits: 0, reservations: 0 };
      entry.clients += 1;
      entry.montantVerse += r.montantVerse;
      entry.ca += r.ca;
      entry.commission += r.commission;
      entry.netProprio += r.netProprio;
      entry.nuits += r.nuits;
      entry.reservations += r.reservations;
      byAgency.set(key, entry);
    });
    return [...byAgency.entries()]
      .map(([agency, stats]) => ({ agency, ...stats }))
      .sort((a, b) => b[metric] - a[metric]);
  }, [allRows, metric]);

  const metricInfo = METRICS.find((m) => m.key === metric)!;
  const formatMetric = (value: number) =>
    metricInfo.isMoney ? fmt(value) : String(Math.round(value));

  const monthLabel = effectiveMonth ? formatMonthLabel(effectiveMonth) : '';
  const monthLabelCap = monthLabel ? monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1) : '';

  const isRowFeatured = (row: LeaderboardRow) =>
    row.rooms.some((room) => featuredRoomIds.has(room.id));

  const handleFeatureRoom = async (room: AdminUserRoom) => {
    try {
      await upsertMonthlyFeaturedRoom({ userRoomId: room.id, featuredMonth: effectiveMonth });
      toast.success(`${room.room_name} mis en avant comme meilleur logement de ${monthLabel}.`);
      setRoomPickerRow(null);
      await refetchFeatured();
    } catch (err: any) {
      toast.error(err.message || 'Impossible de mettre le logement en avant.');
    }
  };

  const handleUnfeatureRow = async (row: LeaderboardRow) => {
    try {
      const featured = row.rooms.filter((room) => featuredRoomIds.has(room.id));
      for (const room of featured) {
        await deleteMonthlyFeaturedRoom(room.id, effectiveMonth);
      }
      toast.success(`Mise en avant retirée pour ${row.clientName}.`);
      await refetchFeatured();
    } catch (err: any) {
      toast.error(err.message || 'Impossible de retirer la mise en avant.');
    }
  };

  const handleFeatureClick = (row: LeaderboardRow) => {
    if (isRowFeatured(row)) {
      void handleUnfeatureRow(row);
      return;
    }
    if (row.rooms.length === 0) {
      toast.error('Aucun logement enregistré pour ce client.');
      return;
    }
    if (row.rooms.length === 1) {
      void handleFeatureRoom(row.rooms[0]);
    } else {
      setRoomPickerRow(row);
    }
  };

  const podium = rows.slice(0, 3);

  const totals = rows.reduce(
    (acc, r) => ({
      montantVerse: acc.montantVerse + r.montantVerse,
      nuits: acc.nuits + r.nuits,
      reservations: acc.reservations + r.reservations,
      netProprio: acc.netProprio + r.netProprio,
    }),
    { montantVerse: 0, nuits: 0, reservations: 0, netProprio: 0 }
  );

  return (
    <AdminLayout>
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Trophy className="h-8 w-8 text-amber-500" />
            <div>
              <h1 className="text-3xl font-bold">Leaderboard des logements</h1>
              <p className="text-sm text-muted-foreground">
                Classement basé sur les relevés de la période sélectionnée. Idéal pour choisir le meilleur logement du mois.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Select value={effectiveMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Période" />
              </SelectTrigger>
              <SelectContent>
                {availableMonths.map((month) => {
                  const label = formatMonthLabel(month);
                  return (
                    <SelectItem key={month} value={month}>
                      {label.charAt(0).toUpperCase() + label.slice(1)}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            <Select value={metric} onValueChange={(v) => setMetric(v as MetricKey)}>
              <SelectTrigger className="w-[240px]">
                <SelectValue placeholder="Critère de classement" />
              </SelectTrigger>
              <SelectContent>
                {METRICS.map((m) => (
                  <SelectItem key={m.key} value={m.key}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedAgency} onValueChange={setSelectedAgency}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Agence" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Toutes">Toutes les agences</SelectItem>
                {availableAgencies.map((agency) => (
                  <SelectItem key={agency} value={agency}>
                    {agency}
                  </SelectItem>
                ))}
                <SelectItem value="Sans agence">Sans agence</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {loadingStatements ? (
          <div className="space-y-2">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : statementsError ? (
          <Alert variant="destructive">
            <Terminal className="h-4 w-4" />
            <AlertTitle>Erreur</AlertTitle>
            <AlertDescription>{(statementsError as Error).message}</AlertDescription>
          </Alert>
        ) : rows.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              Aucun relevé trouvé pour cette période.
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Tuiles de synthèse */}
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {[
                { label: 'Montant versé total', value: fmt(totals.montantVerse), icon: Banknote },
                { label: 'Net propriétaires', value: fmt(totals.netProprio), icon: PiggyBank },
                { label: 'Nuits louées', value: String(Math.round(totals.nuits)), icon: Moon },
                { label: 'Réservations', value: String(totals.reservations), icon: ReceiptText },
              ].map((tile) => (
                <Card key={tile.label}>
                  <CardContent className="flex items-center gap-3 py-4">
                    <div className="rounded-md bg-muted p-2 text-muted-foreground">
                      <tile.icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-lg font-bold">{tile.value}</p>
                      <p className="truncate text-xs text-muted-foreground">{tile.label}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Comparatif agence / agence */}
            {agencyComparison.length > 1 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Building2 className="h-5 w-5 text-primary" /> Agence / Agence — {monthLabelCap}
                  </CardTitle>
                  <CardDescription>
                    Comparatif des agences sur la période (tous clients confondus, indépendamment du filtre agence).
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                    {agencyComparison.map((a, i) => (
                      <div
                        key={a.agency}
                        className={`rounded-xl border p-4 ${i === 0 ? 'border-2 border-amber-400 bg-amber-50/50' : ''}`}
                      >
                        <div className="flex items-center justify-between">
                          <p className="font-bold">{a.agency}</p>
                          {i === 0 && (
                            <Badge className="bg-amber-500 text-white hover:bg-amber-500">
                              <Trophy className="mr-1 h-3 w-3" /> 1ère
                            </Badge>
                          )}
                        </div>
                        <p className="mt-1 text-2xl font-bold tabular-nums">{formatMetric(a[metric])}</p>
                        <p className="text-xs text-muted-foreground">{metricInfo.label}</p>
                        <div className="mt-3 space-y-1 text-sm">
                          <div className="flex justify-between"><span className="text-muted-foreground">Clients avec relevé</span><span className="tabular-nums font-medium">{a.clients}</span></div>
                          <div className="flex justify-between"><span className="text-muted-foreground">Montant versé</span><span className="tabular-nums font-medium">{fmt(a.montantVerse)}</span></div>
                          <div className="flex justify-between"><span className="text-muted-foreground">Commission</span><span className="tabular-nums font-medium">{fmt(a.commission)}</span></div>
                          <div className="flex justify-between"><span className="text-muted-foreground">Net propriétaires</span><span className="tabular-nums font-medium">{fmt(a.netProprio)}</span></div>
                          <div className="flex justify-between"><span className="text-muted-foreground">Nuits / Résa</span><span className="tabular-nums font-medium">{Math.round(a.nuits)} / {a.reservations}</span></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Podium */}
            <div className="grid gap-3 md:grid-cols-3">
              {podium.map((row, i) => (
                <Card
                  key={row.userId}
                  className={i === 0 ? 'border-2 border-amber-400 shadow-md' : ''}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <span
                        className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${rankStyles[i]}`}
                      >
                        {i + 1}
                      </span>
                      <Medal className={`h-5 w-5 ${i === 0 ? 'text-amber-500' : i === 1 ? 'text-slate-400' : 'text-orange-600'}`} />
                    </div>
                    <CardTitle className="text-base">{row.clientName}</CardTitle>
                    <CardDescription className="truncate">
                      {row.rooms.map((r) => r.room_name).join(', ') || 'Logement non renseigné'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <p className="text-2xl font-bold tabular-nums">{formatMetric(row[metric])}</p>
                    <p className="text-xs text-muted-foreground">
                      {metricInfo.label} • {row.reservations} réservation(s) • {Math.round(row.nuits)} nuit(s)
                    </p>
                    <Button
                      size="sm"
                      variant={isRowFeatured(row) ? 'secondary' : 'default'}
                      onClick={() => handleFeatureClick(row)}
                    >
                      <Star className="mr-1 h-4 w-4" />
                      {isRowFeatured(row) ? 'Retirer la mise en avant' : 'Meilleur logement du mois'}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Classement complet */}
            <Card className="shadow-md">
              <CardHeader>
                <CardTitle>Classement complet — {monthLabelCap}</CardTitle>
                <CardDescription>
                  {rows.length} client(s) avec relevé sur la période, classés par {metricInfo.label.toLowerCase()}.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-14">Rang</TableHead>
                        <TableHead>Client</TableHead>
                        <TableHead>Agence</TableHead>
                        <TableHead>Logement(s)</TableHead>
                        <TableHead className="text-right">Montant versé</TableHead>
                        <TableHead className="text-right">CA voyageurs</TableHead>
                        <TableHead className="text-right">Commission</TableHead>
                        <TableHead className="text-right">Net proprio</TableHead>
                        <TableHead className="text-right">Nuits</TableHead>
                        <TableHead className="text-right">Résa</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.map((row, i) => (
                        <TableRow key={row.userId} className={i < 3 ? 'bg-amber-50/50' : undefined}>
                          <TableCell>
                            <span
                              className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                                i < 3 ? rankStyles[i] : 'bg-muted text-muted-foreground'
                              }`}
                            >
                              {i + 1}
                            </span>
                          </TableCell>
                          <TableCell className="font-medium whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              {row.clientName}
                              {isRowFeatured(row) && (
                                <Badge className="bg-amber-500 text-white hover:bg-amber-500">
                                  <Star className="mr-1 h-3 w-3" /> Top du mois
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="whitespace-nowrap">{row.agency || 'Sans agence'}</TableCell>
                          <TableCell>
                            <span
                              className="block max-w-[220px] truncate"
                              title={row.rooms.map((r) => r.room_name).join(', ')}
                            >
                              {row.rooms.map((r) => r.room_name).join(', ') || '—'}
                            </span>
                          </TableCell>
                          <TableCell className="text-right tabular-nums">{fmt(row.montantVerse)}</TableCell>
                          <TableCell className="text-right tabular-nums">{fmt(row.ca)}</TableCell>
                          <TableCell className="text-right tabular-nums">{fmt(row.commission)}</TableCell>
                          <TableCell className="text-right font-semibold tabular-nums">{fmt(row.netProprio)}</TableCell>
                          <TableCell className="text-right tabular-nums">{Math.round(row.nuits)}</TableCell>
                          <TableCell className="text-right tabular-nums">{row.reservations}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant={isRowFeatured(row) ? 'secondary' : 'outline'}
                              size="icon"
                              title={isRowFeatured(row) ? 'Retirer la mise en avant' : 'Mettre en avant ce logement pour le mois'}
                              onClick={() => handleFeatureClick(row)}
                            >
                              <Star className={`h-4 w-4 ${isRowFeatured(row) ? 'fill-amber-500 text-amber-500' : ''}`} />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Choix du logement quand le client en a plusieurs */}
      <Dialog open={!!roomPickerRow} onOpenChange={(open) => { if (!open) setRoomPickerRow(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 text-amber-500" /> Choisir le logement à mettre en avant
            </DialogTitle>
            <DialogDescription>
              {roomPickerRow?.clientName} possède plusieurs logements. Sélectionnez celui à mettre en avant pour {monthLabel}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {roomPickerRow?.rooms.map((room) => (
              <Button
                key={room.id}
                variant="outline"
                className="w-full justify-start"
                onClick={() => void handleFeatureRoom(room)}
              >
                <Star className="mr-2 h-4 w-4 text-amber-500" />
                {room.room_name}
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default AdminLeaderboardPage;
