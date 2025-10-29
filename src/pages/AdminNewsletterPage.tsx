"use client";

import React, { useState } from "react";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Mail, Send, Loader2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const AdminNewsletterPage: React.FC = () => {
  const [subject, setSubject] = useState("");
  const [html, setHtml] = useState("");
  const [sending, setSending] = useState(false);
  const [testMode, setTestMode] = useState(false);

  const handleSend = async () => {
    if (!subject.trim() || !html.trim()) {
      toast.error("Veuillez renseigner un sujet et un contenu HTML.");
      return;
    }
    setSending(true);
    const { data, error } = await supabase.functions.invoke("send-newsletter", {
      body: { subject, html, testMode },
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
              <Switch id="newsletter-test-mode" checked={testMode} onCheckedChange={setTestMode} />
              <div className="space-y-0.5">
                <Label htmlFor="newsletter-test-mode">Mode test</Label>
                <p className="text-xs text-muted-foreground">
                  Envoie uniquement à thomasleroy80550@gmail.com pour vérification.
                </p>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Sujet</label>
              <Input
                placeholder="Annonce: Nouvelle offre et actualités Hello Keys"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>
            <div>
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium mb-1">Contenu HTML</label>
                <span className="text-xs text-muted-foreground">
                  Vous pouvez coller du HTML formaté (liens, listes, styles inline, etc.)
                </span>
              </div>
              <Textarea
                className="min-h-[280px] font-mono text-sm"
                placeholder="<p>Bonjour,</p><p>Voici nos dernières actualités...</p>"
                value={html}
                onChange={(e) => setHtml(e.target.value)}
              />
            </div>

            <div className="flex items-center justify-end">
              <Button onClick={handleSend} disabled={sending}>
                {sending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Envoi en cours...
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
      </div>
    </AdminLayout>
  );
};

export default AdminNewsletterPage;