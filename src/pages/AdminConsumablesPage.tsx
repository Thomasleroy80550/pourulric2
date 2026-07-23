import React, { useMemo, useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertTriangle,
  CheckCheck,
  Save,
  Trash2,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import {
  getAllProfiles,
  getAllUserRooms,
  type UserProfile,
  type AdminUserRoom,
} from "@/lib/admin-api";
import {
  fetchKrossbookingReservationsForAdminRooms,
  type KrossbookingReservation,
} from "@/lib/krossbooking";
import {
  CONSUMABLE_UNIT_PRICE_HT,
  getConsumableBillingsByPeriod,
  upsertConsumableBilling,
  setConsumableBillingStatus,
  deleteConsumableBilling,
  type ConsumableBilling,
} from "@/lib/consumables-api";

const PERIOD_MONTHS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

const CURRENT_YEAR = new Date().getFullYear();
const PERIOD_YEARS = [CURRENT_YEAR + 1, CURRENT_YEAR, CURRENT_YEAR - 1, CURRENT_YEAR - 2];

/** Vérifie si une réservation (non annulée) chevauche le mois donné. */
function reservationOverlapsMonth(
  res: KrossbookingReservation,
  monthStart: Date,
  monthEndExclusive: Date,
): boolean {
  const status = (res.status || "").toUpperCase();
  if (status.includes("CANC")) return false;
  if (!res.check_in_date || !res.check_out_date) return false;

  const checkIn = new Date(`${res.check_in_date}T00:00:00`);
  const checkOut = new Date(`${res.check_out_date}T00:00:00`);
  if (isNaN(checkIn.getTime()) || isNaN(checkOut.getTime())) return false;

  // Occupation = nuits [check_in, check_out) → chevauche le mois si :
  return checkIn < monthEndExclusive && checkOut > monthStart;
}

const AdminConsumablesPage: React.FC = () => {
  const queryClient = useQueryClient();
  const now = new Date();
  const [periodMonth, setPeriodMonth] = useState<string>(PERIOD_MONTHS[now.getMonth()]);
  const [periodYear, setPeriodYear] = useState<string>(String(CURRENT_YEAR));
  const period = `${periodMonth} ${periodYear}`;

  const monthIndex = PERIOD_MONTHS.indexOf(periodMonth);
  const yearNum = parseInt(periodYear, 10);
  const monthStart = new Date(yearNum, monthIndex, 1);
  const monthEndExclusive = new Date(yearNum, monthIndex + 1, 1);

  // Valeurs éditées manuellement (surcharge de l'occupation auto) par utilisateur
  const [editedCounts, setEditedCounts] = useState<Record<string, number>>({});

  const { data: profiles, isLoading: loadingProfiles } = useQuery<UserProfile[]>({
    queryKey: ["adminAllProfiles"],
    queryFn: getAllProfiles,
  });

  const { data: rooms, isLoading: loadingRooms } = useQuery<AdminUserRoom[]>({
    queryKey: ["adminAllUserRooms"],
    queryFn: getAllUserRooms,
  });

  const {
    data: reservations,
    isLoading: loadingReservations,
    isFetching: fetchingReservations,
    refetch: refetchReservations,
  } = useQuery<KrossbookingReservation[]>({
    queryKey: ["adminAllReservations"],
    queryFn: () => fetchKrossbookingReservationsForAdminRooms(rooms || [], false),
    enabled: !!rooms && rooms.length > 0,
  });

  const {
    data: billings,
    isLoading: loadingBillings,
    error,
  } = useQuery<ConsumableBilling[]>({
    queryKey: ["consumableBillings", period],
    queryFn: () => getConsumableBillingsByPeriod(period),
  });

  // Logements par utilisateur
  const roomsByUser = useMemo(() => {
    const map = new Map<string, AdminUserRoom[]>();
    (rooms || []).forEach((room) => {
      const list = map.get(room.user_id) || [];
      list.push(room);
      map.set(room.user_id, list);
    });
    return map;
  }, [rooms]);

  // Ensemble des room_id occupés durant le mois sélectionné
  const occupiedRoomIds = useMemo(() => {
    const set = new Set<string>();
    (reservations || []).forEach((res) => {
      if (reservationOverlapsMonth(res, monthStart, monthEndExclusive)) {
        if (res.krossbooking_room_id) set.add(String(res.krossbooking_room_id));
      }
    });
    return set;
  }, [reservations, monthStart, monthEndExclusive]);

  // Nombre de logements occupés (auto) par utilisateur pour le mois
  const autoOccupiedByUser = useMemo(() => {
    const map = new Map<string, number>();
    roomsByUser.forEach((userRooms, userId) => {
      const count = userRooms.filter((r) => occupiedRoomIds.has(String(r.room_id))).length;
      map.set(userId, count);
    });
    return map;
  }, [roomsByUser, occupiedRoomIds]);

  const billingByUser = useMemo(() => {
    const map = new Map<string, ConsumableBilling>();
    (billings || []).forEach((b) => map.set(b.user_id, b));
    return map;
  }, [billings]);

  // Clients concernés : tous ceux qui ont au moins un logement et un contrat actif
  const clients = useMemo(() => {
    return (profiles || [])
      .filter((p) => !p.is_contract_terminated && (roomsByUser.get(p.id)?.length || 0) > 0)
      .sort((a, b) =>
        `${a.first_name} ${a.last_name}`.trim().toLowerCase() <
        `${b.first_name} ${b.last_name}`.trim().toLowerCase()
          ? -1
          : 1,
      );
  }, [profiles, roomsByUser]);

  const getOccupiedCount = (userId: string): number => {
    if (editedCounts[userId] !== undefined) return editedCounts[userId];
    return autoOccupiedByUser.get(userId) || 0;
  };

  const saveMutation = useMutation({
    mutationFn: (params: { userId: string; logementCount: number }) =>
      upsertConsumableBilling({
        userId: params.userId,
        period,
        logementCount: params.logementCount,
      }),
    onSuccess: (_, variables) => {
      setEditedCounts((prev) => {
        const next = { ...prev };
        delete next[variables.userId];
        return next;
      });
      queryClient.invalidateQueries({ queryKey: ["consumableBillings", period] });
    },
    onError: (err: any) => toast.error("Erreur", { description: err.message }),
  });

  const statusMutation = useMutation({
    mutationFn: (params: { id: string; status: "pending" | "billed" }) =>
      setConsumableBillingStatus(params.id, params.status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["consumableBillings", period] });
    },
    onError: (err: any) => toast.error("Erreur", { description: err.message }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteConsumableBilling(id),
    onSuccess: () => {
      toast.success("Ligne supprimée.");
      queryClient.invalidateQueries({ queryKey: ["consumableBillings", period] });
    },
    onError: (err: any) => toast.error("Erreur", { description: err.message }),
  });

  const [savingAll, setSavingAll] = useState(false);
  const handleSaveAll = async () => {
    setSavingAll(true);
    try {
      const toSave = clients.filter((p) => getOccupiedCount(p.id) > 0);
      for (const p of toSave) {
        await upsertConsumableBilling({
          userId: p.id,
          period,
          logementCount: getOccupiedCount(p.id),
        });
      }
      setEditedCounts({});
      toast.success(`${toSave.length} facturation(s) enregistrée(s) pour ${period}.`);
      queryClient.invalidateQueries({ queryKey: ["consumableBillings", period] });
    } catch (err: any) {
      toast.error("Erreur lors de l'enregistrement groupé", { description: err.message });
    } finally {
      setSavingAll(false);
    }
  };

  // Totaux calculés (live) sur l'ensemble des clients pour la période
  const grandTotalLive = clients.reduce(
    (sum, p) => sum + getOccupiedCount(p.id) * CONSUMABLE_UNIT_PRICE_HT,
    0,
  );
  const totalBilled = (billings || [])
    .filter((b) => b.status === "billed")
    .reduce((sum, b) => sum + Number(b.total_ht), 0);
  const totalOccupiedLogements = clients.reduce((sum, p) => sum + getOccupiedCount(p.id), 0);

  const isLoading = loadingProfiles || loadingRooms || loadingBillings;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Facturation Consommables</h1>
            <p className="text-muted-foreground mt-1 max-w-3xl">
              Facturation automatique de{" "}
              <strong>{CONSUMABLE_UNIT_PRICE_HT.toFixed(2)} € HT / logement / mois d'occupation</strong>.
              L'occupation est calculée à partir des réservations Krossbooking : un logement est facturé
              dès qu'il a au moins une nuit réservée dans le mois.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => refetchReservations()}
            disabled={fetchingReservations}
          >
            {fetchingReservations ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Rafraîchir l'occupation
          </Button>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Erreur</AlertTitle>
            <AlertDescription>{(error as any).message}</AlertDescription>
          </Alert>
        )}

        {/* Période + totaux */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-lg">Période</CardTitle>
              <CardDescription>Mois d'occupation à facturer.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Mois</Label>
                  <Select value={periodMonth} onValueChange={setPeriodMonth}>
                    <SelectTrigger><SelectValue placeholder="Mois" /></SelectTrigger>
                    <SelectContent>
                      {PERIOD_MONTHS.map((m) => (
                        <SelectItem key={m} value={m}>{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Année</Label>
                  <Select value={periodYear} onValueChange={setPeriodYear}>
                    <SelectTrigger><SelectValue placeholder="Année" /></SelectTrigger>
                    <SelectContent>
                      {PERIOD_YEARS.map((y) => (
                        <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg">Totaux — {period}</CardTitle>
              <CardDescription>Calcul automatique basé sur l'occupation.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-xs text-muted-foreground">Logements occupés</p>
                  <p className="text-2xl font-bold">{totalOccupiedLogements}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total HT (calculé)</p>
                  <p className="text-2xl font-bold text-blue-600">{grandTotalLive.toFixed(2)} €</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Déjà facturé</p>
                  <p className="text-2xl font-bold text-green-600">{totalBilled.toFixed(2)} €</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tableau par client */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">Total par client</CardTitle>
              <CardDescription>
                Total HT = logements occupés × {CONSUMABLE_UNIT_PRICE_HT.toFixed(2)} €
                {(loadingReservations || fetchingReservations) && " — calcul de l'occupation en cours…"}
              </CardDescription>
            </div>
            <Button onClick={handleSaveAll} disabled={savingAll || clients.length === 0}>
              {savingAll ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Enregistrer tout
            </Button>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead className="text-center">Logements</TableHead>
                    <TableHead className="text-center">Occupés (auto)</TableHead>
                    <TableHead className="text-right">Total HT</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    [...Array(5)].map((_, i) => (
                      <TableRow key={i}>
                        <TableCell colSpan={6}><Skeleton className="h-8 w-full" /></TableCell>
                      </TableRow>
                    ))
                  ) : clients.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        Aucun client avec logement actif.
                      </TableCell>
                    </TableRow>
                  ) : (
                    clients.map((p) => {
                      const totalRooms = roomsByUser.get(p.id)?.length || 0;
                      const occupied = getOccupiedCount(p.id);
                      const existing = billingByUser.get(p.id);
                      const total = occupied * CONSUMABLE_UNIT_PRICE_HT;
                      return (
                        <TableRow key={p.id}>
                          <TableCell className="font-medium">
                            {p.first_name} {p.last_name}
                          </TableCell>
                          <TableCell className="text-center">{totalRooms}</TableCell>
                          <TableCell className="text-center">
                            <Input
                              type="number"
                              min={0}
                              max={totalRooms}
                              className="w-20 mx-auto text-center"
                              value={occupied}
                              onChange={(e) =>
                                setEditedCounts((prev) => ({
                                  ...prev,
                                  [p.id]: Math.max(0, parseInt(e.target.value) || 0),
                                }))
                              }
                            />
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            {total.toFixed(2)} €
                          </TableCell>
                          <TableCell>
                            {existing ? (
                              <Badge variant={existing.status === "billed" ? "default" : "secondary"}>
                                {existing.status === "billed" ? "Facturé" : "Enregistré"}
                              </Badge>
                            ) : (
                              <Badge variant="outline">À facturer</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex justify-end gap-1">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  saveMutation.mutate({ userId: p.id, logementCount: occupied })
                                }
                                disabled={saveMutation.isPending}
                                title="Enregistrer cette ligne"
                              >
                                <Save className="h-4 w-4" />
                              </Button>
                              {existing && (
                                <Button
                                  size="sm"
                                  variant={existing.status === "billed" ? "default" : "outline"}
                                  onClick={() =>
                                    statusMutation.mutate({
                                      id: existing.id,
                                      status: existing.status === "billed" ? "pending" : "billed",
                                    })
                                  }
                                  disabled={statusMutation.isPending}
                                  title={existing.status === "billed" ? "Marquer non facturé" : "Marquer facturé"}
                                >
                                  <CheckCheck className="h-4 w-4" />
                                </Button>
                              )}
                              {existing && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-destructive"
                                  onClick={() => deleteMutation.mutate(existing.id)}
                                  disabled={deleteMutation.isPending}
                                  title="Supprimer la ligne"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
                {clients.length > 0 && (
                  <TableFooter>
                    <TableRow className="font-bold">
                      <TableCell>Total période</TableCell>
                      <TableCell />
                      <TableCell className="text-center">{totalOccupiedLogements}</TableCell>
                      <TableCell className="text-right">{grandTotalLive.toFixed(2)} €</TableCell>
                      <TableCell colSpan={2} />
                    </TableRow>
                  </TableFooter>
                )}
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminConsumablesPage;
