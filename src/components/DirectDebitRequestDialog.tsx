import React, { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/components/SessionContextProvider";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const schema = z.object({
  fullName: z.string().min(2, "Nom requis"),
  email: z.string().email("Email invalide"),
  phone: z.string().optional(),
  propertyRef: z.string().min(2, "Référence logement/propriétaire requise"),
  message: z.string().min(10, "Merci de préciser votre demande (min. 10 caractères)"),
});

type Values = z.infer<typeof schema>;

function escapeHtml(input: string) {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export default function DirectDebitRequestDialog() {
  const { session } = useSession();
  const defaultEmail = session?.user?.email ?? "";

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      fullName: "",
      email: defaultEmail,
      phone: "",
      propertyRef: "",
      message: "Bonjour, je souhaite mettre en place un prélèvement bancaire pour mes factures propriétaire.",
    },
  });

  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);

  const subject = useMemo(() => "Demande de mise en place du prélèvement bancaire (factures propriétaire)", []);

  React.useEffect(() => {
    if (!open) return;
    form.setValue("email", defaultEmail);
  }, [defaultEmail, form, open]);

  const onSubmit = async (values: Values) => {
    setSending(true);
    try {
      const html = `
        <div>
          <h2>Demande de mise en place du prélèvement bancaire</h2>
          <p><strong>Nom :</strong> ${escapeHtml(values.fullName)}</p>
          <p><strong>Email :</strong> ${escapeHtml(values.email)}</p>
          <p><strong>Téléphone :</strong> ${escapeHtml(values.phone || "-")}</p>
          <p><strong>Référence logement/propriétaire :</strong> ${escapeHtml(values.propertyRef)}</p>
          <p><strong>Message :</strong></p>
          <pre style="white-space:pre-wrap;font-family:ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;">${escapeHtml(values.message)}</pre>
          <hr/>
          <p style="color:#666;font-size:12px;">Envoyé depuis l'application Hello Keys.</p>
        </div>
      `;

      const { error } = await supabase.functions.invoke("send-email", {
        body: {
          to: "contact@hellokeys.fr",
          subject,
          html,
        },
      });

      if (error) throw error;

      toast.success("Votre demande a été envoyée à contact@hellokeys.fr");
      setOpen(false);
      form.reset({
        fullName: "",
        email: defaultEmail,
        phone: "",
        propertyRef: "",
        message: "Bonjour, je souhaite mettre en place un prélèvement bancaire pour mes factures propriétaire.",
      });
    } catch (e: any) {
      toast.error("Impossible d'envoyer la demande.");
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Demander un prélèvement bancaire</Button>
      </DialogTrigger>
      <DialogContent className="w-[95vw] max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Demande de prélèvement bancaire</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="fullName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nom et prénom</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Jean Dupont" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="vous@email.fr" inputMode="email" autoComplete="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Téléphone (optionnel)</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: 06 00 00 00 00" inputMode="tel" autoComplete="tel" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="propertyRef"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Référence logement / propriétaire</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Villa Berck / Compte propriétaire" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="message"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Message</FormLabel>
                  <FormControl>
                    <Textarea rows={6} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={sending}>
                Annuler
              </Button>
              <Button type="submit" disabled={sending}>
                {sending ? "Envoi…" : "Envoyer la demande"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}