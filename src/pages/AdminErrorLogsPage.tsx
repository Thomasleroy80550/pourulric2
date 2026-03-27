import React, { useEffect, useMemo, useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Copy, Loader2, Sparkles, Trash2 } from "lucide-react";

type ErrorLogRow = {
  id: string;
  created_at: string;
  user_id: string | null;
  route: string | null;
  component: string | null;
  message: string;
  stack: string | null;
  user_email: string | null;
  user_description: string | null;
  metadata: any;
};

type ErrorAnalysis = {
  summary: string;
  probable_causes: string[];
  recommended_fix: string;
  verification_steps: string[];
  browser_specific: boolean;
};

function getBrowserLabel(metadata: any): string {
  const userAgent = typeof metadata?.userAgent === "string" ? metadata.userAgent : "";
  if (!userAgent) return "—";

  if (userAgent.includes("Edg/")) return "Edge";
  if (userAgent.includes("OPR/") || userAgent.includes("Opera")) return "Opera";
  if (userAgent.includes("Firefox/")) return "Firefox";
  if (userAgent.includes("Chrome/") && !userAgent.includes("Edg/") && !userAgent.includes("OPR/")) return "Chrome";
  if (userAgent.includes("Safari/") && !userAgent.includes("Chrome/")) return "Safari";

  return "Autre";
}

function buildAnalysisCopyText(row: ErrorLogRow, analysis: ErrorAnalysis) {
  return [
    `Erreur: ${row.message}`,
    `Route: ${row.route || "N/A"}`,
    `Composant: ${row.component || "N/A"}`,
    `Navigateur: ${getBrowserLabel(row.metadata)}`,
    "",
    `Résumé: ${analysis.summary}`,
    "",
    "Causes probables:",
    ...(analysis.probable_causes.length > 0 ? analysis.probable_causes.map((cause) => `- ${cause}`) : ["- Aucune cause proposée"]),
    "",
    "Correction recommandée:",
    analysis.recommended_fix,
    "",
    "Étapes de vérification:",
    ...(analysis.verification_steps.length > 0 ? analysis.verification_steps.map((step) => `- ${step}`) : ["- Aucune étape proposée"]),
  ].join("\n");
}

export default function AdminErrorLogsPage() {
  const [rows, setRows] = useState<ErrorLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<ErrorLogRow | null>(null);
  const [clearing, setClearing] = useState(false);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [analysisById, setAnalysisById] = useState<Record<string, ErrorAnalysis>>({});

  const load = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("error_logs")
        .select("id, created_at, user_id, route, component, message, stack, user_email, user_description, metadata")
        .order("created_at", { ascending: false })
        .limit(200);

      if (error) throw error;
      setRows((data ?? []) as ErrorLogRow[]);
    } catch (e: any) {
      toast.error("Impossible de charger les signalements.");
    } finally {
      setLoading(false);
    }
  };

  const clearAll = async () => {
    setClearing(true);
    try {
      const { error } = await supabase.functions.invoke("clear-error-logs");
      if (error) throw error;

      setSelected(null);
      setAnalysisById({});
      toast.success("Signalements supprimés.");
      await load();
    } catch (e: any) {
      toast.error("Impossible de supprimer les signalements.");
    } finally {
      setClearing(false);
    }
  };

  const deleteLog = async (id: string) => {
    console.log("[AdminErrorLogs] Tentative de suppression du log:", id);
    try {
      const { error } = await supabase.from("error_logs").delete().eq("id", id);
      if (error) {
        console.error("[AdminErrorLogs] Erreur lors de la suppression:", error);
        throw error;
      }

      if (selected?.id === id) setSelected(null);
      setAnalysisById((current) => {
        const next = { ...current };
        delete next[id];
        return next;
      });
      console.log("[AdminErrorLogs] Suppression réussie");
      toast.success("Signalement supprimé.");
      await load();
    } catch (e: any) {
      console.error("[AdminErrorLogs] Exception:", e);
      toast.error("Impossible de supprimer le signalement.");
    }
  };

  const copyError = (row: ErrorLogRow) => {
    const text = `Message: ${row.message}\n\nRoute: ${row.route || "N/A"}\nComposant: ${row.component || "N/A"}\nNavigateur: ${getBrowserLabel(row.metadata)}\nUser Email: ${row.user_email || "N/A"}\nDescription: ${row.user_description || "N/A"}\n\nStack:\n${row.stack || "N/A"}`;
    navigator.clipboard.writeText(text);
    toast.success("Erreur copiée dans le presse-papier");
  };

  const analyzeError = async (row: ErrorLogRow) => {
    setAnalyzingId(row.id);
    try {
      const { data, error } = await supabase.functions.invoke("analyze-error-log", {
        body: {
          route: row.route,
          component: row.component,
          message: row.message,
          stack: row.stack,
          metadata: row.metadata,
          user_email: row.user_email,
          user_description: row.user_description,
        },
      });

      if (error) throw error;

      const analysis = data as ErrorAnalysis;
      setAnalysisById((current) => ({ ...current, [row.id]: analysis }));
      toast.success("Analyse générée.");
    } catch (e: any) {
      toast.error("Impossible d’analyser cette erreur.");
    } finally {
      setAnalyzingId(null);
    }
  };

  const copyAnalysis = (row: ErrorLogRow, analysis: ErrorAnalysis) => {
    navigator.clipboard.writeText(buildAnalysisCopyText(row, analysis));
    toast.success("Analyse copiée dans le presse-papier");
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      return (
        (r.route ?? "").toLowerCase().includes(q) ||
        (r.component ?? "").toLowerCase().includes(q) ||
        (r.message ?? "").toLowerCase().includes(q) ||
        (r.user_email ?? "").toLowerCase().includes(q) ||
        (r.user_description ?? "").toLowerCase().includes(q) ||
        getBrowserLabel(r.metadata).toLowerCase().includes(q)
      );
    });
  }, [query, rows]);

  const selectedAnalysis = selected ? analysisById[selected.id] : null;

  return (
    <AdminLayout>
      <div className="space-y-4">
        <Card>
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>Signalements (erreurs applicatives)</CardTitle>
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Filtrer (route, composant, message, email, navigateur…)"
                className="sm:w-[360px]"
              />
              <Button variant="outline" onClick={load} disabled={loading || clearing}>
                {loading ? "Chargement…" : "Rafraîchir"}
              </Button>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" disabled={loading || clearing || rows.length === 0}>
                    {clearing ? "Suppression…" : "Tout effacer"}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Supprimer tous les signalements ?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Cette action est irréversible. Utile pour vérifier si les erreurs réapparaissent.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={clearing}>Annuler</AlertDialogCancel>
                    <AlertDialogAction onClick={clearAll} disabled={clearing}>
                      Supprimer
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-3 text-sm text-muted-foreground">
              {loading ? "Chargement…" : `${filtered.length} / ${rows.length} (derniers 200)`}
            </div>

            <div className="overflow-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Route</TableHead>
                    <TableHead>Composant</TableHead>
                    <TableHead>Navigateur</TableHead>
                    <TableHead>Message</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="whitespace-nowrap">
                        {new Date(r.created_at).toLocaleString("fr-FR")}
                      </TableCell>
                      <TableCell className="max-w-[220px] truncate" title={r.route ?? ""}>
                        {r.route ? <Badge variant="secondary">{r.route}</Badge> : <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="max-w-[220px] truncate" title={r.component ?? ""}>
                        {r.component ?? <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <Badge variant="outline">{getBrowserLabel(r.metadata)}</Badge>
                      </TableCell>
                      <TableCell className="max-w-[520px] truncate" title={r.message}>
                        {r.message}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="outline" size="icon" onClick={() => copyError(r)} title="Copier l'erreur">
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => setSelected(r)}>
                            Détails
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" title="Supprimer">
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Supprimer ce signalement ?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Cette action est irréversible. Le signalement sera définitivement supprimé.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Annuler</AlertDialogCancel>
                                <AlertDialogAction onClick={() => deleteLog(r.id)}>
                                  Supprimer
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}

                  {!loading && filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                        Aucun résultat.
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Dialog open={!!selected} onOpenChange={(open) => (!open ? setSelected(null) : undefined)}>
          <DialogContent className="sm:max-w-[820px]">
            <DialogHeader>
              <DialogTitle>Détails du signalement</DialogTitle>
            </DialogHeader>

            {selected ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
                  <div>
                    <div className="text-muted-foreground">Date</div>
                    <div>{new Date(selected.created_at).toLocaleString("fr-FR")}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">User ID</div>
                    <div className="font-mono text-xs break-all">{selected.user_id ?? "—"}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Route</div>
                    <div className="font-mono text-xs break-all">{selected.route ?? "—"}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Composant</div>
                    <div className="font-mono text-xs break-all">{selected.component ?? "—"}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Navigateur</div>
                    <div>{getBrowserLabel(selected.metadata)}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Email (si fourni)</div>
                    <div className="font-mono text-xs break-all">{selected.user_email ?? "—"}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">ID</div>
                    <div className="font-mono text-xs break-all">{selected.id}</div>
                  </div>
                </div>

                <div>
                  <div className="mb-1 text-sm text-muted-foreground">Message</div>
                  <div className="rounded-md border bg-background/50 p-3 text-sm">{selected.message}</div>
                </div>

                <div className="rounded-lg border bg-muted/20 p-4 space-y-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="flex items-center gap-2 font-medium">
                        <Sparkles className="h-4 w-4" />
                        Analyse & correction suggérée
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Génère une analyse de cause probable et une proposition de correction directement dans l’app.
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        onClick={() => analyzeError(selected)}
                        disabled={analyzingId === selected.id}
                      >
                        {analyzingId === selected.id ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Analyse…
                          </>
                        ) : selectedAnalysis ? (
                          "Relancer l’analyse"
                        ) : (
                          "Analyser l’erreur"
                        )}
                      </Button>
                      {selectedAnalysis ? (
                        <Button variant="outline" onClick={() => copyAnalysis(selected, selectedAnalysis)}>
                          <Copy className="mr-2 h-4 w-4" />
                          Copier l’analyse
                        </Button>
                      ) : null}
                    </div>
                  </div>

                  {selectedAnalysis ? (
                    <div className="space-y-4">
                      <div className="flex flex-wrap gap-2">
                        <Badge variant={selectedAnalysis.browser_specific ? "destructive" : "secondary"}>
                          {selectedAnalysis.browser_specific ? "Possiblement lié au navigateur" : "Pas spécifiquement lié au navigateur"}
                        </Badge>
                      </div>

                      <div>
                        <div className="mb-1 text-sm text-muted-foreground">Résumé</div>
                        <div className="rounded-md border bg-background p-3 text-sm whitespace-pre-wrap">
                          {selectedAnalysis.summary}
                        </div>
                      </div>

                      <div>
                        <div className="mb-2 text-sm text-muted-foreground">Causes probables</div>
                        <ul className="list-disc space-y-1 pl-5 text-sm">
                          {selectedAnalysis.probable_causes.map((cause, index) => (
                            <li key={`${selected.id}-cause-${index}`}>{cause}</li>
                          ))}
                        </ul>
                      </div>

                      <div>
                        <div className="mb-1 text-sm text-muted-foreground">Correction recommandée</div>
                        <div className="rounded-md border bg-background p-3 text-sm whitespace-pre-wrap">
                          {selectedAnalysis.recommended_fix}
                        </div>
                      </div>

                      <div>
                        <div className="mb-2 text-sm text-muted-foreground">Vérifications après correction</div>
                        <ul className="list-disc space-y-1 pl-5 text-sm">
                          {selectedAnalysis.verification_steps.map((step, index) => (
                            <li key={`${selected.id}-step-${index}`}>{step}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ) : null}
                </div>

                {selected.user_description ? (
                  <div>
                    <div className="mb-1 text-sm text-muted-foreground">Description utilisateur</div>
                    <div className="rounded-md border bg-background/50 p-3 text-sm whitespace-pre-wrap">{selected.user_description}</div>
                  </div>
                ) : null}

                {selected.stack ? (
                  <div>
                    <div className="mb-1 text-sm text-muted-foreground">Stack</div>
                    <pre className="max-h-64 overflow-auto rounded-md border bg-background/50 p-3 text-xs whitespace-pre-wrap">
                      {selected.stack}
                    </pre>
                  </div>
                ) : null}

                {selected.metadata ? (
                  <div>
                    <div className="mb-1 text-sm text-muted-foreground">Metadata</div>
                    <pre className="max-h-64 overflow-auto rounded-md border bg-background/50 p-3 text-xs whitespace-pre-wrap">
                      {JSON.stringify(selected.metadata, null, 2)}
                    </pre>
                  </div>
                ) : null}
              </div>
            ) : null}
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
