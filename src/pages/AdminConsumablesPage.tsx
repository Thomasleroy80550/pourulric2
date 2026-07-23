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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import {
  AlertTriangle,
  ChevronDown,
  CheckCheck,
  Save,
  Trash2,
  Plus,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { getAllProfiles, getAllUserRooms, type UserProfile } from "@/lib/admin-api";
import {
  CONSUMABLE_UNIT_PRICE_HT,
  getConsumableBillingsByPeriod,
  upsertConsumableBilling,
  setConsumableBillingStatus,
  deleteConsumableBilling,
  setConsumablesEnabled,
  type ConsumableBilling,
} from "@/lib/consumables-api";

const PERIOD_MONTHS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

const CURRENT_YEAR = new Date().getFullYear();
const PERIOD_YEARS = [CURRENT_YEAR + 1, CURRENT_YEAR, CURRENT_YEAR - 1, CURRENT_YEAR - 2];

const AdminConsumablesPage: React.FC = () => {
  const queryClient = useQueryClient();
  const now = new Date();
  const [periodMonth, setPeriodMonth] = useState<string>(PERIOD_MONTHS[now.getMonth()]);
  const [periodYear, setPeriodYear] = useState<string>(String(CURRENT_YEAR));
  const period = `${periodMonth} ${periodYear}`;

  // Valeurs éditées localement (logements occupés) par utilisateur
  const [editedCounts, setEditedCounts] = useState<Record<string, number>>({});
  const [clientPickerOpen, setClientPickerOpen] = useState(false);

  const { data: profiles, isLoading: loadingProfiles } = useQuery<UserProfile[]>({
    queryKey: ["adminAllProfiles"],
    queryFn: getAllProfiles,
  });

  const { data: rooms, isLoading: loadingRooms } = useQuery({
    queryKey: ["adminAllUserRooms"],
    queryFn: getAllUserRooms,
  });

  const {
    data: billings,
    isLoading: loadingBillings,
    error,
  } = useQuery<ConsumableBilling[]>({
    queryKey: ["consumableBillings", period],
    queryFn: () => getConsumableBillingsByPeriod(period),
  });

  const roomsByUser = useMemo(() => {
    const map = new Map<string, number>();
    (rooms || []).forEach((room) => {
      map.set(room.user_id, (map.get(room.user_id) || 0) + 1);
    });
    return map;
  }, [rooms]);

  const billingByUser = useMemo(() => {
    const map = new Map<string, ConsumableBilling>();
    (billings || []).forEach((b) => map.set(b.user_id, b));
    return map;
  }, [billings]);

  const enabledClients = useMemo(() => {
    return (profiles || [])
      .filter((p) => p.consumables_enabled && !p.is_contract_terminated)
      .sort((a, b) =>
        `${a.first_name} ${a.last_name}`.trim() < `${b.first_name} ${b.last_name}`.trim() ? -1 : 1,
      );
  }, [profiles]);

  const nonEnabledClients = useMemo(() => {
    return (profiles || [])
      .filter((p) => !p.consumables_enabled && !p.is_contract_terminated)
      .sort((a, b) =>
        `${a.first_name} ${a.last_name}`.trim() < `${b.first_name} ${b.last_name}`.trim() ? -1 : 1,
      );
  }, [profiles]);

  const getOccupiedCount = (userId: string): number => {
    if (editedCounts[userId] !== undefined) return editedCounts[userId];
    const existing = billingByUser.get(userId);
    if (existing) return existing.logement_count;
    return roomsByUser.get(userId) || 0;
  };

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["consumableBillings", period] });
    queryClient.invalidateQueries({ queryKey: ["adminAllProfiles"] });
  };

  const saveMutation = useMutation({
    mutationFn: (params: { userId: string; logementCount: number }) =>
      upsertConsumableBilling({
        userId: params.userId,
        period,
        logementCount: params.logementCount,
      }),
    onSuccess: (_, variables) => {
      toast.success("Facturation enregistrée pour la période.");
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

  const enableMutation = useMutation({
    mutationFn: (params: { userId: string; enabled: boolean }) =>
      setConsumablesEnabled(params.userId, params.enabled),
    onSuccess: (_, variables) => {
      toast.success(
        variables.enabled ? "Module activé pour le client." : "Module désactivé pour le client.",
      );
      invalidateAll();
    },
    onError: (err: any) => toast.error("Erreur", { description: err.message }),
  });

  const totalPending = (billings || [])
    .filter((b) => b.status === "pending")
    .reduce((sum, b) => sum + Number(b.total_ht), 0);
  const totalBilled = (billings || [])
    .filter((b) => b.status === "billed")
    .reduce((sum, b) => sum + Number(b.total_ht), 0);
  const totalAll = totalPending + totalBilled;

  const isLoading = loadingProfiles || loadingRooms || loadingBillings;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Facturation Consommables</h1>
          <p className="text-muted-foreground mt-1">
            Facturation de <strong>{CONSUMABLE_UNIT_PRICE_HT.toFixed(2)} € HT / logement / mois d'occupation</strong>.
            Sélectionnez une période, ajustez le nombre de logements occupés puis enregistrez la facturation par client.
          </p>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Erreur</AlertTitle>
            <AlertDescription>{(error as any).message}</AlertDescription>
          </Alert>
        )}

        {/* Sélection période + totaux */}
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
              <CardDescription>Montants HT sur la période sélectionnée.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-xs text-muted-foreground">À facturer</p>
                  <p className="text-2xl font-bold text-amber-600">{totalPending.toFixed(2)} €</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Facturé</p>
                  <p className="text-2xl font-bold text-green-600">{totalBilled.toFixed(2)} €</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total HT</p>
                  <p className="text-2xl font-bold">{totalAll.toFixed(2)} €</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Activer un client */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Activer le module pour un client</CardTitle>
            <CardDescription>
              Seuls les clients avec le module activé apparaissent dans la facturation.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Popover open={clientPickerOpen} onOpenChange={setClientPickerOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" className="w-full sm:w-96 justify-between">
                  <span className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Choisir un client à activer…
                  </span>
                  <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                <Command>
                  <CommandInput placeholder="Rechercher un client..." />
                  <CommandList>
                    <CommandEmpty>Aucun client trouvé.</CommandEmpty>
                    <CommandGroup>
                      {nonEnabledClients.map((p) => (
                        <CommandItem
                          key={p.id}
                          value={`${p.first_name} ${p.last_name}`}
                          onSelect={() => {
                            enableMutation.mutate({ userId: p.id, enabled: true });
                            setClientPickerOpen(false);
                          }}
                        >
                          <div className="flex flex-col">
                            <span>{p.first_name} {p.last_name}</span>
                            <span className="text-xs text-muted-foreground">
                              {(roomsByUser.get(p.id) || 0)} logement(s)
                            </span>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </CardContent>
        </Card>

        {/* Tableau des clients activés */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Clients avec module Consommables activé</CardTitle>
            <CardDescription>
              Total HT = logements occupés × {CONSUMABLE_UNIT_PRICE_HT.toFixed(2)} €
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead className="text-center">Logements</TableHead>
                    <TableHead className="text-center">Logements occupés</TableHead>
                    <TableHead className="text-right">Total HT</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    [...Array(4)].map((_, i) => (
                      <TableRow key={i}>
                        <TableCell colSpan={6}><Skeleton className="h-8 w-full" /></TableCell>
                      </TableRow>
                    ))
                  ) : enabledClients.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        Aucun client n'a le module Consommables activé.
                      </TableCell>
                    </TableRow>
                  ) : (
                    enabledClients.map((p) => {
                      const totalRooms = roomsByUser.get(p.id) || 0;
                      const occupied = getOccupiedCount(p.id);
                      const existing = billingByUser.get(p.id);
                      const total = occupied * CONSUMABLE_UNIT_PRICE_HT;
                      const isDirty =
                        editedCounts[p.id] !== undefined
                          ? (existing ? existing.logement_count !== editedCounts[p.id] : true)
                          : !existing;
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
                                {existing.status === "billed" ? "Facturé" : "À facturer"}
                              </Badge>
                            ) : (
                              <Badge variant="outline">Non enregistré</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex justify-end gap-1">
                              <Button
                                size="sm"
                                variant={isDirty ? "default" : "outline"}
                                onClick={() =>
                                  saveMutation.mutate({ userId: p.id, logementCount: occupied })
                                }
                                disabled={saveMutation.isPending}
                              >
                                <Save className="h-4 w-4 mr-1" />
                                Enregistrer
                              </Button>
                              {existing && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    statusMutation.mutate({
                                      id: existing.id,
                                      status: existing.status === "billed" ? "pending" : "billed",
                                    })
                                  }
                                  disabled={statusMutation.isPending}
                                  title={existing.status === "billed" ? "Marquer à facturer" : "Marquer facturé"}
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
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => enableMutation.mutate({ userId: p.id, enabled: false })}
                                disabled={enableMutation.isPending}
                                title="Désactiver le module pour ce client"
                              >
                                Désactiver
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
                {enabledClients.length > 0 && (
                  <TableFooter>
                    <TableRow className="font-bold">
                      <TableCell colSpan={3}>Total période</TableCell>
                      <TableCell className="text-right">{totalAll.toFixed(2)} €</TableCell>
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
