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

interface EmailTemplate {
  subject: string;
  body: string;
}

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
        ] = await Promise.all([
          getSetting(EMAIL_TEMPLATE_KEY),
          getSetting(CONTACT_EMAIL_KEY),
          getSetting(CONTACT_PHONE_KEY),
          getSetting(FAQ_MAIN_TITLE_KEY),
          getSetting(FAQ_SUBTITLE_KEY),
          getSetting(FAQ_CONTACT_SECTION_TITLE_KEY),
          getSetting(FAQ_CONTACT_SECTION_SUBTITLE_KEY),
          getSetting(MIGRATION_NOTICE_KEY),
        ]);

        if (emailTemplateSetting && emailTemplateSetting.value) {
          setTemplate(emailTemplateSetting.value);
        } else {
          // Définir un modèle par défaut s'il n'en existe pas
          setTemplate({
            subject: 'Votre relevé Hello Keys pour {{period}} est disponible',
            body: `Bonjour {{userName}},\n\nVotre nouveau relevé pour la période de {{period}} est disponible en cliquant sur le lien ci-dessous et sur votre espace client.\n\nCliquez ici pour télécharger votre relevé : {{pdfLink}}\n\nConnectez-vous pour consulter tous vos relevés : {{appUrl}}/finances\n\nCordialement,\nL'équipe Hello Keys`,
          });
        }

        if (contactEmailSetting && contactEmailSetting.value) {
          setContactEmail(contactEmailSetting.value);
        } else {
          setContactEmail('contact@hellokeys.fr'); // Default value
        }

        if (contactPhoneSetting && contactPhoneSetting.value) {
          setContactPhone(contactPhoneSetting.value);
        } else {
          setContactPhone('03 22 31 92 70'); // Default value
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
          // Default message for migration notice
          setMigrationNoticeMessage('Migration des données en cours, vos anciennes données qui sont liées à l\'ancien système seront bien transférées sur la nouvelle version. Cette tâche étant manuelle et client par client, cela prend du temps.');
        }

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
      // Save migration notice setting
      await updateSetting(MIGRATION_NOTICE_KEY, {
        isVisible: isMigrationNoticeVisible,
        message: migrationNoticeMessage,
      });
      toast.success("Paramètres sauvegardés avec succès !");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
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
                Le relevé sera envoyé sous forme de lien de téléchargement, et non en pièce jointe.
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

          {/* New Card for Migration Notice */}
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