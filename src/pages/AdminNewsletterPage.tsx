"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Mail, Send, Loader2, Eye } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import EmailHtmlEditor from "@/components/EmailHtmlEditor";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import DOMPurify from "dompurify";
import EmailThemePreview from "@/components/EmailThemePreview";
import { buildNewsletterHtml } from "@/components/EmailNewsletterTheme";

const SIX_HOURS_MS = 6 * 60 * 60 * 1000;
const DEFAULT_BATCH_SIZE = 50; // ≈ 30–40 secondes par lot (limite de fonction sûre)

const PLAN_STORAGE_KEY = "newsletterSendPlan";

type NewsletterPlan = {
  subject: string;
  html: string;
  testMode: boolean;
  batchSize: number;
  intervalMs?: number;
  sending: boolean;
  offset?: number;
};

const savePlan = (plan: NewsletterPlan) => {
  try {
    localStorage.setItem(PLAN_STORAGE_KEY, JSON.stringify(plan));
  } catch {}
};

const loadPlan = (): NewsletterPlan | null => {
  try {
    const raw = localStorage.getItem(PLAN_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const clearPlan = () => {
  try {
    localStorage.removeItem(PLAN_STORAGE_KEY);
  } catch {}
};

const AdminNewsletterPage: React.FC = () => {
  const [subject, setSubject] = useState("");
  const [html, setHtml] = useState("");
  const sanitizedHtml = useMemo(() => DOMPurify.sanitize(html), [html]);
  const themedHtml = useMemo(
    () => buildNewsletterHtml({ subject: subject || "Newsletter", bodyHtml: sanitizedHtml }),
    [subject, sanitizedHtml]
  );
  const [sending, setSending] = useState(false);
  const [testMode, setTestMode] = useState(false);

  // Nouveau: étalement
  const [spreadMode, setSpreadMode] = useState(true);
  const [offset, setOffset] = useState(0);
  const [totalRemaining, setTotalRemaining] = useState<number | null>(null);
  const [batchSize, setBatchSize] = useState<number>(DEFAULT_BATCH_SIZE);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  // AJOUT: reprise automatique d'un plan si présent dans le stockage local
  useEffect(() => {
    const plan = loadPlan();
    if (!plan || !plan.sending) return;

    // Réhydrate l'UI
    setSubject(plan.subject);
    setHtml(plan.html);
    setTestMode(plan.testMode);
    setSpreadMode(true);
    setBatchSize(plan.batchSize);

    // Démarre/reprend le plan
    startSpreadPlan(plan);
  }, []);

  // AJOUT: fonction centralisée pour démarrer/reprendre un plan étalé
  const startSpreadPlan = async (plan: NewsletterPlan) => {
    if (!plan.subject.trim() || !plan.html.trim()) {
      toast.error("Veuillez renseigner un sujet et un contenu HTML.");
      return;
    }

    setSending(true);

    // 1) Preview pour connaître le volume restant
    const previewRes = await supabase.functions.invoke("send-newsletter", {
      body: { subject: plan.subject, html: buildNewsletterHtml({ subject: plan.subject || "Newsletter", bodyHtml: DOMPurify.sanitize(plan.html) }), testMode: plan.testMode, previewOnly: true },
    });

    if (previewRes.error) {
      setSending(false);
      clearPlan();
      toast.error(`Erreur (preview): ${previewRes.error.message}`);
      return;
    }

    const remaining = Number(previewRes.data?.totalRemaining ?? 0);
    setTotalRemaining(remaining);

    if (remaining <= 0) {
      setSending(false);
      clearPlan();
      toast.success("Aucun destinataire restant pour cette campagne (déjà envoyé ou aucun email).");
      return;
    }

    // 2) Calcul des lots et intervalle (ou reprise si interval stocké)
    const lots = Math.ceil(remaining / plan.batchSize);
    const intervalMs = Math.max(Math.floor(SIX_HOURS_MS / lots), 10_000);
    const effectiveInterval = plan.intervalMs ?? intervalMs;

    // Sauvegarde du plan
    savePlan({ ...plan, intervalMs: effectiveInterval, sending: true, offset: 0 });
    setOffset(0);

    // 3) Fonction d'envoi d'un lot (reprend à chaque passage)
    const sendBatch = async () => {
      const themed = buildNewsletterHtml({ subject: plan.subject || "Newsletter", bodyHtml: DOMPurify.sanitize(plan.html) });

      const { data, error } = await supabase.functions.invoke("send-newsletter", {
        body: {
          subject: plan.subject,
          html: themed,
          testMode: plan.testMode,
          previewOnly: false,
          maxEmails: plan.batchSize,
        },
      });

      if (error) {
        toast.error(`Erreur lors de l'envoi d'un lot: ${error.message}`);
        setSending(false);
        clearPlan();
        return;
      }

      const sent = Number(data?.sent ?? 0);
      const failed = Number(data?.failed ?? 0);
      const remainingLeft = Number(data?.totalRemaining ?? 0);

      // Mise à jour progression locale et plan persistant
      setOffset((prev) => {
        const next = prev + sent;
        savePlan({ ...plan, intervalMs: effectiveInterval, sending: true, offset: next });
        return next;
      });

      toast.success(`Lot envoyé: ${sent} succès, ${failed} échecs. Restant: ${remainingLeft}`);

      setTotalRemaining(remainingLeft);

      if (remainingLeft <= 0) {
        setSending(false);
        clearPlan();
        toast.success("Newsletter terminée. Tous les lots ont été envoyés.");
        return;
      }

      timerRef.current = window.setTimeout(() => {
        sendBatch();
      }, effectiveInterval);
    };

    // Premier lot immédiat
    await sendBatch();
  };

  // AJOUT: annuler proprement le plan
  const cancelPlan = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setSending(false);
    clearPlan();
    setTotalRemaining(null);
    setOffset(0);
    toast.info("Plan d'envoi annulé. Vous pourrez le reprendre plus tard.");
  };

  const handleSendImmediate = async () => {
    setSending(true);
    const { data, error } = await supabase.functions.invoke("send-newsletter", {
      body: { subject, html: themedHtml, testMode },
    });
    setSending(false);

    if (error) {
      toast.error(`Erreur lors de l'envoi: ${error.message}`);
      return;
    }

    const sent = data?.sent ?? 0;
    const failed = data?.failed ?? 0;
    toast.success(`Newsletter envoyée: ${sent} emails envoyés, ${failed} en échec.`);
  };

  const handleSendSpread = async () => {
    if (!subject.trim() || !html.trim()) {
      toast.error("Veuillez renseigner un sujet et un contenu HTML.");
      return;
    }

    // Démarre un nouveau plan (la logique est dans startSpreadPlan)
    const plan: NewsletterPlan = {
      subject,
      html,
      testMode,
      batchSize,
      sending: true,
    };
    await startSpreadPlan(plan);
  };

  const handleSend = async () => {
    if (!subject.trim() || !html.trim()) {
      toast.error("Veuillez renseigner un sujet et un contenu HTML.");
      return;
    }
    if (spreadMode) {
      await handleSendSpread();
    } else {
      await handleSendImmediate();
    }
  };

  return (
    <AdminLayout>
      <div className="container mx-auto py-6">
        <div className="flex items-center gap-2 mb-6">
          <Mail className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Newsletter</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Envoyer une newsletter</CardTitle>
            <CardDescription>
              Rédigez votre message et envoyez-le à toutes les adresses email de vos clients (profils).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3 rounded-md border bg-muted/30 px-3 py-2">
              <Switch id="newsletter-spread-mode" checked={spreadMode} onCheckedChange={setSpreadMode} />
              <div className="space-y-0.5">
                <Label htmlFor="newsletter-spread-mode">Étalement sur 6 heures</Label>
                <p className="text-xs text-muted-foreground">
                  Envoie par lots espacés sur ~6h pour éviter les limites de Resend.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-md border bg-muted/30 px-3 py-2">
              <Switch id="newsletter-test-mode" checked={testMode} onCheckedChange={setTestMode} />
              <div className="space-y-0.5">
                <Label htmlFor="newsletter-test-mode">Mode test</Label>
                <p className="text-xs text-muted-foreground">
                  Envoie uniquement à thomasleroy80550@gmail.com pour vérification.
                </p>
              </div>
            </div>

            {spreadMode && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-md border bg-muted/30 px-3 py-2">
                <div>
                  <Label htmlFor="batch-size" className="block text-sm font-medium mb-1">Taille d'un lot</Label>
                  <Input
                    id="batch-size"
                    type="number"
                    min={10}
                    max={500}
                    value={batchSize}
                    onChange={(e) => setBatchSize(Math.max(10, Math.min(500, Number(e.target.value || DEFAULT_BATCH_SIZE))))}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Nombre d'emails par lot (50 recommandé).
                  </p>
                </div>
                <div className="flex items-end">
                  <div className="text-xs text-muted-foreground">
                    {totalRemaining !== null ? (
                      <span>Destinataires restants (preview): {totalRemaining}</span>
                    ) : (
                      <span>Prévisualisez pour estimer le volume à envoyer.</span>
                    )}
                  </div>
                </div>
              </div>
            )}

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
              {sending && spreadMode && (
                <Button variant="secondary" onClick={cancelPlan}>
                  Annuler le plan
                </Button>
              )}
              <Button onClick={handleSend} disabled={sending}>
                {sending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {spreadMode ? "Envoi étalé en cours..." : "Envoi en cours..."}
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    {spreadMode ? "Planifier l'envoi sur 6h" : (testMode ? "Envoyer l'email de test" : "Envoyer à tous les clients")}
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminNewsletterPage;