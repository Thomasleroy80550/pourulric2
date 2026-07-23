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
  fetchAllReservationsInRange,
  type RangeReservation,
} from "@/lib/krossbooking";
import {
  CONSUMABLE_UNIT_PRICE_HT,
  getConsumableBillingsByPeriod,
  upsertConsumableBilling,
  setConsumableBillingStatus,
  deleteConsumableBilling,
  type ConsumableBilling,
} from "@/lib/consumables-api";

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = [CURRENT_YEAR + 1, CURRENT_YEAR, CURRENT_YEAR - 1, CURRENT_YEAR - 2];

/** Une réservation (non annulée) occupe-t-elle le mois [monthStart, monthEndExclusive[ ? */
function overlapsMonth(
  res: RangeReservation,
  monthStart: Date,
  monthEndExclusive: Date,
): boolean {
  const status = (res.status || "").toUpperCase();
  if (status.includes("CANC")) return false;
  if (!res.check_in_date || !res.check_out_date) return false;

  const checkIn = new Date(`${res.check_in_date}T00:00:00`);
  const checkOut = new Date(`${res.check_out_date}T00:00:00`);
  if (isNaN(checkIn.getTime()) || isNaN(checkOut.getTime())) return false;

  // Nuits occupées = [check_in, check_out[
  return checkIn < monthEndExclusive && checkOut > monthStart;
}

const AdminConsumablesPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [year, setYear] = useState<string>(String(CURRENT_YEAR));
  const yearNum = parseInt(year, 10);
  const period = `Année ${year}`;

  // Surcharge manuelle du nombre de mois-logements occupés par client
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
  } = useQuery<RangeReservation[]>({
    queryKey: ["adminYearReservations", year],
    queryFn: () => fetchAllReservationsInRange(`${year}-01-01`, `${year}-12-31`),
  });

  const {
    data: billings,
    isLoading: loadingBillings,
    error,
  } = useQuery<ConsumableBilling[]>({
    queryKey: ["consumableBillings", period],
    queryFn: () => getConsumableBillingsByPeriod(period),
  });

  // Logements par utilisateur + correspondance room_id -> user_id
  const { roomsByUser, roomOwner } = useMemo(() => {
    const byUser = new Map<string, AdminUserRoom[]>();
    const owner = new Map<string, string>();
    (rooms || []).forEach((room) => {
      const list = byUser.get(room.user_id) || [];
      list.push(room);
      byUser.set(room.user_id, list);
      if (room.room_id) owner.set(String(room.room_id), room.user_id);
    });
    return { roomsByUser: byUser, roomOwner: owner };
  }, [rooms]);

  // Occupation annuelle : par utilisateur, ensemble des "logement|mois" occupés
  const occupiedByUser = useMemo(() => {
    const map = new Map<string, Set<string>>();
    if (!reservations) return map;

    // Pré-calcule les bornes de chaque mois de l'année
    const monthBounds = Array.from({ length: 12 }, (_, m) => ({
      start: new Date(yearNum, m, 1),
      endExclusive: new Date(yearNum, m + 1, 1),
    }));

    for (const res of reservations) {
      for (const roomId of res.room_ids) {
        const userId = roomOwner.get(roomId);
        if (!userId) continue; // logement non géré par un client de la plateforme
        for (let m = 0; m < 12; m++) {
          if (overlapsMonth(res, monthBounds[m].start, monthBounds[m].endExclusive)) {
            if (!map.has(userId)) map.set(userId, new Set());
            map.get(userId)!.add(`${roomId}|${m}`);
          }
        }
      }
    }
    return map;
  }, [reservations, roomOwner, yearNum]);

  const billingByUser = useMemo(() => {
    const map = new Map<string, ConsumableBilling>();
    (billings || []).forEach((b) => map.set(b.user_id, b));
    return map;
  }, [billings]);

  // Clients : tous ceux avec au moins un logement et un contrat actif
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

  const getAutoCount = (userId: string): number => occupiedByUser.get(userId)?.size || 0;
  const getCount = (userId: string): number =>
    editedCounts[userId] !== undefined ? editedCounts[userId] : getAutoCount(userId);

  const statusMutation = useMutation({
    mutationFn: (params: { id: string; status: "pending" | "billed" }) =>
      setConsumableBillingStatus(params.id, params.status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["consumableBillings", period] }),
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

  const saveMutation = useMutation({
    mutationFn: (params: { userId: string; count: number }) =>
      upsertConsumableBilling({
        userId: params.userId,
        period,
        logementCount: params.count,
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

  const [savingAll, setSavingAll] = useState(false);
  const handleGenerateAnnual = async () => {
    setSavingAll(true);
    try {
      const toSave = clients.filter((p) => getCount(p.id) > 0);
      for (const p of toSave) {
        await upsertConsumableBilling({
          userId: p.id,
          period,
          logementCount: getCount(p.id),
        });
      }
      setEditedCounts({});
      toast.success(`Facture annuelle générée pour ${toSave.length} client(s) — ${period}.`);
      queryClient.invalidateQueries({ queryKey: ["consumableBillings", period] });
    } catch (err: any) {
      toast.error("Erreur lors de la génération", { description: err.message });
    } finally {
      setSavingAll(false);
    }
  };

  const grandTotalLive = clients.reduce(
    (sum, p) => sum + getCount(p.id) * CONSUMABLE_UNIT_PRICE_HT,
    0,
  );
  const totalMonthsLogements = clients.reduce((sum, p) => sum + getCount(p.id), 0);
  const totalBilled = (billings || [])
    .filter((b) => b.status === "billed")
    .reduce((sum, b) => sum + Number(b.total_ht), 0);

  const isLoading = loadingProfiles || loadingRooms || loadingBillings;
  const computing = loadingReservations || fetchingReservations;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Facturation Consommables (annuelle)</h1>
            <p className="text-muted-foreground mt-1 max-w-3xl">
              Facture automatique de fin d'année :{" "}
              <strong>{CONSUMABLE_UNIT_PRICE_HT.toFixed(2)} € HT / logement / mois d'occupation</strong>.
              L'occupation de chaque logement est calculée mois par mois sur toute l'année à partir des
              réservations Krossbooking (un logement occupé au moins une nuit dans un mois = 1 mois facturé).
            </p>
          </div>
          <Button variant="outline" onClick={() => refetchReservations()} disabled={computing}>
            {computing ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Recalculer l'occupation
          </Button>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Erreur</AlertTitle>
            <AlertDescription>{(error as any).message}</AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-lg">Année à facturer</CardTitle>
              <CardDescription>Période de calcul de l'occupation.</CardDescription>
            </CardHeader>
            <CardContent>
              <Label className="text-xs">Année</Label>
              <Select value={year} onValueChange={setYear}>
                <SelectTrigger><SelectValue placeholder="Année" /></SelectTrigger>
                <SelectContent>
                  {YEARS.map((y) => (
                    <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg">Totaux — {period}</CardTitle>
              <CardDescription>Calcul automatique basé sur l'occupation annuelle.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-xs text-muted-foreground">Mois-logements occupés</p>
                  <p className="text-2xl font-bold">{totalMonthsLogements}</p>
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

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">Total par client — {period}</CardTitle>
              <CardDescription>
                Total HT = mois-logements occupés × {CONSUMABLE_UNIT_PRICE_HT.toFixed(2)} €
                {computing && " — calcul de l'occupation en cours…"}
              </CardDescription>
            </div>
            <Button onClick={handleGenerateAnnual} disabled={savingAll || clients.length === 0 || computing}>
              {savingAll ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Générer la facture annuelle
            </Button>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead className="text-center">Logements</TableHead>
                    <TableHead className="text-center">Mois occupés (auto)</TableHead>
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
                      const count = getCount(p.id);
                      const existing = billingByUser.get(p.id);
                      const total = count * CONSUMABLE_UNIT_PRICE_HT;
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
                              className="w-20 mx-auto text-center"
                              value={count}
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
                                {existing.status === "billed" ? "Facturé" : "Généré"}
                              </Badge>
                            ) : (
                              <Badge variant="outline">À générer</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex justify-end gap-1">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => saveMutation.mutate({ userId: p.id, count })}
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
                      <TableCell>Total {period}</TableCell>
                      <TableCell />
                      <TableCell className="text-center">{totalMonthsLogements}</TableCell>
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
