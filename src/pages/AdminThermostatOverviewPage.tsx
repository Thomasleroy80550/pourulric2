"use client";

import React from "react";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableHead, TableRow, TableBody, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Thermometer, Home, RefreshCcw, Link as LinkIcon, AlertTriangle } from "lucide-react";

type Room = {
  id: string;
  user_id: string;
  room_name: string;
  room_id: string;
};

type Thermostat = {
  id: string;
  user_id: string;
  user_room_id: string | null;
  home_id: string;
  device_id: string;
  module_id: string;
  netatmo_room_id?: string | null;
  netatmo_room_name?: string | null;
  label?: string | null;
};

type Row = {
  room: Room;
  thermostat?: Thermostat | null;
  temperature?: number | null;
  status?: "ok" | "error" | "no_thermostat";
  errorMessage?: string | null;
};

// Supabase functions invocation est utilisé ci-dessous; pas besoin d'URL brute

const AdminThermostatOverviewPage: React.FC = () => {
  const [loading, setLoading] = React.useState(true);
  const [rows, setRows] = React.useState<Row[]>([]);
  const [search, setSearch] = React.useState("");

  const filteredRows = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      const roomText = `${r.room.room_name} ${r.room.room_id}`.toLowerCase();
      const thermoText = `${r.thermostat?.label ?? ""} ${r.thermostat?.netatmo_room_name ?? ""}`.toLowerCase();
      return roomText.includes(q) || thermoText.includes(q);
    });
  }, [rows, search]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Récupérer toutes les rooms (admin a accès)
      const { data: rooms, error: roomsError } = await supabase
        .from("user_rooms")
        .select("id, user_id, room_name, room_id")
        .order("room_name", { ascending: true });

      if (roomsError) throw new Error(roomsError.message);

      // Récupérer tous les thermostats (admin a accès)
      const { data: thermostats, error: thermoError } = await supabase
        .from("netatmo_thermostats")
        .select("id, user_id, user_room_id, home_id, device_id, module_id, netatmo_room_id, netatmo_room_name, label");

      if (thermoError) throw new Error(thermoError.message);

      // Index des thermostats par user_room_id
      const byRoomId = new Map<string, Thermostat>();
      (thermostats || []).forEach((t) => {
        if (t.user_room_id) byRoomId.set(t.user_room_id, t as Thermostat);
      });

      // Construire lignes initiales (sans température)
      const initialRows: Row[] = (rooms || []).map((room) => {
        const thermostat = byRoomId.get(room.id) ?? null;
        return {
          room: room as Room,
          thermostat,
          status: thermostat ? "ok" : "no_thermostat",
        };
      });

      // Regrouper par maison Netatmo et appeler homestatus une fois par home_id
      const uniqueHomeIds = Array.from(
        new Set(
          (thermostats || [])
            .map((t) => t.home_id)
            .filter((h): h is string => typeof h === "string" && h.length > 0)
        )
      );

      const tempsByRoomIdGlobal = new Map<string, number>();
      for (const homeId of uniqueHomeIds) {
        try {
          const { data, error } = await supabase.functions.invoke("netatmo-proxy", {
            body: { endpoint: "homestatus", home_id: homeId },
          });
          if (error) {
            // Continuer: on marquera les lignes correspondantes en erreur plus bas
            continue;
          }
          const roomsBlock = data?.body?.home?.rooms || data?.body?.rooms || [];
          for (const r of roomsBlock) {
            const rid = String(r.id);
            const t = typeof r.therm_measured_temperature === "number" ? r.therm_measured_temperature : null;
            if (t != null) tempsByRoomIdGlobal.set(rid, t);
          }
        } catch {
          // ignorer erreur individuelle et poursuivre
          continue;
        }
      }

      // Fusionner températures dans les lignes
      const mergedRows = initialRows.map((row) => {
        if (!row.thermostat || !row.thermostat.netatmo_room_id) return row;
        const rid = String(row.thermostat.netatmo_room_id);
        const t = tempsByRoomIdGlobal.get(rid);
        if (typeof t === "number") {
          return { ...row, temperature: t, status: "ok" as const, errorMessage: null };
        }
        return { ...row, status: "error" as const, errorMessage: "Température non disponible" };
      });

      setRows(mergedRows);
    } catch (e: any) {
      toast.error("Erreur de chargement", { description: e?.message || String(e) });
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchData();
  }, []);

  return (
    <AdminLayout>
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Thermometer className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Températures des logements</h1>
        </div>
        <Card>
          <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle>Thermostats Netatmo liés</CardTitle>
              <CardDescription>Chaque logement doit avoir un thermostat lié pour remonter sa température.</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Input
                placeholder="Rechercher un logement ou thermostat…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-64"
              />
              <Button variant="outline" onClick={fetchData} disabled={loading}>
                <RefreshCcw className="h-4 w-4 mr-2" />
                Rafraîchir
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="grid grid-cols-1 md:grid-cols-5 gap-3 items-center">
                    <Skeleton className="h-5 w-full" />
                    <Skeleton className="h-5 w-full" />
                    <Skeleton className="h-5 w-20" />
                    <Skeleton className="h-5 w-24" />
                    <Skeleton className="h-8 w-24" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="w-full overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[220px]">Logement</TableHead>
                      <TableHead className="min-w-[220px]">Thermostat lié</TableHead>
                      <TableHead>Température</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRows.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-muted-foreground text-sm">
                          Aucun logement trouvé.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredRows.map((r) => (
                        <TableRow key={r.room.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Home className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <div className="font-medium">{r.room.room_name}</div>
                                <div className="text-xs text-muted-foreground">{r.room.room_id}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {r.thermostat ? (
                              <div className="flex items-center gap-2">
                                <LinkIcon className="h-4 w-4 text-muted-foreground" />
                                <div>
                                  <div className="font-medium">
                                    {r.thermostat.label || r.thermostat.netatmo_room_name || "Thermostat"}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    home={r.thermostat.home_id} • device={r.thermostat.device_id}
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <Badge variant="destructive">Aucun thermostat lié</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {r.status === "error" ? (
                              <div className="flex items-center gap-1 text-red-600">
                                <AlertTriangle className="h-4 w-4" />
                                <span className="text-sm">Erreur</span>
                              </div>
                            ) : r.temperature != null ? (
                              <div className="flex items-center gap-2">
                                <Thermometer className="h-4 w-4 text-primary" />
                                <span className="font-medium">{r.temperature.toFixed(1)} °C</span>
                              </div>
                            ) : (
                              <span className="text-sm text-muted-foreground">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {r.status === "no_thermostat" ? (
                              <Badge variant="destructive">Non configuré</Badge>
                            ) : r.status === "error" ? (
                              <Badge variant="destructive">Erreur</Badge>
                            ) : (
                              <Badge variant="secondary">OK</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={fetchData}
                                title="Recharger la température"
                              >
                                <RefreshCcw className="h-4 w-4 mr-1" />
                                Rafraîchir
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminThermostatOverviewPage;