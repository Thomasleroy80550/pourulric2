"use client";

import React, { useEffect, useMemo, useState } from "react";
import MainLayout from "@/components/MainLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { CalendarDays, CheckCircle, Pencil, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/components/SessionContextProvider";
import { createSeasonPricingRequest, SeasonPricingItem, SeasonPricingRequest } from "@/lib/season-pricing-api";

type EditableInputs = Record<number, { price?: number | null; min_stay?: number | null }>;

const MySeasonPricesPage: React.FC = () => {
  const { profile } = useSession();
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<SeasonPricingRequest[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [editOpen, setEditOpen] = useState(false);
  const [editingRequest, setEditingRequest] = useState<SeasonPricingRequest | null>(null);
  const [inputsByIndex, setInputsByIndex] = useState<EditableInputs>({});
  const [submitting, setSubmitting] = useState(false);

  const isSmartPricingUser = useMemo(() => !profile?.can_manage_prices, [profile]);

  useEffect(() => {
    const loadValidated = async () => {
      try {
        setLoading(true);
        setError(null);
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError) throw new Error(userError.message);
        if (!user) {
          setRequests([]);
          return;
        }

        const { data, error } = await supabase
          .from("season_price_requests")
          .select("*")
          .eq("user_id", user.id)
          .eq("season_year", 2026)
          .eq("status", "done")
          .order("created_at", { ascending: false });

        if (error) throw new Error(error.message);
        setRequests((data || []) as SeasonPricingRequest[]);
      } catch (err: any) {
        setError(err.message || "Erreur lors du chargement des tarifs validés.");
      } finally {
        setLoading(false);
      }
    };
    loadValidated();
  }, []);

  const openEdit = (req: SeasonPricingRequest) => {
    setEditingRequest(req);
    // Pré-remplir avec les valeurs existantes
    const seed: EditableInputs = {};
    req.items.forEach((it, idx) => {
      seed[idx] = {
        price: typeof it.price === "number" ? it.price : null,
        min_stay: typeof it.min_stay === "number" ? it.min_stay : null,
      };
    });
    setInputsByIndex(seed);
    setEditOpen(true);
  };

  const handleInputChange = (index: number, field: "price" | "min_stay", value: string) => {
    setInputsByIndex((prev) => ({
      ...prev,
      [index]: {
        ...prev[index],
        [field]: value === "" ? null : Number(value),
      },
    }));
  };

  const submitModification = async () => {
    if (!editingRequest) return;
    if (isSmartPricingUser) {
      toast.error("Les comptes en Smart Pricing ne peuvent pas proposer de modifications.");
      return;
    }
    setSubmitting(true);
    const toastId = toast.loading("Envoi de votre modification...");
    try {
      const newItems: SeasonPricingItem[] = editingRequest.items.map((it, idx) => {
        const next = inputsByIndex[idx] || {};
        return {
          start_date: it.start_date, // déjà en ISO (yyyy-MM-dd)
          end_date: it.end_date,
          period_type: it.period_type,
          season: it.season,
          price: typeof next.price === "number" ? next.price : null,
          min_stay: typeof next.min_stay === "number" ? next.min_stay : null,
          comment: it.comment,
          closed: it.closed === true ? true : false,
          closed_on_arrival: it.closed_on_arrival === true ? true : false,
          closed_on_departure: it.closed_on_departure === true ? true : false,
        };
      });

      await createSeasonPricingRequest({
        season_year: editingRequest.season_year,
        room_id: editingRequest.room_id ?? undefined,
        room_name: editingRequest.room_name ?? undefined,
        items: newItems,
      });

      toast.success("Votre modification a été envoyée. Une nouvelle demande est à valider.", { id: toastId });
      setEditOpen(false);
      setEditingRequest(null);
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de l'envoi de la modification.", { id: toastId });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <MainLayout>
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
            <CalendarDays className="h-6 w-6" />
            Mes tarifs 2026 validés
          </h1>
        </div>

        {isSmartPricingUser && (
          <Alert className="mb-4">
            <AlertTitle>Information Smart Pricing</AlertTitle>
            <AlertDescription>
              Vous pouvez consulter vos tarifs validés. Les modifications ne sont pas disponibles pour les comptes en Smart Pricing.
            </AlertDescription>
          </Alert>
        )}

        {loading ? (
          <Skeleton className="h-48 w-full" />
        ) : error ? (
          <Alert variant="destructive">
            <AlertTitle>Erreur</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : requests.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>Aucune demande validée</CardTitle>
              <CardDescription>Vous n'avez pas encore de tarifs validés pour la saison 2026.</CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <div className="grid gap-4">
            {requests.map((req) => (
              <Card key={req.id}>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">
                      {req.room_name || req.room_id || "Logement"} • {req.season_year}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      Statut: Terminée
                    </CardDescription>
                  </div>
                  {!isSmartPricingUser && (
                    <Button size="sm" onClick={() => openEdit(req)} className="inline-flex items-center">
                      <Pencil className="h-4 w-4 mr-2" />
                      Effectuer une modification
                    </Button>
                  )}
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Du</TableHead>
                        <TableHead>Au</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Saison</TableHead>
                        <TableHead>Prix (€)</TableHead>
                        <TableHead>Min séjour</TableHead>
                        <TableHead>Fermé</TableHead>
                        <TableHead>Arrivée fermée</TableHead>
                        <TableHead>Départ fermé</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {req.items.map((it, idx) => (
                        <TableRow key={`${req.id}-${idx}`}>
                          <TableCell>{it.start_date}</TableCell>
                          <TableCell>{it.end_date}</TableCell>
                          <TableCell>{it.period_type || "—"}</TableCell>
                          <TableCell>{it.season || "—"}</TableCell>
                          <TableCell>{typeof it.price === "number" ? `${it.price} €` : "—"}</TableCell>
                          <TableCell>{typeof it.min_stay === "number" ? it.min_stay : "—"}</TableCell>
                          <TableCell>{it.closed ? "Oui" : "Non"}</TableCell>
                          <TableCell>{it.closed_on_arrival ? "Oui" : "Non"}</TableCell>
                          <TableCell>{it.closed_on_departure ? "Oui" : "Non"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Dialog de modification */}
        <Dialog open={editOpen} onOpenChange={(o) => { if (!o) setEditOpen(false); }}>
          <DialogContent className="sm:max-w-4xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Proposer une modification</DialogTitle>
            </DialogHeader>
            {editingRequest ? (
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>
                      {editingRequest.room_name || editingRequest.room_id || "Logement"} • {editingRequest.season_year}
                    </CardTitle>
                    <CardDescription>Modifiez vos prix et/ou min séjour; une nouvelle demande sera créée.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Du</TableHead>
                          <TableHead>Au</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Saison</TableHead>
                          <TableHead>Prix (€)</TableHead>
                          <TableHead>Min séjour</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {editingRequest.items.map((it, idx) => {
                          const inputs = inputsByIndex[idx] || {};
                          return (
                            <TableRow key={`${editingRequest.id}-edit-${idx}`}>
                              <TableCell>{it.start_date}</TableCell>
                              <TableCell>{it.end_date}</TableCell>
                              <TableCell>{it.period_type || "—"}</TableCell>
                              <TableCell>{it.season || "—"}</TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  step="1"
                                  placeholder={typeof it.price === "number" ? String(it.price) : "ex: 120"}
                                  value={typeof inputs.price === "number" ? inputs.price : ""}
                                  onChange={(e) => handleInputChange(idx, "price", e.target.value)}
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  step="1"
                                  placeholder={typeof it.min_stay === "number" ? String(it.min_stay) : "ex: 2"}
                                  value={typeof inputs.min_stay === "number" ? inputs.min_stay : ""}
                                  onChange={(e) => handleInputChange(idx, "min_stay", e.target.value)}
                                />
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                    <div className="flex justify-end mt-4">
                      <Button onClick={submitModification} disabled={submitting}>
                        {submitting ? (
                          <span className="inline-flex items-center">
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Envoi...
                          </span>
                        ) : (
                          "Envoyer la modification"
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <Skeleton className="h-24 w-full" />
            )}
            <DialogFooter />
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
};

export default MySeasonPricesPage;