import React, { useMemo, useState } from "react";
import { toast } from "sonner";

import { useSession } from "@/components/SessionContextProvider";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { buildClientErrorPayload, ErrorLoggingContext } from "@/lib/error-logging-api";

type ErrorReportDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  error: Error;
  errorInfo?: { componentStack?: string };
  context?: ErrorLoggingContext;
};

export default function ErrorReportDialog({ open, onOpenChange, error, errorInfo, context }: ErrorReportDialogProps) {
  const { session } = useSession();
  const defaultEmail = session?.user?.email ?? "";

  React.useEffect(() => {
    if (!open) return;
    setEmail(defaultEmail);
  }, [defaultEmail, open]);

  const defaultPayload = useMemo(() => buildClientErrorPayload(error, context, errorInfo), [error, context, errorInfo]);

  const [email, setEmail] = useState("");

  const [description, setDescription] = useState("");

  React.useEffect(() => {
    if (!open) return;
    setDescription(
      `Erreur: ${defaultPayload.message}\n\nMerci de décrire ce que vous étiez en train de faire quand l'erreur est survenue.`
    );
  }, [defaultPayload.message, open]);

  const [sending, setSending] = useState(false);

  const contextText = useMemo(() => {
    const safe = {
      route: defaultPayload.route,
      component: defaultPayload.component,
    };
    return JSON.stringify(safe, null, 2);
  }, [defaultPayload.component, defaultPayload.route]);

  const onSend = async () => {
    setSending(true);
    try {
      const payload = {
        ...defaultPayload,
        user_email: email || null,
        user_description: description || null,
        metadata: {
          ...(defaultPayload.metadata ?? {}),
          kind: "user_report",
        },
      };

      const { error } = await supabase.functions.invoke("log-client-error", {
        body: payload,
      });

      if (error) throw error;

      toast.success("Merci, votre signalement a été envoyé.");
      onOpenChange(false);
    } catch (e: any) {
      toast.error("Impossible d'envoyer le signalement.");
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[620px]">
        <DialogHeader>
          <DialogTitle>Signaler un problème</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="error-report-email">Email</Label>
            <Input
              id="error-report-email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="votre@email.fr"
              inputMode="email"
              autoComplete="email"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="error-report-description">Description</Label>
            <Textarea
              id="error-report-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={6}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="error-report-context">Contexte technique</Label>
            <Textarea id="error-report-context" value={contextText} readOnly rows={4} className="font-mono" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={sending}>
            Annuler
          </Button>
          <Button onClick={onSend} disabled={sending}>
            {sending ? "Envoi…" : "Envoyer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}