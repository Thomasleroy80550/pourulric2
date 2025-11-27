"use client";

import React, { useEffect, useMemo, useState } from "react";
import MainLayout from "@/components/MainLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal, CalendarDays, CheckCircle, AlertTriangle, HelpCircle } from "lucide-react";
import { toast } from "sonner";
import { useSession } from "@/components/SessionContextProvider";
import { getUserRooms, UserRoom } from "@/lib/user-room-api";
import { createSeasonPricingRequest, SeasonPricingItem } from "@/lib/season-pricing-api";
import { hasExistingSeasonPricingRequest } from "@/lib/season-pricing-api";
import { getExistingSeasonPricingRoomIds } from "@/lib/season-pricing-api";
import SeasonTutorial from "@/components/season/SeasonTutorial";

type CsvRow = {
  start: string; // dd/MM/yyyy
  end: string;   // dd/MM/yyyy
  periodType: string;
  season: string;
  minStayText: string; // e.g. "2 nuits"
  comment: string;
};

// AJOUT: utilitaires de date pour dd/MM/yyyy
const dmyToDate = (dmy: string) => {
  const [dd, mm, yyyy] = dmy.split("/").map((s) => parseInt(s, 10));
  return new Date(yyyy, mm - 1, dd);
};
const dateToDmy = (date: Date) => {
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
};

// AJOUT: correction ciblée pour le week-end de Pâques 2026
const adjustEasterWeekend = (rows: CsvRow[]): CsvRow[] => {
  const easterStartDmy = "03/04/2026";
  const easterEndDmy = "06/04/2026";
  const easterStart = dmyToDate(easterStartDmy);
  const easterEnd = dmyToDate(easterEndDmy);
  const dayMs = 24 * 60 * 60 * 1000;

  const patchedRows = [...rows];

  // Chercher une ligne qui mentionne Pâques
  let idx = patchedRows.findIndex((r) =>
    /pâques|paques/i.test(`${r.periodType} ${r.comment}`)
  );

  // Sinon, trouver une ligne qui chevauche le week-end (sécurité si libellé différent)
  if (idx === -1) {
    idx = patchedRows.findIndex((r) => {
      const rs = dmyToDate(r.start);
      const re = dmyToDate(r.end);
      return rs <= easterEnd && re >= easterStart;
    });
  }

  const correctionNote = "Corrigé Pâques 2026 (ven 3 → lun 6, min 3 nuits)";

  if (idx !== -1) {
    const r = patchedRows[idx];
    const rs = dmyToDate(r.start);
    const re = dmyToDate(r.end);

    // Retirer la ligne originale et la remplacer par des segments continus
    patchedRows.splice(idx, 1);

    // Segment avant Pâques (si la période originale démarre avant le 03/04)
    if (rs < easterStart) {
      const beforeEnd = new Date(easterStart.getTime() - dayMs); // jour précédent
      patchedRows.push({
        ...r,
        start: r.start,
        end: dateToDmy(beforeEnd),
        // on garde la saison et le minStay original
        comment: r.comment ? `${r.comment} • segment avant Pâques` : "segment avant Pâques",
      });
    }

    // Segment Pâques (forcé Très Haute Saison et min 3 nuits)
    patchedRows.push({
      start: easterStartDmy,
      end: easterEndDmy,
      periodType: "Week-end Pâques",
      season: "TRÈS HAUTE SAISON",
      minStayText: "3 nuits",
      comment: r.comment ? `${r.comment} • ${correctionNote}` : correctionNote,
    });

    // Segment après Pâques (si la période originale se poursuit après le 06/04)
    if (re > easterEnd) {
      const afterStart = new Date(easterEnd.getTime() + dayMs); // jour suivant
      patchedRows.push({
        ...r,
        start: dateToDmy(afterStart),
        end: r.end,
        comment: r.comment ? `${r.comment} • segment après Pâques` : "segment après Pâques",
      });
    }

    // Trier par date de début pour préserver l'ordre
    patchedRows.sort((a, b) => dmyToDate(a.start).getTime() - dmyToDate(b.start).getTime());
  } else {
    // Aucune ligne correspondante: ajouter la période Pâques sans retirer les autres
    patchedRows.push({
      start: easterStartDmy,
      end: easterEndDmy,
      periodType: "Week-end Pâques",
      season: "TRÈS HAUTE SAISON",
      minStayText: "3 nuits",
      comment: "Ajout automatique selon dates officielles",
    });

    // Trier par date de début après ajout
    patchedRows.sort((a, b) => dmyToDate(a.start).getTime() - dmyToDate(b.start).getTime());
  }

  return patchedRows;
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
  // Utiliser les dates telles qu'elles sont dans le CSV puis corriger Pâques 2026
  return adjustEasterWeekend(rows);
};

const toISO = (ddmmyyyy: string): string => {
  const [dd, mm, yyyy] = ddmmyyyy.split("/");
  return `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
};

const extractMinStay = (minStayText: string): number | null => {
  const match = minStayText.match(/\d+/);
  return match ? parseInt(match[0], 10) : null;
};

// AJOUT: états prix minimum / standard
// et helpers pour suggestions
// ----------------------------------------------------
const normalize = (s?: string) => (s || "").toLowerCase();

const seasonMultiplier = (season: string) => {
  const s = normalize(season);
  if (s.includes("très haute") || s.includes("tres haute")) return 1.20;
  if (s.includes("haute")) return 1.10;
  if (s.includes("moyenne")) return 1.00;
  if (s.includes("basse")) return 0.90;
  return 1.00;
};

const extraBoostMultiplier = (periodType: string, comment: string) => {
  const p = normalize(periodType);
  const c = normalize(comment);
  let boost = 0;
  if (p.includes("week-end") || p.includes("weekend")) boost += 0.08; // ajusté
  if (c.includes("vacances") || c.includes("zone ")) boost += 0.04;   // ajusté
  return 1 + boost;
};

const computeSuggestedPrice = (row: CsvRow, baseMin: number | null, baseStd: number | null): number | null => {
  if (baseStd == null || baseStd <= 0) return null;
  const mult = seasonMultiplier(row.season) * extraBoostMultiplier(row.periodType, row.comment || "");
  const raw = Math.round(baseStd * mult);
  if (baseMin != null && baseMin > 0) {
    return Math.max(raw, baseMin);
  }
  return raw;
};
// ----------------------------------------------------

const Season2026Page: React.FC = () => {
  const { profile } = useSession();
  const [loadingCsv, setLoadingCsv] = useState(true);
  const [csvError, setCsvError] = useState<string | null>(null);
  const [rows, setRows] = useState<CsvRow[]>([]);
  const [userRooms, setUserRooms] = useState<UserRoom[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<string>("");
  const [inputsByIndex, setInputsByIndex] = useState<
    Record<number, { price?: number | null; minStay?: number | null }>
  >({});

  // AJOUT: logements déjà demandés pour 2026
  const [existingRoomIds, setExistingRoomIds] = useState<string[]>([]);

  // AJOUT: prix minimum / prix standard saisis par l'utilisateur
  const [baseMinPrice, setBaseMinPrice] = useState<number | null>(null);
  const [baseStdPrice, setBaseStdPrice] = useState<number | null>(null);

  // Suggestions calculées pour chaque ligne
  const suggestions = useMemo(() => {
    return rows.map((r) => computeSuggestedPrice(r, baseMinPrice, baseStdPrice));
  }, [rows, baseMinPrice, baseStdPrice]);

  // Blocage pour clients en smart pricing (ceux qui ne peuvent pas gérer leurs prix)
  const isSmartPricingUser = useMemo(() => !profile?.can_manage_prices, [profile]);

  const [showTutorial, setShowTutorial] = useState(false);

  // Ouvrir automatiquement une seule fois (première visite)
  useEffect(() => {
    const seen = localStorage.getItem("season2026_tutorial_seen");
    if (!seen) {
      setShowTutorial(true);
    }
  }, []);

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

  const handleInputChange = (
    index: number,
    field: "price" | "minStay",
    value: any
  ) => {
    setInputsByIndex((prev) => ({
      ...prev,
      [index]: { ...prev[index], [field]: value },
    }));
  };

  const selectedRoom = useMemo(() => userRooms.find(r => r.room_id === selectedRoomId), [userRooms, selectedRoomId]);

  // Présentation rapide de la saison (compte par type)
  const seasonCounts = useMemo(() => {
    const counts = { tresHaute: 0, haute: 0, moyenne: 0, basse: 0 };
    rows.forEach((r) => {
      const s = (r.season || "").toLowerCase();
      if (s.includes("très") || s.includes("tres")) counts.tresHaute++;
      else if (s.includes("haute")) counts.haute++;
      else if (s.includes("moyenne")) counts.moyenne++;
      else if (s.includes("basse")) counts.basse++;
    });
    return counts;
  }, [rows]);

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

  // AJOUT: appliquer suggestions aux prix vides
  const applySuggestions = () => {
    if (baseStdPrice == null || baseStdPrice <= 0) {
      toast.error("Veuillez saisir votre prix standard pour générer des suggestions.");
      return;
    }
    const next: Record<number, { price?: number | null; minStay?: number | null }> = { ...inputsByIndex };
    rows.forEach((row, i) => {
      const suggested = suggestions[i];
      const current = next[i];
      const currentPrice = current?.price;
      if (suggested != null && (currentPrice == null || currentPrice === undefined)) {
        next[i] = { ...current, price: suggested };
      }
    });
    setInputsByIndex(next);
    toast.success("Prix suggérés appliqués aux lignes sans prix.");
  };

  return (
    <MainLayout>
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
            <CalendarDays className="h-6 w-6" />
            Bienvenue dans la Saison 2026
          </h1>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowTutorial(true)}
              className="flex items-center space-x-2"
            >
              <HelpCircle className="h-4 w-4" />
              <span>Aide</span>
            </Button>
            {!isSmartPricingUser && (
              <Button onClick={handleSubmit} disabled={loadingCsv || rows.length === 0}>
                Envoyer ma demande
              </Button>
            )}
          </div>
        </div>

        {showTutorial && (
          <SeasonTutorial
            onClose={() => {
              localStorage.setItem("season2026_tutorial_seen", "1");
              setShowTutorial(false);
            }}
          />
        )}

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

                {/* AJOUT: prix de base */}
                <div className="grid sm:grid-cols-3 gap-3">
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium">Prix minimum (€)</label>
                    <Input
                      type="number"
                      step="1"
                      placeholder="ex: 90"
                      value={baseMinPrice ?? ""}
                      onChange={(e) => setBaseMinPrice(e.target.value === "" ? null : Number(e.target.value))}
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium">Prix standard (€)</label>
                    <Input
                      type="number"
                      step="1"
                      placeholder="ex: 120"
                      value={baseStdPrice ?? ""}
                      onChange={(e) => setBaseStdPrice(e.target.value === "" ? null : Number(e.target.value))}
                    />
                  </div>
                  <div className="flex items-end">
                    <Button variant="secondary" className="w-full" onClick={applySuggestions}>
                      Appliquer les suggestions
                    </Button>
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
                        <TableHead>Prix suggéré</TableHead>
                        <TableHead>Prix (€)</TableHead>
                        <TableHead>Min séjour</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.map((r, i) => {
                        const defaultsMinStay = extractMinStay(r.minStayText);
                        const inputs = inputsByIndex[i] || {};
                        const suggested = suggestions[i];
                        return (
                          <TableRow key={`${r.start}-${r.end}-${i}`}>
                            <TableCell>{r.start}</TableCell>
                            <TableCell>{r.end}</TableCell>
                            <TableCell>{r.periodType}</TableCell>
                            <TableCell>{r.season}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">{r.comment}</TableCell>
                            <TableCell className="min-w-[110px]">
                              {suggested != null ? (
                                <span className="font-medium">{suggested} €</span>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell className="min-w-[120px]">
                              <Input
                                type="number"
                                step="1"
                                placeholder={suggested != null ? String(suggested) : "ex: 120"}
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
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                  <div className="flex justify-between mt-4">
                    <div className="text-xs text-muted-foreground">
                      Les suggestions sont calculées à partir de vos prix de base et de la saison/du type de période. Elles respectent votre prix minimum.
                    </div>
                    <div className="flex gap-2">
                      <Button variant="secondary" onClick={applySuggestions}>Appliquer les suggestions</Button>
                      <Button onClick={handleSubmit}>Envoyer ma demande</Button>
                    </div>
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