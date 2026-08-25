"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Mail, Send, Loader2, Eye, History, RefreshCcw, Copy, Save, XCircle, CheckCircle2, Server, Sparkles, Wand2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import EmailHtmlEditor from "@/components/EmailHtmlEditor";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import DOMPurify from "dompurify";
import EmailThemePreview from "@/components/EmailThemePreview";
import { buildNewsletterHtml } from "@/components/EmailNewsletterTheme";
import {
  listCampaigns,
  createCampaign,
  duplicateCampaign,
  getDeliveryCount,
  enqueueNewsletter,
  cancelQueuedCampaign,
  getQueueProgress,
  listSendingCampaigns,
  type NewsletterCampaign,
  type QueueProgress,
} from "@/lib/newsletter-api";

const DRAFT_STORAGE_KEY = "newsletterDraftV1";
const POLL_INTERVAL_MS = 15_000;

type ActiveCampaign = {
  campaign: NewsletterCampaign;
  progress: QueueProgress;
};

const AdminNewsletterPage: React.FC = () => {
  const [subject, setSubject] = useState("");
  const [html, setHtml] = useState("");
  const sanitizedHtml = useMemo(() => DOMPurify.sanitize(html), [html]);
  const themedHtml = useMemo(
    () => buildNewsletterHtml({ subject: subject || "Newsletter", bodyHtml: sanitizedHtml }),
    [subject, sanitizedHtml]
  );
  const [submitting, setSubmitting] = useState(false);
  const [testMode, setTestMode] = useState(false);

  // Rédaction IA
  const [aiBrief, setAiBrief] = useState("");
  const [aiTone, setAiTone] = useState("chaleureux");
  const [aiLoading, setAiLoading] = useState(false);

  // Campagnes en cours d'envoi (file serveur)
  const [activeCampaigns, setActiveCampaigns] = useState<ActiveCampaign[]>([]);
  const pollRef = useRef<number | null>(null);

  // Historique des campagnes
  const [campaigns, setCampaigns] = useState<NewsletterCampaign[]>([]);
  const [loadingCampaigns, setLoadingCampaigns] = useState(false);
  const [counts, setCounts] = useState<Record<string, number>>({});

  // Restauration du brouillon
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (raw) {
        const d = JSON.parse(raw);
        if (typeof d.subject === "string") setSubject(d.subject);
        if (typeof d.html === "string") setHtml(d.html);
        if (typeof d.testMode === "boolean") setTestMode(d.testMode);
      }
    } catch {}
  }, []);

  // Sauvegarde auto du brouillon
  useEffect(() => {
    const t = window.setTimeout(() => {
      try {
        localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify({ subject, html, testMode, updatedAt: Date.now() }));
      } catch {}
    }, 300);
    return () => window.clearTimeout(t);
  }, [subject, html, testMode]);

  const loadCampaigns = async () => {
    setLoadingCampaigns(true);
    try {
      const list = await listCampaigns(50);
      setCampaigns(list);
      const top = list.slice(0, 20);
      const entries = await Promise.all(top.map(async (c) => {
        const ct = await getDeliveryCount(c.content_hash);
        return [c.content_hash, ct] as const;
      }));
      const nextCounts: Record<string, number> = {};
      for (const [hash, ct] of entries) nextCounts[hash] = ct;
      setCounts(nextCounts);
    } finally {
      setLoadingCampaigns(false);
    }
  };

  // Suivi des campagnes en cours (le serveur envoie tout seul, on ne fait que lire la progression)
  const refreshActiveCampaigns = async () => {
    try {
      const sending = await listSendingCampaigns();
      const withProgress = await Promise.all(sending.map(async (campaign) => ({
        campaign,
        progress: await getQueueProgress(campaign.id),
      })));
      setActiveCampaigns(withProgress);
      if (withProgress.length === 0 && pollRef.current) {
        // Plus rien en cours : recharger l'historique une dernière fois
        loadCampaigns().catch(() => {});
      }
    } catch {
      // silencieux: simple polling
    }
  };

  useEffect(() => {
    loadCampaigns().catch(() => setLoadingCampaigns(false));
    refreshActiveCampaigns();
    pollRef.current = window.setInterval(refreshActiveCampaigns, POLL_INTERVAL_MS);
    return () => {
      if (pollRef.current) window.clearInterval(pollRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleGenerateWithAi = async (improveExisting: boolean) => {
    if (!aiBrief.trim() || aiBrief.trim().length < 5) {
      toast.error("Décrivez le sujet de la newsletter (quelques mots minimum).");
      return;
    }
    if (improveExisting && !html.trim()) {
      toast.error("Aucun contenu existant à améliorer.");
      return;
    }
    setAiLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-newsletter", {
        body: {
          brief: aiBrief,
          tone: aiTone,
          existingHtml: improveExisting ? html : undefined,
        },
      });
      if (error) throw error;
      if (data?.subject) setSubject(data.subject);
      if (data?.html) setHtml(data.html);
      toast.success("Newsletter rédigée par l'IA. Relisez et ajustez avant l'envoi !");
    } catch (e: any) {
      toast.error(`Erreur IA: ${e?.message || e}`);
    } finally {
      setAiLoading(false);
    }
  };

  const handleSend = async () => {
    if (!subject.trim() || !html.trim()) {
      toast.error("Veuillez renseigner un sujet et un contenu HTML.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await enqueueNewsletter(subject, themedHtml, testMode, undefined, html);
      if (res.queued === 0) {
        toast.info("Aucun destinataire restant pour cette campagne (déjà envoyée ou aucun email).");
      } else if (testMode) {
        toast.success("Email de test mis en file. Il sera envoyé dans la minute.");
      } else {
        toast.success(
          `Campagne mise en file: ${res.queued} destinataires. Envoi automatique par le serveur (~${res.estimatedMinutes ?? "?"} min). Vous pouvez fermer cette page.`
        );
      }
      await refreshActiveCampaigns();
      await loadCampaigns();
    } catch (e: any) {
      toast.error(`Erreur lors de la mise en file: ${e?.message || e}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async (campaignId: string) => {
    try {
      await cancelQueuedCampaign(campaignId);
      toast.info("Campagne annulée. Les emails restants ne seront pas envoyés.");
      await refreshActiveCampaigns();
      await loadCampaigns();
    } catch (e: any) {
      toast.error(`Erreur lors de l'annulation: ${e?.message || e}`);
    }
  };

  const handleSaveDraft = async () => {
    if (!subject.trim() || !html.trim()) {
      toast.error("Veuillez renseigner un sujet et un contenu HTML.");
      return;
    }
    await createCampaign(subject, html, "draft");
    toast.success("Campagne enregistrée.");
    await loadCampaigns();
  };

  const handleLoadCampaign = (c: NewsletterCampaign) => {
    setSubject(c.subject);
    setHtml(c.raw_html ?? c.html);
    toast.success("Campagne chargée dans l'éditeur.");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDuplicateCampaign = async (c: NewsletterCampaign) => {
    const dup = await duplicateCampaign(c);
    toast.success("Campagne dupliquée.");
    await loadCampaigns();
    handleLoadCampaign(dup);
  };

  const handleContinueSending = async (c: NewsletterCampaign) => {
    setSubmitting(true);
    try {
      // Reconstruire le HTML thémé comme lors de l'envoi original :
      // le hash identique garantit qu'aucun email déjà servi ne sera renvoyé
      const source = c.raw_html ?? c.html;
      const themed = buildNewsletterHtml({
        subject: c.subject || "Newsletter",
        bodyHtml: DOMPurify.sanitize(source),
      });
      const res = await enqueueNewsletter(c.subject, themed, false, c.id, source);
      if (res.queued === 0) {
        toast.info("Tous les destinataires ont déjà reçu cette campagne.");
      } else {
        toast.success(`Reprise: ${res.queued} destinataires restants mis en file.`);
      }
      await refreshActiveCampaigns();
      await loadCampaigns();
    } catch (e: any) {
      toast.error(`Erreur: ${e?.message || e}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AdminLayout>
      <div className="container mx-auto py-6">
        <div className="flex items-center gap-2 mb-6">
          <Mail className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Newsletter</h1>
        </div>

        {/* Campagnes en cours d'envoi */}
        {activeCampaigns.length > 0 && (
          <Card className="mb-6 border-primary/40">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Server className="h-5 w-5 text-primary" />
                <CardTitle>Envoi en cours (côté serveur)</CardTitle>
              </div>
              <CardDescription>
                L'envoi est géré automatiquement par le serveur (≈100 emails/minute). Vous pouvez fermer cette page sans interrompre l'envoi.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {activeCampaigns.map(({ campaign, progress }) => {
                const done = progress.sent + progress.failed + progress.cancelled;
                const pct = progress.total > 0 ? Math.round((done / progress.total) * 100) : 0;
                return (
                  <div key={campaign.id} className="rounded-md border p-3 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-medium truncate">{campaign.subject}</div>
                      <Button size="sm" variant="destructive" onClick={() => handleCancel(campaign.id)}>
                        <XCircle className="h-4 w-4 mr-1" /> Annuler
                      </Button>
                    </div>
                    <Progress value={pct} />
                    <div className="text-xs text-muted-foreground">
                      {progress.sent} envoyés • {progress.pending} en attente
                      {progress.failed > 0 && <> • <span className="text-destructive">{progress.failed} échecs</span></>}
                      {progress.cancelled > 0 && <> • {progress.cancelled} annulés</>}
                      {" "}• {pct}%
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Envoyer une newsletter</CardTitle>
            <CardDescription>
              Rédigez votre message et envoyez-le à toutes les adresses email de vos clients (profils).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertTitle>Envoi fiable et automatique</AlertTitle>
              <AlertDescription className="text-sm">
                Les emails sont mis en file d'attente et envoyés par le serveur à un rythme respectant les limites de Resend
                (lots de 25 via l'API batch, ≈100 emails/minute). Chaque échec est réessayé 3 fois et un même contenu n'est
                jamais envoyé deux fois à la même adresse. Vous pouvez fermer votre navigateur, l'envoi continue.
              </AlertDescription>
            </Alert>

            <div className="flex items-center gap-3 rounded-md border bg-muted/30 px-3 py-2">
              <Switch id="newsletter-test-mode" checked={testMode} onCheckedChange={setTestMode} />
              <div className="space-y-0.5">
                <Label htmlFor="newsletter-test-mode">Mode test</Label>
                <p className="text-xs text-muted-foreground">
                  Envoie uniquement à thomasleroy80550@gmail.com pour vérification.
                </p>
              </div>
            </div>

            {/* Rédaction IA */}
            <div className="rounded-md border border-violet-200 bg-violet-50/50 dark:border-violet-900 dark:bg-violet-950/20 px-3 py-3 space-y-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-violet-600" />
                <span className="text-sm font-medium">Rédaction assistée par IA</span>
              </div>
              <Textarea
                placeholder="Décrivez le contenu souhaité, ex: Annoncer les nouveautés de l'été 2025 : mini-sites personnalisés, suivi conso en temps réel, et rappeler l'offre parrainage..."
                value={aiBrief}
                onChange={(e) => setAiBrief(e.target.value)}
                className="min-h-[80px] bg-background"
                disabled={aiLoading}
              />
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <Select value={aiTone} onValueChange={setAiTone} disabled={aiLoading}>
                  <SelectTrigger className="w-full sm:w-[220px] bg-background">
                    <SelectValue placeholder="Ton" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="chaleureux">Ton chaleureux</SelectItem>
                    <SelectItem value="professionnel">Ton professionnel</SelectItem>
                    <SelectItem value="commercial">Ton commercial</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex items-center gap-2 sm:ml-auto">
                  <Button
                    variant="outline"
                    onClick={() => handleGenerateWithAi(true)}
                    disabled={aiLoading || !html.trim()}
                  >
                    {aiLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
                    Améliorer le contenu actuel
                  </Button>
                  <Button onClick={() => handleGenerateWithAi(false)} disabled={aiLoading}>
                    {aiLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                    Rédiger avec l'IA
                  </Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                L'IA remplit automatiquement le sujet et le contenu ci-dessous. Relisez toujours avant d'envoyer.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Sujet</label>
              <Input
                placeholder="Annonce: Nouvelle offre et actualités Hello Keys"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium mb-1">Contenu de l'email</label>
                <span className="text-xs text-muted-foreground">
                  Composez en mode visuel ou éditez le HTML brut si besoin.
                </span>
              </div>
              <Tabs defaultValue="visual" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="visual">Éditeur visuel</TabsTrigger>
                  <TabsTrigger value="html">HTML brut</TabsTrigger>
                </TabsList>
                <TabsContent value="visual">
                  <EmailHtmlEditor
                    value={html}
                    onChange={setHtml}
                    className="min-h-[280px]"
                  />
                </TabsContent>
                <TabsContent value="html">
                  <Textarea
                    className="min-h-[280px] font-mono text-xs"
                    placeholder="<p>Bonjour,</p><p>Voici nos dernières actualités...</p>"
                    value={html}
                    onChange={(e) => setHtml(e.target.value)}
                  />
                </TabsContent>
              </Tabs>
              <div className="rounded-lg border bg-muted/20 p-4 space-y-4">
                <div className="flex items-center gap-2">
                  <Eye className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Aperçu du contenu brut (rendu HTML)</span>
                </div>
                <div
                  className="prose prose-sm max-w-none prose-headings:mt-3 prose-p:my-2 prose-ul:my-2 prose-ol:my-2"
                  dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
                />
                <div className="flex items-center gap-2 mt-6">
                  <Eye className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Aperçu avec thème (version envoyée)</span>
                </div>
                <EmailThemePreview subject={subject || "Newsletter"} rawHtml={html} />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2">
              <Button variant="secondary" onClick={handleSaveDraft} disabled={submitting}>
                <Save className="mr-2 h-4 w-4" />
                Enregistrer comme brouillon
              </Button>
              <Button onClick={handleSend} disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Mise en file...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    {testMode ? "Envoyer l'email de test" : "Envoyer à tous les clients"}
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Historique des campagnes */}
        <Card className="mt-6">
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="h-5 w-5 text-primary" />
              <div>
                <CardTitle>Historique des campagnes</CardTitle>
                <CardDescription>Chargez, dupliquez ou poursuivez un envoi existant.</CardDescription>
              </div>
            </div>
            <Button variant="outline" onClick={() => loadCampaigns()}>
              <RefreshCcw className="h-4 w-4 mr-2" />
              Rafraîchir
            </Button>
          </CardHeader>
          <CardContent>
            {loadingCampaigns ? (
              <div className="text-sm text-muted-foreground">Chargement de l'historique…</div>
            ) : campaigns.length === 0 ? (
              <div className="text-sm text-muted-foreground">Aucune campagne pour le moment.</div>
            ) : (
              <div className="space-y-3">
                {campaigns.map((c) => (
                  <div key={c.id} className="flex flex-col sm:flex-row sm:items-center gap-2 justify-between rounded-md border p-3">
                    <div className="min-w-0">
                      <div className="font-medium truncate">{c.subject}</div>
                      <div className="text-xs text-muted-foreground">
                        Créée le {new Date(c.created_at).toLocaleString()} • Statut: {c.status}
                        {typeof counts[c.content_hash] !== "undefined" && (
                          <> • Envoyés: {counts[c.content_hash]}</>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button size="sm" variant="secondary" onClick={() => handleLoadCampaign(c)}>
                        Charger
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleDuplicateCampaign(c)}>
                        <Copy className="h-4 w-4 mr-1" /> Dupliquer
                      </Button>
                      {c.status !== "sending" && (
                        <Button size="sm" onClick={() => handleContinueSending(c)} disabled={submitting}>
                          <Send className="h-4 w-4 mr-1" /> Continuer l'envoi
                        </Button>
                      )}
                    </div>
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

export default AdminNewsletterPage;
