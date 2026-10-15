import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PUSH_UPDATE_TEMPLATE } from "@/lib/push-update-template";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { BellRing, Loader2 } from "lucide-react";
import { toast } from "sonner";

type Result = { sent: number; failed: number; expired: number; total: number };

export default function BroadcastPushNotificationCard({ template = PUSH_UPDATE_TEMPLATE }: {
  template?: { subject: string; body: string };
}) {
  const [title, setTitle] = useState(PUSH_UPDATE_TEMPLATE.subject);
  const [message, setMessage] = useState(PUSH_UPDATE_TEMPLATE.body);
  const [link, setLink] = useState("/");
  const [count, setCount] = useState<number | null>(null);
  const [sending, setSending] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  const loadCount = async () => {
    const { count: total, error } = await supabase.from("push_subscriptions")
      .select("id", { count: "exact", head: true });
    if (error) {
      toast.error("Impossible de compter les appareils abonnés.");
      return;
    }
    setCount(total ?? 0);
  };

  useEffect(() => { void loadCount(); }, []);

  const send = async () => {
    if (sending) return;
    setConfirmOpen(false);
    setSending(true);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("push-notifications", {
        body: { action: "broadcast", title: title.trim(), message: message.trim(), link: link.trim() },
      });
      if (error || data?.error) throw new Error(data?.error || error?.message || "Envoi impossible.");
      const summary = data as Result;
      setResult(summary);
      if (summary.failed) toast.warning(`${summary.sent} push accepté(s), ${summary.failed} échec(s).`);
      else if (summary.sent) toast.success(`${summary.sent} push accepté(s) par les services de notification.`);
      else toast.info("Aucun appareil joignable pour cet envoi.");
      await loadCount();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erreur d’envoi.");
      toast.warning("L’envoi peut avoir été partiel. Vérifiez avant de relancer pour éviter les doublons.");
    } finally {
      setSending(false);
    }
  };

  const valid = title.trim() && message.trim() && /^\/(?!\/)/.test(link.trim()) && !/[\\\s]/.test(link.trim());

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><BellRing className="h-5 w-5" />Push à tous les appareils</CardTitle>
        <CardDescription>
          Diffusion à tous les appareils abonnés aux notifications, même lorsque l’application est fermée.
          La PWA doit avoir reçu l’autorisation de notifications. Cet envoi n’ajoute pas de notification dans l’espace client.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">{count === null ? "Chargement des appareils…" : `${count} appareil(s) abonné(s)`}</p>
          <Button variant="outline" disabled={sending} onClick={() => {
            setTitle(template.subject);
            setMessage(template.body);
            setLink("/");
          }}>Utiliser le modèle « Mise à jour »</Button>
        </div>
        <div className="space-y-2">
          <Label htmlFor="broadcast-title">Titre</Label>
          <Input id="broadcast-title" value={title} onChange={e => setTitle(e.target.value)} maxLength={100} disabled={sending} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="broadcast-message">Message</Label>
          <Textarea id="broadcast-message" value={message} onChange={e => setMessage(e.target.value)} maxLength={2000} rows={3} disabled={sending} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="broadcast-link">Page ouverte au clic (lien interne)</Label>
          <Input id="broadcast-link" value={link} onChange={e => setLink(e.target.value)} placeholder="/" disabled={sending} />
        </div>
        {result && <p role="status" className="text-sm">
          {result.sent} push accepté(s) · {result.failed} échec(s) · {result.expired} abonnement(s) expiré(s) retiré(s).
          La réception finale dépend de l’appareil et du réseau.
        </p>}
        <div className="flex justify-end">
          <Button disabled={sending || !valid || count === null || count === 0} onClick={() => setConfirmOpen(true)}>
            {sending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Envoyer à tous les appareils
          </Button>
        </div>
        <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmer l’envoi groupé ?</AlertDialogTitle>
              <AlertDialogDescription>Cette notification sera envoyée à tous les appareils abonnés (actuellement {count}). Cet envoi ne peut pas être annulé.</AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-2 rounded-lg border p-4 break-words"><p className="font-medium">{title}</p><p className="text-sm whitespace-pre-wrap">{message}</p></div>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <Button onClick={send} disabled={sending}>Confirmer l’envoi</Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
