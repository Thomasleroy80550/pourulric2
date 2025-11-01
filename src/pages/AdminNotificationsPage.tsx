import React, { useEffect, useMemo, useState } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { getSetting, updateSetting } from '@/lib/admin-api';
import { toast } from 'sonner';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

type EventTemplate = {
  key: string;
  name: string;
  sendEmail: boolean;
  sendNotification: boolean;
  subject: string;
  body: string;
};

const DEFAULT_TEMPLATES: EventTemplate[] = [
  {
    key: 'statement_email',
    name: 'Relevé envoyé (email)',
    sendEmail: true,
    sendNotification: true,
    subject: 'Votre relevé Hello Keys pour {{period}} est disponible',
    body: `Bonjour {{userName}},\n\nVotre nouveau relevé pour la période de {{period}} est disponible en cliquant sur le lien ci-dessous et sur votre espace client.\n\nCliquez ici pour télécharger votre relevé : {{pdfLink}}\n\nConnectez-vous pour consulter tous vos relevés : {{appUrl}}/finances\n\nCordialement,\nL'équipe Hello Keys`,
  },
  {
    key: 'payout_initiated',
    name: 'Virement Stripe initié',
    sendEmail: true,
    sendNotification: true,
    subject: 'Votre virement de {{amount}} {{currency}} a été initié',
    body: `Bonjour {{userName}},\n\nUn virement de {{amount}} {{currency}} a été initié vers votre compte Stripe connecté.\n\nRelevés concernés : {{invoiceIds}}\n\nCordialement,\nL'équipe Hello Keys`,
  },
  {
    key: 'payment_reminder',
    name: 'Relance de paiement',
    sendEmail: true,
    sendNotification: false,
    subject: 'Relance de paiement pour {{period}}',
    body: `Bonjour {{userName}},\n\nNous vous rappelons que le paiement pour la période {{period}} est en attente.\n\nCordialement,\nL'équipe Hello Keys`,
  },
];

function AdminNotificationsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [eventTemplates, setEventTemplates] = useState<EventTemplate[]>([]);

  // Variables d'aperçu
  const [previewUserName, setPreviewUserName] = useState('Jean');
  const [previewPeriod, setPreviewPeriod] = useState('Octobre 2025');
  const [previewPdfLink, setPreviewPdfLink] = useState('https://exemple.com/releve.pdf');
  const [previewAppUrl, setPreviewAppUrl] = useState('https://beta.proprietaire.hellokeys.fr');
  const [previewAmount, setPreviewAmount] = useState('123.45');
  const [previewCurrency, setPreviewCurrency] = useState('EUR');
  const [previewInvoiceIds, setPreviewInvoiceIds] = useState('abc123, def456');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const notifTemplatesSetting = await getSetting('notification_templates');
        const loaded = Array.isArray(notifTemplatesSetting?.value?.events)
          ? (notifTemplatesSetting!.value!.events as EventTemplate[])
          : DEFAULT_TEMPLATES;

        // Fusionner avec defaults pour garantir les clés principales et un ordre initial
        const merged = DEFAULT_TEMPLATES.map(def => {
          const found = loaded.find(t => t.key === def.key);
          return found ? { ...def, ...found } : def;
        });

        // Ajouter les éventuels templates personnalisés (non présents dans defaults) à la fin
        const custom = loaded.filter(t => !DEFAULT_TEMPLATES.some(d => d.key === t.key));
        setEventTemplates([...merged, ...custom]);
      } catch (e: any) {
        toast.error(e.message || "Erreur lors du chargement des templates.");
        setEventTemplates(DEFAULT_TEMPLATES);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const renderWithVars = (tpl: string, evKey: string) => {
    let rendered = tpl
      .replace(/{{userName}}/g, previewUserName)
      .replace(/{{period}}/g, previewPeriod)
      .replace(/{{pdfLink}}/g, previewPdfLink)
      .replace(/{{appUrl}}/g, previewAppUrl);

    if (evKey === 'payout_initiated') {
      rendered = rendered
        .replace(/{{amount}}/g, previewAmount)
        .replace(/{{currency}}/g, previewCurrency)
        .replace(/{{invoiceIds}}/g, previewInvoiceIds);
    }
    return rendered;
  };

  const addEvent = () => {
    const newItem: EventTemplate = {
      key: `custom_${Date.now()}`,
      name: 'Nouvel évènement',
      sendEmail: true,
      sendNotification: false,
      subject: 'Sujet de {{key}}',
      body: `Bonjour {{userName}},\n\nContenu pour l'événement {{key}}.\n\nCordialement,\nL'équipe Hello Keys`,
    };
    setEventTemplates(prev => [newItem, ...prev]);
    toast.success("Événement ajouté.");
  };

  const removeEvent = (idx: number) => {
    setEventTemplates(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSave = async () => {
    // validations simples: clés non vides et uniques
    const keys = eventTemplates.map(e => e.key.trim());
    if (keys.some(k => !k)) {
      toast.error("Chaque événement doit avoir une clé non vide.");
      return;
    }
    const hasDup = new Set(keys).size !== keys.length;
    if (hasDup) {
      toast.error("Les clés d'événements doivent être uniques.");
      return;
    }

    setSaving(true);
    try {
      await updateSetting('notification_templates', { events: eventTemplates });
      toast.success("Templates de notifications sauvegardés.");
    } catch (e: any) {
      toast.error(e.message || "Erreur lors de la sauvegarde.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout>
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Notifications & Emails</h1>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={addEvent}>
              <Plus className="mr-2 h-4 w-4" />
              Ajouter un événement
            </Button>
            <Button onClick={handleSave} disabled={saving || loading}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Sauvegarder
            </Button>
          </div>
        </div>

        {/* Variables d'aperçu */}
        <Card>
          <CardHeader>
            <CardTitle>Variables d'aperçu</CardTitle>
            <CardDescription>
              Ajustez ces valeurs pour voir le rendu du sujet et du contenu dans chaque événement.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <Skeleton className="h-9" />
                <Skeleton className="h-9" />
                <Skeleton className="h-9" />
                <Skeleton className="h-9" />
                <Skeleton className="h-9" />
                <Skeleton className="h-9" />
                <Skeleton className="h-9" />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <Label>userName</Label>
                  <Input value={previewUserName} onChange={e => setPreviewUserName(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>period</Label>
                  <Input value={previewPeriod} onChange={e => setPreviewPeriod(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>pdfLink</Label>
                  <Input value={previewPdfLink} onChange={e => setPreviewPdfLink(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>appUrl</Label>
                  <Input value={previewAppUrl} onChange={e => setPreviewAppUrl(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>amount</Label>
                  <Input value={previewAmount} onChange={e => setPreviewAmount(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>currency</Label>
                  <Input value={previewCurrency} onChange={e => setPreviewCurrency(e.target.value)} />
                </div>
                <div className="space-y-1 md:col-span-3">
                  <Label>invoiceIds</Label>
                  <Input value={previewInvoiceIds} onChange={e => setPreviewInvoiceIds(e.target.value)} />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Accordéon d'événements */}
        <Card>
          <CardHeader>
            <CardTitle>Événements configurables</CardTitle>
            <CardDescription>
              Dépliez une notification pour l’éditer. Activez l’envoi d’email ou la notification in-app selon le cas.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : (
              <Accordion type="single" collapsible className="w-full">
                {eventTemplates.map((ev, idx) => (
                  <AccordionItem key={ev.key + idx} value={ev.key + idx} className="px-2">
                    <AccordionTrigger className="text-left">
                      <div className="flex w-full items-center justify-between pr-2">
                        <div className="flex flex-col">
                          <span className="font-medium">{ev.name || ev.key}</span>
                          <span className="text-xs text-muted-foreground">{ev.key}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <Switch
                              id={`email-${ev.key}`}
                              checked={ev.sendEmail}
                              onCheckedChange={(v) => {
                                const next = [...eventTemplates];
                                next[idx] = { ...ev, sendEmail: v };
                                setEventTemplates(next);
                              }}
                            />
                            <Label htmlFor={`email-${ev.key}`} className="text-xs">Email</Label>
                          </div>
                          <div className="flex items-center gap-2">
                            <Switch
                              id={`notif-${ev.key}`}
                              checked={ev.sendNotification}
                              onCheckedChange={(v) => {
                                const next = [...eventTemplates];
                                next[idx] = { ...ev, sendNotification: v };
                                setEventTemplates(next);
                              }}
                            />
                            <Label htmlFor={`notif-${ev.key}`} className="text-xs">Notif</Label>
                          </div>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-4 pt-2">
                        <div className="grid md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Nom</Label>
                            <Input
                              value={ev.name}
                              onChange={(e) => {
                                const next = [...eventTemplates];
                                next[idx] = { ...ev, name: e.target.value };
                                setEventTemplates(next);
                              }}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Clé (unique, utilisée par le code)</Label>
                            <Input
                              value={ev.key}
                              onChange={(e) => {
                                const next = [...eventTemplates];
                                next[idx] = { ...ev, key: e.target.value.trim() };
                                setEventTemplates(next);
                              }}
                            />
                          </div>
                        </div>

                        <div className="grid md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Sujet</Label>
                            <Input
                              value={ev.subject}
                              onChange={(e) => {
                                const next = [...eventTemplates];
                                next[idx] = { ...ev, subject: e.target.value };
                                setEventTemplates(next);
                              }}
                            />
                            <Label>Corps</Label>
                            <Textarea
                              rows={8}
                              className="font-mono"
                              value={ev.body}
                              onChange={(e) => {
                                const next = [...eventTemplates];
                                next[idx] = { ...ev, body: e.target.value };
                                setEventTemplates(next);
                              }}
                            />
                          </div>

                          <div className="space-y-2">
                            <div className="text-sm text-muted-foreground">Sujet rendu</div>
                            <div className="rounded-md border bg-background px-3 py-2">
                              {renderWithVars(ev.subject, ev.key)}
                            </div>

                            <div className="text-sm text-muted-foreground mt-4">Contenu rendu (HTML)</div>
                            <div
                              className="prose prose-sm max-w-none rounded-md border bg-background px-3 py-2"
                              dangerouslySetInnerHTML={{
                                __html: renderWithVars(ev.body, ev.key).replace(/\n/g, '<br>'),
                              }}
                            />

                            <div className="flex justify-end mt-4">
                              <Button
                                variant="destructive"
                                onClick={() => removeEvent(idx)}
                                className="inline-flex items-center"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Supprimer
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving || loading}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Sauvegarder
          </Button>
        </div>
      </div>
    </AdminLayout>
  );
}

export default AdminNotificationsPage;