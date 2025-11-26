"use client";

import React, { useEffect, useMemo, useState } from "react";
import MainLayout from "@/components/MainLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal, CalendarDays, CheckCircle, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useSession } from "@/components/SessionContextProvider";
import { getUserRooms, UserRoom } from "@/lib/user-room-api";
import { createSeasonPricingRequest, SeasonPricingItem } from "@/lib/season-pricing-api";
import { hasExistingSeasonPricingRequest } from "@/lib/season-pricing-api";
import { getExistingSeasonPricingRoomIds } from "@/lib/season-pricing-api";

type CsvRow = {
  start: string; // dd/MM/yyyy
  end: string;   // dd/MM/yyyy
  periodType: string;
  season: string;
  minStayText: string; // e.g. "2 nuits"
  comment: string;
};

const parseCsv = (csvText: string): CsvRow[] => {
  const lines = csvText.trim().split(/\r?\n/);
  const rows: CsvRow[] = [];
  // skip header
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;
    const parts = line.split(";");
    if (parts.length < 6) continue;
    rows.push({
      start: parts[0],
      end: parts[1],
      periodType: parts[2],
      season: parts[3],
      minStayText: parts[4],
      comment: parts[5],
    });
  }
  // Utiliser les dates telles qu'elles sont dans le CSV
  return rows;
};

const toISO = (ddmmyyyy: string): string => {
  const [dd, mm, yyyy] = ddmmyyyy.split("/");
  return `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
};

const extractMinStay = (minStayText: string): number | null => {
  const match = minStayText.match(/\d+/);
  return match ? parseInt(match[0], 10) : null;
};

const Season2026Page: React.FC = () => {
  const { profile } = useSession();
  const [loadingCsv, setLoadingCsv] = useState(true);
  const [csvError, setCsvError] = useState<string | null>(null);
  const [rows, setRows] = useState<CsvRow[]>([]);
  const [userRooms, setUserRooms] = useState<UserRoom[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string>("");
  const [inputsByIndex, setInputsByIndex] = useState<Record<number, { price?: number | null; minStay?: number | null; closed?: boolean; clArr?: boolean; clDep?: boolean }>>({});

  // Blocage pour clients en smart pricing (ceux qui ne peuvent pas gérer leurs prix)
  const isSmartPricingUser = useMemo(() => !profile?.can_manage_prices, [profile]);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        setLoadingCsv(true);
        setCsvError(null);
        const resp = await fetch("/data/SAISON%202026.csv", { cache: "no-store" });
        if (!resp.ok) throw new Error(`Impossible de charger le CSV (${resp.status})`);
        const text = await resp.text();
        const parsed = parseCsv(text);
        setRows(parsed);
      } catch (err: any) {
        setCsvError(err.message || "Erreur inconnue lors du chargement du CSV");
      } finally {
        setLoadingCsv(false);
      }

      try {
        const rooms = await getUserRooms();
        setUserRooms(rooms);

        // récupérer les logements ayant déjà une demande pour 2026
        const existing = await getExistingSeasonPricingRoomIds(2026);
        setExistingRoomIds(existing);

        // Sélectionner par défaut le premier logement non déjà demandé
        if (rooms.length > 0) {
          const firstAvailable = rooms.find((r) => !existing.includes(r.room_id)) ?? rooms[0];
          setSelectedRoomId(firstAvailable.room_id);
        }
      } catch (err: any) {
        console.error("Error fetching user rooms:", err);
      }
    };
    fetchAll();
  }, []);

  // AJOUT: logements déjà demandés pour 2026
  const [existingRoomIds, setExistingRoomIds] = useState<string[]>([]);

  const handleInputChange = (index: number, field: "price" | "minStay" | "closed" | "clArr" | "clDep", value: any) => {
    setInputsByIndex((prev) => ({
      ...prev,
      [index]: { ...prev[index], [field]: value },
    }));
  };

  const selectedRoom = useMemo(() => userRooms.find(r => r.room_id === selectedRoomId), [userRooms, selectedRoomId]);

  const handleSubmit = async () => {
    if (isSmartPricingUser) {
      toast.error("Fonctionnalité non disponible pour les comptes en smart pricing.");
      return;
    }
    if (!selectedRoom) {
      toast.error("Veuillez sélectionner un logement.");
      return;
    }
    if (rows.length === 0) {
      toast.error("Aucune période à enregistrer.");
      return;
    }

    // Empêcher les doublons pour le même logement en 2026
    const alreadyExists = await hasExistingSeasonPricingRequest(2026, selectedRoom.room_id);
    if (alreadyExists) {
      toast.error("Une demande existe déjà pour ce logement en 2026. Merci d'attendre son traitement ou contacter l'administration pour l'annuler.");
      return;
    }

    const items: SeasonPricingItem[] = rows.map((row, i) => {
      const userInputs = inputsByIndex[i] || {};
      const minStayDefault = extractMinStay(row.minStayText);
      const minStayFinal = userInputs.minStay ?? minStayDefault ?? null;
      const priceFinal = typeof userInputs.price === "number" ? userInputs.price : null;

      return {
        start_date: toISO(row.start),
        end_date: toISO(row.end),
        period_type: row.periodType,
        season: row.season,
        price: priceFinal,
        min_stay: minStayFinal,
        closed: !!userInputs.closed,
        closed_on_arrival: !!userInputs.clArr,
        closed_on_departure: !!userInputs.clDep,
        comment: row.comment,
      };
    });

    const toastId = toast.loading("Envoi de la demande en cours...");
    try {
      await createSeasonPricingRequest({
        season_year: 2026,
        room_id: selectedRoom.room_id,
        room_name: selectedRoom.room_name,
        items,
      });
      toast.success("Votre demande a été créée. Notre administration la traitera manuellement.", { id: toastId });
    } catch (err: any) {
      toast.error(`Erreur lors de la création de la demande : ${err.message}`, { id: toastId });
    }
  };

  return (
    <MainLayout>
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
            <CalendarDays className="h-6 w-6" />
            Bienvenue dans la Saison 2026
          </h1>
          {!isSmartPricingUser && (
            <Button onClick={handleSubmit} disabled={loadingCsv || rows.length === 0}>
              Envoyer ma demande
            </Button>
          )}
        </div>

        {/* Alerte smart pricing bien visible */}
        {!isSmartPricingUser && (
          <Alert
            className="mb-4 border-amber-300 bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200 dark:border-amber-600"
          >
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Important</AlertTitle>
            <AlertDescription>
              Si vous utilisez le smart pricing, votre demande sera automatiquement rejetée.
            </AlertDescription>
          </Alert>
        )}

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Préambule</CardTitle>
            <CardDescription>
              Saisissez vos prix et restrictions pour chaque période de 2026. À la soumission, une demande sera créée auprès de l'administration (traitement manuel).
              <p className="mt-2 text-sm italic text-muted-foreground">
                Si vous utilisez le smart pricing, votre demande sera automatiquement rejetée.
              </p>
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isSmartPricingUser ? (
              <Alert variant="destructive">
                <Terminal className="h-4 w-4" />
                <AlertTitle>Fonctionnalité non disponible</AlertTitle>
                <AlertDescription>
                  Votre compte utilise le "smart pricing". Cette fonctionnalité n'est pas accessible. Merci de contacter l'administration si besoin.
                </AlertDescription>
              </Alert>
            ) : (
              <div className="grid gap-4">
                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium">Logement concerné</label>
                    <select
                      className="h-10 rounded-md border bg-background px-3 py-2 text-sm"
                      value={selectedRoomId}
                      onChange={(e) => setSelectedRoomId(e.target.value)}
                    >
                      {userRooms.map((room) => {
                        const isUsed = existingRoomIds.includes(room.room_id);
                        const label = isUsed
                          ? `${room.room_name} • déjà demandé`
                          : room.room_name;
                        return (
                          <option
                            key={room.id}
                            value={room.room_id}
                            disabled={isUsed}
                          >
                            {label}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    Saisies libres: si vous laissez vide le prix, l'admin appliquera ses règles.
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {loadingCsv ? (
          <div className="space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : csvError ? (
          <Alert variant="destructive">
            <Terminal className="h-4 w-4" />
            <AlertTitle>Erreur de chargement</AlertTitle>
            <AlertDescription>{csvError}</AlertDescription>
          </Alert>
        ) : (
          <>
            {!isSmartPricingUser && (
              <Card>
                <CardHeader>
                  <CardTitle>Périodes Saison 2026</CardTitle>
                  <CardDescription>Complétez vos prix et restrictions, puis envoyez la demande.</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableCaption>Les périodes proviennent du CSV officiel de la saison 2026.</TableCaption>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Du</TableHead>
                        <TableHead>Au</TableHead>
                        <TableHead>Type période</TableHead>
                        <TableHead>Saison</TableHead>
                        <TableHead>Commentaire</TableHead>
                        <TableHead>Prix (€)</TableHead>
                        <TableHead>Min séjour</TableHead>
                        <TableHead>Fermé</TableHead>
                        <TableHead>Arrivée fermée</TableHead>
                        <TableHead>Départ fermé</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.map((r, i) => {
                        const defaultsMinStay = extractMinStay(r.minStayText);
                        const inputs = inputsByIndex[i] || {};
                        return (
                          <TableRow key={`${r.start}-${r.end}-${i}`}>
                            <TableCell>{r.start}</TableCell>
                            <TableCell>{r.end}</TableCell>
                            <TableCell>{r.periodType}</TableCell>
                            <TableCell>{r.season}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">{r.comment}</TableCell>
                            <TableCell className="min-w-[120px]">
                              <Input
                                type="number"
                                step="0.01"
                                placeholder="ex: 120"
                                value={typeof inputs.price === "number" ? inputs.price : ""}
                                onChange={(e) =>
                                  handleInputChange(i, "price", e.target.value === "" ? null : Number(e.target.value))
                                }
                              />
                            </TableCell>
                            <TableCell className="min-w-[110px]">
                              <Input
                                type="number"
                                placeholder={defaultsMinStay ? String(defaultsMinStay) : "ex: 2"}
                                value={typeof inputs.minStay === "number" ? inputs.minStay : ""}
                                onChange={(e) =>
                                  handleInputChange(i, "minStay", e.target.value === "" ? null : Number(e.target.value))
                                }
                              />
                            </TableCell>
                            <TableCell>
                              <Switch
                                checked={!!inputs.closed}
                                onCheckedChange={(v) => handleInputChange(i, "closed", v)}
                              />
                            </TableCell>
                            <TableCell>
                              <Switch
                                checked={!!inputs.clArr}
                                onCheckedChange={(v) => handleInputChange(i, "clArr", v)}
                              />
                            </TableCell>
                            <TableCell>
                              <Switch
                                checked={!!inputs.clDep}
                                onCheckedChange={(v) => handleInputChange(i, "clDep", v)}
                              />
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                  <div className="flex justify-end mt-4">
                    <Button onClick={handleSubmit}>Envoyer ma demande</Button>
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

export default Season2026Page;