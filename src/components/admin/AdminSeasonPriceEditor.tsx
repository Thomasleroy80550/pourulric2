"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { AdminUserRoom } from "@/lib/admin-api";
import type { SeasonPricingItem, SeasonPricingRequest } from "@/lib/season-pricing-api";

type CsvRow = {
  start: string; // dd/MM/yyyy
  end: string;   // dd/MM/yyyy
  periodType: string;
  season: string;
  minStayText: string;
  comment: string;
};

type EditableInputs = Record<number, { price?: number | null; min_stay?: number | null }>;

function dmyToIso(dmy: string): string {
  const [dd, mm, yyyy] = dmy.split("/");
  return `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
}

function extractMinStay(minStayText: string): number | null {
  const match = minStayText.match(/\d+/);
  return match ? parseInt(match[0], 10) : null;
}

function parseCsv(text: string): CsvRow[] {
  const lines = text.trim().split(/\r?\n/);
  const rows: CsvRow[] = [];
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
  return rows;
}

// AJOUT: helpers de suggestion (alignés avec la version user)
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
  if (p.includes("week-end") || p.includes("weekend")) boost += 0.08;
  if (c.includes("vacances") || c.includes("zone ")) boost += 0.04;
  return 1 + boost;
};
const clamp = (n: number, min: number | null, max: number | null) => {
  let x = n;
  if (min != null) x = Math.max(x, min);
  if (max != null) x = Math.min(x, max);
  return x;
};
const computeSuggestedPrice = (
  row: CsvRow,
  baseMin: number | null,
  baseStd: number | null,
  baseMax: number | null
): number | null => {
  if (baseStd == null || baseStd <= 0) return null;
  const mult = seasonMultiplier(row.season) * extraBoostMultiplier(row.periodType, row.comment || "");
  const raw = Math.round(baseStd * mult);
  return clamp(raw, baseMin && baseMin > 0 ? baseMin : null, baseMax && baseMax > 0 ? baseMax : null);
};

interface AdminSeasonPriceEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  room: AdminUserRoom;
  onCreated?: (req: SeasonPricingRequest) => void;
}

const AdminSeasonPriceEditor: React.FC<AdminSeasonPriceEditorProps> = ({ open, onOpenChange, room, onCreated }) => {
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<CsvRow[]>([]);
  const [inputsByIndex, setInputsByIndex] = useState<EditableInputs>({});
  const [submitting, setSubmitting] = useState(false);

  // REMPLACE: basePrice + coefficient -> prix min / base / max
  const [baseMinStr, setBaseMinStr] = useState<string>("");
  const [baseStdStr, setBaseStdStr] = useState<string>("");
  const [baseMaxStr, setBaseMaxStr] = useState<string>("");

  useEffect(() => {
    if (!open) return;
    const load = async () => {
      try {
        setLoading(true);
        const resp = await fetch("/data/SAISON%202026.csv", { cache: "no-store" });
        if (!resp.ok) throw new Error(`Impossible de charger le CSV (${resp.status})`);
        const text = await resp.text();
        const parsed = parseCsv(text);
        setRows(parsed);
        // seed inputs with default min stay
        const seed: EditableInputs = {};
        parsed.forEach((r, idx) => {
          seed[idx] = { min_stay: extractMinStay(r.minStayText) };
        });
        setInputsByIndex(seed);
      } catch (err: any) {
        toast.error(err.message || "Erreur chargement des périodes 2026.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [open]);

  const handleInputChange = (index: number, field: "price" | "min_stay", value: string) => {
    setInputsByIndex(prev => ({
      ...prev,
      [index]: {
        ...prev[index],
        [field]: value === "" ? null : Number(value),
      },
    }));
  };

  const items: SeasonPricingItem[] = useMemo(() => {
    return rows.map((r, idx) => {
      const inputs = inputsByIndex[idx] || {};
      return {
        start_date: dmyToIso(r.start),
        end_date: dmyToIso(r.end),
        period_type: r.periodType,
        season: r.season,
        price: typeof inputs.price === "number" ? inputs.price : null,
        min_stay: typeof inputs.min_stay === "number" ? inputs.min_stay : extractMinStay(r.minStayText),
        comment: r.comment,
        closed: false,
        closed_on_arrival: false,
        closed_on_departure: false,
      };
    });
  }, [rows, inputsByIndex]);

  // AJOUT: suggestions calculées
  const baseMin = baseMinStr !== "" ? Number(baseMinStr) : null;
  const baseStd = baseStdStr !== "" ? Number(baseStdStr) : null;
  const baseMax = baseMaxStr !== "" ? Number(baseMaxStr) : null;

  const suggestions = useMemo(() => {
    return rows.map((r) => computeSuggestedPrice(r, baseMin, baseStd, baseMax));
  }, [rows, baseMin, baseStd, baseMax]);

  const submit = async () => {
    setSubmitting(true);
    const toastId = toast.loading("Création de la demande validée...");
    try {
      const { data, error } = await supabase
        .from("season_price_requests")
        .insert({
          user_id: room.user_id,
          season_year: 2026,
          room_id: room.room_id,
          room_name: room.room_name,
          items,
          status: "done",
        })
        .select("*")
        .single();

      if (error) throw new Error(error.message);

      toast.success("Demande créée et marquée comme terminée.", { id: toastId });
      onOpenChange(false);
      if (data && onCreated) {
        onCreated(data as SeasonPricingRequest);
      }
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de la création.", { id: toastId });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-5xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Définir les prix – {room.room_name || room.room_id}</DialogTitle>
        </DialogHeader>
        <Card>
          <CardHeader>
            <CardTitle>Périodes Saison 2026</CardTitle>
            <CardDescription>Saisissez les prix et min séjours, puis créez la demande validée.</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Bloc de proposition automatique: prix min / base / max */}
            <div className="mb-4 grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Prix minimum (€)</label>
                <Input
                  type="number"
                  step="1"
                  min="0"
                  placeholder="ex: 90"
                  value={baseMinStr}
                  onChange={(e) => setBaseMinStr(e.target.value.replace(/[^0-9.]/g, ""))}
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Prix de base (€)</label>
                <Input
                  type="number"
                  step="1"
                  min="0"
                  placeholder="ex: 120"
                  value={baseStdStr}
                  onChange={(e) => setBaseStdStr(e.target.value.replace(/[^0-9.]/g, ""))}
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">Prix maximum (€)</label>
                <Input
                  type="number"
                  step="1"
                  min="0"
                  placeholder="ex: 180"
                  value={baseMaxStr}
                  onChange={(e) => setBaseMaxStr(e.target.value.replace(/[^0-9.]/g, ""))}
                />
              </div>
              <div className="flex items-end">
                <Button
                  className="w-full"
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    if (baseStd == null || Number.isNaN(baseStd) || baseStd <= 0) {
                      toast.error("Veuillez saisir un prix de base valide.");
                      return;
                    }
                    const next: EditableInputs = { ...inputsByIndex };
                    rows.forEach((r, idx) => {
                      const suggested = computeSuggestedPrice(r, baseMin, baseStd, baseMax);
                      const current = next[idx] || {};
                      next[idx] = { ...current, price: suggested };
                    });
                    setInputsByIndex(next);
                    toast.success("Prix proposés appliqués à toutes les périodes.");
                  }}
                >
                  Proposer automatiquement
                </Button>
              </div>
            </div>

            {loading ? (
              <Skeleton className="h-48 w-full" />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Du</TableHead>
                    <TableHead>Au</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Saison</TableHead>
                    <TableHead>Commentaire</TableHead>
                    <TableHead>Prix suggéré</TableHead>
                    <TableHead>Prix (€)</TableHead>
                    <TableHead>Min séjour</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r, idx) => {
                    const inputs = inputsByIndex[idx] || {};
                    const defaultMin = extractMinStay(r.minStayText);
                    const suggested = suggestions[idx];
                    return (
                      <TableRow key={`${r.start}-${r.end}-${idx}`}>
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
                            onChange={(e) => handleInputChange(idx, "price", e.target.value)}
                          />
                        </TableCell>
                        <TableCell className="min-w-[110px]">
                          <Input
                            type="number"
                            step="1"
                            placeholder={defaultMin ? String(defaultMin) : "ex: 2"}
                            value={typeof inputs.min_stay === "number" ? inputs.min_stay : ""}
                            onChange={(e) => handleInputChange(idx, "min_stay", e.target.value)}
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
            <div className="flex justify-end mt-4">
              <Button onClick={submit} disabled={submitting || loading}>
                {submitting ? (
                  <span className="inline-flex items-center">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Création...
                  </span>
                ) : (
                  "Créer la demande validée"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
        <DialogFooter />
      </DialogContent>
    </Dialog>
  );
};

export default AdminSeasonPriceEditor;