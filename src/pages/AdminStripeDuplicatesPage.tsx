"use client";

import React, { useEffect, useMemo, useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { useSession } from "@/components/SessionContextProvider";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

type StripeTransfer = {
  id: string;
  amount: number; // en cents
  currency?: string;
  destination?: string; // connected account id
  created?: number | string; // timestamp (s) ou ISO
  description?: string | null;
};

type StripeAccount = {
  id: string;
};

type DuplicateGroup = {
  key: string; // destination + currency
  destination?: string;
  currency?: string;
  transfers: StripeTransfer[];
  reason: "same_id" | "same_amount_window";
};

const AdminStripeDuplicatesPage: React.FC = () => {
  const { profile, loading } = useSession();
  const [daysWindow, setDaysWindow] = useState<number>(7);
  const [minAmount, setMinAmount] = useState<number>(0); // en euros
  const [data, setData] = useState<StripeTransfer[] | null>(null);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<StripeAccount[]>([]);
  const [accountsLoaded, setAccountsLoaded] = useState<number>(0);
  const [transfersLoaded, setTransfersLoaded] = useState<number>(0);

  // Récupère tous les comptes puis tous les transferts (tous comptes) et détecte les doublons globalement.
  const fetchAllTransfers = async () => {
    setFetching(true);
    setError(null);
    setAccountsLoaded(0);
    setTransfersLoaded(0);

    // 1) Charger les comptes Stripe
    const { data: accResp, error: accErr } = await supabase.functions.invoke("list-stripe-accounts", {
      body: { limit: 200 },
    });
    if (accErr) {
      setError(accErr.message ?? "Impossible de charger les comptes Stripe.");
      setFetching(false);
      return;
    }
    const accList: StripeAccount[] = Array.isArray(accResp) ? accResp : (Array.isArray(accResp?.data) ? accResp.data : []);
    setAccounts(accList);
    setAccountsLoaded(accList.length);
    if (accList.length === 0) {
      setError("Aucun compte Stripe disponible.");
      setFetching(false);
      return;
    }

    // 2) Pour chaque compte, charger ses transferts
    const allTransfers: StripeTransfer[] = [];
    const results = await Promise.allSettled(
      accList.map((acc) =>
        supabase.functions.invoke("list-stripe-transfers", { body: { account_id: acc.id } })
      )
    );

    for (const r of results) {
      if (r.status === "fulfilled") {
        const resp = r.value?.data;
        const transfers: StripeTransfer[] = Array.isArray(resp) ? resp : (Array.isArray(resp?.data) ? resp.data : []);
        if (Array.isArray(transfers) && transfers.length > 0) {
          allTransfers.push(...transfers);
        }
      } else {
        // On ignore les comptes en erreur, pour ne pas bloquer l'analyse globale
        // Optionnel: collecter les erreurs si nécessaire
      }
    }

    setTransfersLoaded(allTransfers.length);
    setData(allTransfers);
    setFetching(false);
  };

  useEffect(() => {
    if (!loading && profile?.role === "admin") {
      // Analyse automatique sur tous les comptes dès l'ouverture
      fetchAllTransfers();
    }
  }, [loading, profile?.role]);

  const duplicates = useMemo<DuplicateGroup[]>(() => {
    if (!data) return [];
    const eurosToCents = (eu: number) => Math.round(eu * 100);
    const minAmountCents = eurosToCents(minAmount);
    const createdToMs = (c?: number | string) => {
      if (!c) return 0;
      if (typeof c === "number") {
        // Stripe created est en secondes
        return c * 1000;
      }
      const d = new Date(c).getTime();
      return Number.isFinite(d) ? d : 0;
    };
    const msWindow = daysWindow * 24 * 60 * 60 * 1000;

    // Filtrer et regrouper par destination + currency
    const filtered = data.filter(t => {
      const amt = typeof t.amount === "number" ? t.amount : 0;
      return amt >= minAmountCents;
    });

    const byKey: Record<string, StripeTransfer[]> = {};
    for (const t of filtered) {
      const key = `${t.destination ?? "unknown"}|${(t.currency ?? "eur").toLowerCase()}`;
      if (!byKey[key]) byKey[key] = [];
      byKey[key].push(t);
    }

    const result: DuplicateGroup[] = [];

    // Cas 1: doublons par même ID
    for (const [key, list] of Object.entries(byKey)) {
      const ids = new Map<string, StripeTransfer[]>();
      for (const t of list) {
        if (!ids.has(t.id)) ids.set(t.id, []);
        ids.get(t.id)!.push(t);
      }
      const sameIdGroups = Array.from(ids.values()).filter(g => g.length > 1);
      for (const g of sameIdGroups) {
        result.push({
          key,
          destination: g[0]?.destination,
          currency: g[0]?.currency ?? "eur",
          transfers: g,
          reason: "same_id",
        });
      }
    }

    // Cas 2: doublons par même montant dans une fenêtre de temps
    for (const [key, list] of Object.entries(byKey)) {
      // Grouper par montant
      const amounts = new Map<number, StripeTransfer[]>();
      for (const t of list) {
        const amt = typeof t.amount === "number" ? t.amount : 0;
        if (!amounts.has(amt)) amounts.set(amt, []);
        amounts.get(amt)!.push(t);
      }
      for (const group of amounts.values()) {
        if (group.length < 2) continue;
        // Trier par date et repérer des paires proches
        const sorted = group
          .map(g => ({ g, createdMs: createdToMs(g.created) }))
          .sort((a, b) => a.createdMs - b.createdMs);
        const bucket: StripeTransfer[] = [];
        for (let i = 0; i < sorted.length; i++) {
          const a = sorted[i];
          for (let j = i + 1; j < sorted.length; j++) {
            const b = sorted[j];
            if (b.createdMs - a.createdMs <= msWindow) {
              // Ajouter ces éléments s'ils ne sont pas déjà dans le bucket
              if (!bucket.find(x => x.id === a.g.id)) bucket.push(a.g);
              if (!bucket.find(x => x.id === b.g.id)) bucket.push(b.g);
            } else {
              break;
            }
          }
        }
        if (bucket.length >= 2) {
          result.push({
            key,
            destination: bucket[0]?.destination,
            currency: bucket[0]?.currency ?? "eur",
            transfers: bucket,
            reason: "same_amount_window",
          });
        }
      }
    }

    // Fusionner et dédupliquer les groupes par contenu (clé+ensemble d'ids)
    const sig = (grp: DuplicateGroup) =>
      `${grp.key}|${grp.reason}|${grp.transfers.map(t => t.id).sort().join(",")}`;
    const uniqueMap = new Map<string, DuplicateGroup>();
    for (const grp of result) {
      uniqueMap.set(sig(grp), grp);
    }
    return Array.from(uniqueMap.values());
  }, [data, daysWindow, minAmount]);

  if (loading) {
    return <div className="p-6">Chargement de la session…</div>;
  }
  if (profile?.role !== "admin") {
    return null;
  }

  return (
    <AdminLayout>
      <div className="container mx-auto px-4 py-6">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Doublons de virements Stripe</CardTitle>
            <CardDescription>
              Détection des transferts potentiellement en double par compte connecté (ID identique, ou même montant dans une fenêtre de temps).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-end gap-3">
              {/* Infos de progression */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Comptes chargés:</span>
                <Badge variant="secondary">{accountsLoaded}</Badge>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Transferts chargés:</span>
                <Badge variant="outline">{transfersLoaded}</Badge>
              </div>
              <div className="flex flex-col">
                <label className="text-sm text-muted-foreground">Fenêtre (jours)</label>
                <Input
                  type="number"
                  min={0}
                  value={daysWindow}
                  onChange={(e) => setDaysWindow(Number(e.target.value))}
                  className="w-28"
                />
              </div>
              <div className="flex flex-col">
                <label className="text-sm text-muted-foreground">Montant min (€)</label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={minAmount}
                  onChange={(e) => setMinAmount(Number(e.target.value))}
                  className="w-32"
                />
              </div>
              <Button variant="outline" onClick={fetchAllTransfers} disabled={fetching}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Analyser tous les comptes
              </Button>
              {error && (
                <div className="flex items-center text-destructive text-sm">
                  <AlertTriangle className="h-4 w-4 mr-1" />
                  {error}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Résultats</CardTitle>
            <CardDescription>
              {fetching ? "Analyse en cours…" : `${duplicates.length} groupe(s) de doublons détecté(s).`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {fetching ? (
              <div className="text-sm text-muted-foreground">Chargement des transferts Stripe…</div>
            ) : duplicates.length === 0 ? (
              <div className="text-sm text-muted-foreground">Aucun doublon détecté avec les paramètres actuels.</div>
            ) : (
              <div className="space-y-6">
                {duplicates.map((grp, idx) => (
                  <div key={idx} className="rounded-lg border p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">{grp.destination ?? "Compte inconnu"}</Badge>
                        <Badge variant="outline">{(grp.currency ?? "eur").toUpperCase()}</Badge>
                      </div>
                      <Badge className={grp.reason === "same_id" ? "bg-red-600" : "bg-amber-500"}>
                        {grp.reason === "same_id" ? "ID identiques" : `Montant identique (${daysWindow} j)`}
                      </Badge>
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Transfer ID</TableHead>
                          <TableHead>Montant</TableHead>
                          <TableHead>Devise</TableHead>
                          <TableHead>Compte (destination)</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Description</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {grp.transfers
                          .sort((a, b) => {
                            const ams = typeof a.created === "number" ? a.created : new Date(a.created ?? 0).getTime() / 1000;
                            const bms = typeof b.created === "number" ? b.created : new Date(b.created ?? 0).getTime() / 1000;
                            return (bms ?? 0) - (ams ?? 0);
                          })
                          .map((t) => (
                            <TableRow key={t.id}>
                              <TableCell className="font-mono text-xs">{t.id}</TableCell>
                              <TableCell>{(t.amount ?? 0) / 100} €</TableCell>
                              <TableCell>{(t.currency ?? "eur").toUpperCase()}</TableCell>
                              <TableCell className="font-mono text-xs">{t.destination ?? "-"}</TableCell>
                              <TableCell>
                                {t.created
                                  ? format(
                                      typeof t.created === "number" ? new Date((t.created as number) * 1000) : new Date(t.created as string),
                                      "dd MMM yyyy HH:mm",
                                      { locale: fr }
                                    )
                                  : "-"}
                              </TableCell>
                              <TableCell className="max-w-[300px] truncate">{t.description ?? "-"}</TableCell>
                            </TableRow>
                          ))}
                      </TableBody>
                    </Table>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminStripeDuplicatesPage;