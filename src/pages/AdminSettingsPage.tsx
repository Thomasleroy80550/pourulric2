import React, { useState, useEffect } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { getSetting, updateSetting } from '@/lib/admin-api';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import {
  EMAIL_TEMPLATE_KEY,
  CONTACT_EMAIL_KEY,
  CONTACT_PHONE_KEY,
  FAQ_MAIN_TITLE_KEY,
  FAQ_SUBTITLE_KEY,
  FAQ_CONTACT_SECTION_TITLE_KEY,
  FAQ_CONTACT_SECTION_SUBTITLE_KEY,
  MIGRATION_NOTICE_KEY,
} from '@/lib/constants';
import { Switch } from '@/components/ui/switch';
import { createChangelogEntry } from '@/lib/changelog-api';

interface EmailTemplate {
  subject: string;
  body: string;
}

type EventTemplate = {
  key: string;
  name: string;
  sendEmail: boolean;
  sendNotification: boolean;
  subject: string;
  body: string;
};

const AdminSettingsPage: React.FC = () => {
  const [template, setTemplate] = useState<EmailTemplate>({ subject: '', body: '' });
  const [contactEmail, setContactEmail] = useState<string>('');
  const [contactPhone, setContactPhone] = useState<string>('');
  const [faqMainTitle, setFaqMainTitle] = useState<string>('');
  const [faqSubtitle, setFaqSubtitle] = useState<string>('');
  const [faqContactSectionTitle, setFaqContactSectionTitle] = useState<string>('');
  const [faqContactSectionSubtitle, setFaqContactSectionSubtitle] = useState<string>('');
  const [isMigrationNoticeVisible, setIsMigrationNoticeVisible] = useState<boolean>(false);
  const [migrationNoticeMessage, setMigrationNoticeMessage] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Nouveaux états: templates d'événements & aperçu
  const [eventTemplates, setEventTemplates] = useState<EventTemplate[]>([]);
  const [previewPeriod, setPreviewPeriod] = useState('Octobre 2025');
  const [previewUserName, setPreviewUserName] = useState('Jean');
  const [previewPdfLink, setPreviewPdfLink] = useState('https://exemple.com/releve.pdf');
  const [previewAppUrl, setPreviewAppUrl] = useState('https://beta.proprietaire.hellokeys.fr');

  useEffect(() => {
    const fetchSettings = async () => {
      setLoading(true);
      try {
        const [
          emailTemplateSetting,
          contactEmailSetting,
          contactPhoneSetting,
          faqMainTitleSetting,
          faqSubtitleSetting,
          faqContactSectionTitleSetting,
          faqContactSectionSubtitleSetting,
          migrationNoticeSetting,
          notifTemplatesSetting,
        ] = await Promise.all([
          getSetting(EMAIL_TEMPLATE_KEY),
          getSetting(CONTACT_EMAIL_KEY),
          getSetting(CONTACT_PHONE_KEY),
          getSetting(FAQ_MAIN_TITLE_KEY),
          getSetting(FAQ_SUBTITLE_KEY),
          getSetting(FAQ_CONTACT_SECTION_TITLE_KEY),
          getSetting(FAQ_CONTACT_SECTION_SUBTITLE_KEY),
          getSetting(MIGRATION_NOTICE_KEY),
          getSetting('notification_templates'),
        ]);

        if (emailTemplateSetting && emailTemplateSetting.value) {
          setTemplate(emailTemplateSetting.value);
        } else {
          setTemplate({
            subject: 'Votre relevé Hello Keys pour {{period}} est disponible',
            body: `Bonjour {{userName}},\n\nVotre nouveau relevé pour la période de {{period}} est disponible en cliquant sur le lien ci-dessous et sur votre espace client.\n\nCliquez ici pour télécharger votre relevé : {{pdfLink}}\n\nConnectez-vous pour consulter tous vos relevés : {{appUrl}}/finances\n\nCordialement,\nL'équipe Hello Keys`,
          });
        }

        if (contactEmailSetting && contactEmailSetting.value) {
          setContactEmail(contactEmailSetting.value);
        } else {
          setContactEmail('contact@hellokeys.fr');
        }

        if (contactPhoneSetting && contactPhoneSetting.value) {
          setContactPhone(contactPhoneSetting.value);
        } else {
          setContactPhone('03 22 31 92 70');
        }

        setFaqMainTitle(faqMainTitleSetting?.value || 'Foire Aux Questions (FAQ)');
        setFaqSubtitle(faqSubtitleSetting?.value || 'Trouvez des réponses aux questions les plus fréquemment posées.');
        setFaqContactSectionTitle(faqContactSectionTitleSetting?.value || 'Vous ne trouvez pas de réponse ?');
        setFaqContactSectionSubtitle(faqContactSectionSubtitleSetting?.value || 'Notre équipe est là pour vous aider. Contactez-nous directement.');
        
        // Set migration notice states
        if (migrationNoticeSetting && migrationNoticeSetting.value) {
          setIsMigrationNoticeVisible(migrationNoticeSetting.value.isVisible || false);
          setMigrationNoticeMessage(migrationNoticeSetting.value.message || '');
        } else {
          setMigrationNoticeMessage('Migration des données en cours, vos anciennes données qui sont liées à l\'ancien système seront bien transférées sur la nouvelle version. Cette tâche étant manuelle et client par client, cela prend du temps.');
        }

        // Charger les templates d'événements
        const defaults: EventTemplate[] = [
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

        const loaded = Array.isArray(notifTemplatesSetting?.value?.events)
          ? notifTemplatesSetting!.value!.events as EventTemplate[]
          : defaults;

        // Fusionner avec defaults pour garantir les clés principales
        const merged = defaults.map(def => {
          const found = loaded.find(t => t.key === def.key);
          return found ? { ...def, ...found } : def;
        });

        setEventTemplates(merged);
      } catch (error: any) {
        toast.error(error.message);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateSetting(EMAIL_TEMPLATE_KEY, template);
      await updateSetting(CONTACT_EMAIL_KEY, contactEmail);
      await updateSetting(CONTACT_PHONE_KEY, contactPhone);
      await updateSetting(FAQ_MAIN_TITLE_KEY, faqMainTitle);
      await updateSetting(FAQ_SUBTITLE_KEY, faqSubtitle);
      await updateSetting(FAQ_CONTACT_SECTION_TITLE_KEY, faqContactSectionTitle);
      await updateSetting(FAQ_CONTACT_SECTION_SUBTITLE_KEY, faqContactSectionSubtitle);
      await updateSetting(MIGRATION_NOTICE_KEY, {
        isVisible: isMigrationNoticeVisible,
        message: migrationNoticeMessage,
      });
      // Sauvegarder les templates d'événements
      await updateSetting('notification_templates', { events: eventTemplates });

      toast.success("Paramètres sauvegardés avec succès !");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  const renderWithVars = (tpl: string) => {
    return tpl
      .replace(/{{userName}}/g, previewUserName)
      .replace(/{{period}}/g, previewPeriod)
      .replace(/{{pdfLink}}/g, previewPdfLink)
      .replace(/{{appUrl}}/g, previewAppUrl);
  };

  return (
    <AdminLayout>
      <div className="container mx-auto py-6">
        <h1 className="text-3xl font-bold mb-6">Paramètres Généraux</h1>
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Modèle d'E-mail pour les Relevés</CardTitle>
              <CardDescription>
                Personnalisez l'e-mail envoyé aux clients avec leur relevé.
                Variables disponibles : <code>{"{{userName}}"}</code>, <code>{"{{period}}"}</code>, <code>{"{{appUrl}}"}</code>, <code>{"{{pdfLink}}"}</code>.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-4">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-32 w-full" />
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="subject">Sujet de l'e-mail</Label>
                    <Input
                      id="subject"
                      value={template.subject}
                      onChange={(e) => setTemplate({ ...template, subject: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="body">Corps de l'e-mail</Label>
                    <Textarea
                      id="body"
                      value={template.body}
                      onChange={(e) => setTemplate({ ...template, body: e.target.value })}
                      rows={10}
                      className="font-mono"
                    />
                  </div>

                  {/* Aperçu du mail */}
                  <div className="mt-6 rounded-lg border bg-muted/20 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold">Aperçu du mail de relevé</h4>
                      <div className="flex gap-2">
                        <Input
                          className="h-8 w-36"
                          value={previewUserName}
                          onChange={(e) => setPreviewUserName(e.target.value)}
                          placeholder="{{userName}}"
                        />
                        <Input
                          className="h-8 w-36"
                          value={previewPeriod}
                          onChange={(e) => setPreviewPeriod(e.target.value)}
                          placeholder="{{period}}"
                        />
                        <Input
                          className="h-8 w-56"
                          value={previewPdfLink}
                          onChange={(e) => setPreviewPdfLink(e.target.value)}
                          placeholder="{{pdfLink}}"
                        />
                        <Input
                          className="h-8 w-56"
                          value={previewAppUrl}
                          onChange={(e) => setPreviewAppUrl(e.target.value)}
                          placeholder="{{appUrl}}"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="text-sm text-muted-foreground">Sujet rendu</div>
                      <div className="rounded-md border bg-background px-3 py-2">
                        {renderWithVars(template.subject)}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="text-sm text-muted-foreground">Contenu rendu (HTML)</div>
                      <div
                        className="prose prose-sm max-w-none rounded-md border bg-background px-3 py-2"
                        dangerouslySetInnerHTML={{ __html: renderWithVars(template.body).replace(/\n/g, '<br>') }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Informations de Contact Générales</CardTitle>
              <CardDescription>
                Ces informations seront affichées sur les pages publiques comme la FAQ.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-4">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="contactEmail">E-mail de contact</Label>
                    <Input
                      id="contactEmail"
                      type="email"
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contactPhone">Numéro de téléphone de contact</Label>
                    <Input
                      id="contactPhone"
                      type="tel"
                      value={contactPhone}
                      onChange={(e) => setContactPhone(e.target.value)}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Textes de la page FAQ</CardTitle>
              <CardDescription>
                Personnalisez les titres et sous-titres de la page FAQ publique.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-4">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="faqMainTitle">Titre principal de la FAQ</Label>
                    <Input
                      id="faqMainTitle"
                      value={faqMainTitle}
                      onChange={(e) => setFaqMainTitle(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="faqSubtitle">Sous-titre de la FAQ</Label>
                    <Textarea
                      id="faqSubtitle"
                      value={faqSubtitle}
                      onChange={(e) => setFaqSubtitle(e.target.value)}
                      rows={2}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="faqContactSectionTitle">Titre de la section contact</Label>
                    <Input
                      id="faqContactSectionTitle"
                      value={faqContactSectionTitle}
                      onChange={(e) => setFaqContactSectionTitle(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="faqContactSectionSubtitle">Sous-titre de la section contact</Label>
                    <Textarea
                      id="faqContactSectionSubtitle"
                      value={faqContactSectionSubtitle}
                      onChange={(e) => setFaqContactSectionSubtitle(e.target.value)}
                      rows={2}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Notice de Migration des Données</CardTitle>
              <CardDescription>
                Affichez une bannière d'information pour tous les utilisateurs concernant la migration des données.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-4">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-32 w-full" />
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="migration-notice-toggle"
                      checked={isMigrationNoticeVisible}
                      onCheckedChange={setIsMigrationNoticeVisible}
                    />
                    <Label htmlFor="migration-notice-toggle">Afficher la notice de migration</Label>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="migration-notice-message">Message de la notice</Label>
                    <Textarea
                      id="migration-notice-message"
                      value={migrationNoticeMessage}
                      onChange={(e) => setMigrationNoticeMessage(e.target.value)}
                      rows={4}
                      placeholder="Migration des données en cours..."
                      disabled={!isMigrationNoticeVisible}
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Nouveau: Templates d'événements */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Templates d'événements (emails & notifications)</CardTitle>
              <CardDescription>
                Configurez, par type d'événement, si un email et/ou une notification doit être envoyé, et éditez le contenu.
                Variables supportées selon l'événement: 
                <code>{"{{userName}}"}</code>, <code>{"{{period}}"}</code>, <code>{"{{appUrl}}"}</code>, <code>{"{{pdfLink}}"}</code>, 
                <code>{"{{amount}}"}</code>, <code>{"{{currency}}"}</code>, <code>{"{{invoiceIds}}"}</code>.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-4">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-32 w-full" />
                </div>
              ) : (
                <div className="space-y-6">
                  {eventTemplates.map((ev, idx) => (
                    <div key={ev.key} className="rounded-lg border bg-muted/10 p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="font-medium">{ev.name}</div>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <Switch
                              id={`sendEmail-${ev.key}`}
                              checked={ev.sendEmail}
                              onCheckedChange={(val) => {
                                const next = [...eventTemplates];
                                next[idx] = { ...ev, sendEmail: val };
                                setEventTemplates(next);
                              }}
                            />
                            <Label htmlFor={`sendEmail-${ev.key}`}>Envoyer email</Label>
                          </div>
                          <div className="flex items-center gap-2">
                            <Switch
                              id={`sendNotif-${ev.key}`}
                              checked={ev.sendNotification}
                              onCheckedChange={(val) => {
                                const next = [...eventTemplates];
                                next[idx] = { ...ev, sendNotification: val };
                                setEventTemplates(next);
                              }}
                            />
                            <Label htmlFor={`sendNotif-${ev.key}`}>Notification in-app</Label>
                          </div>
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
                            rows={6}
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
                          <div className="text-sm text-muted-foreground">Aperçu rendu</div>
                          <div className="rounded-md border bg-background px-3 py-2">
                            {(ev.key === 'statement_email'
                              ? renderWithVars(ev.subject)
                              : ev.subject
                                .replace(/{{userName}}/g, previewUserName)
                                .replace(/{{amount}}/g, '123.45')
                                .replace(/{{currency}}/g, 'EUR')
                                .replace(/{{invoiceIds}}/g, 'abc123, def456'))}
                          </div>
                          <div
                            className="prose prose-sm max-w-none rounded-md border bg-background px-3 py-2"
                            dangerouslySetInnerHTML={{
                              __html: (ev.key === 'statement_email'
                                ? renderWithVars(ev.body)
                                : ev.body
                                  .replace(/{{userName}}/g, previewUserName)
                                  .replace(/{{amount}}/g, '123.45')
                                  .replace(/{{currency}}/g, 'EUR')
                                  .replace(/{{invoiceIds}}/g, 'abc123, def456')
                              ).replace(/\n/g, '<br>')
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        <div className="mt-6 flex justify-end">
          <Button onClick={handleSave} disabled={saving || loading}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Sauvegarder tous les paramètres
          </Button>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminSettingsPage;