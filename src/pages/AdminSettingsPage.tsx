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

const EMAIL_TEMPLATE_KEY = 'statement_email_template';

interface EmailTemplate {
  subject: string;
  body: string;
}

const AdminSettingsPage: React.FC = () => {
  const [template, setTemplate] = useState<EmailTemplate>({ subject: '', body: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchTemplate = async () => {
      setLoading(true);
      try {
        const setting = await getSetting(EMAIL_TEMPLATE_KEY);
        if (setting && setting.value) {
          setTemplate(setting.value);
        } else {
          // Définir un modèle par défaut s'il n'en existe pas
          setTemplate({
            subject: 'Votre relevé Hello Keys pour {{period}} est disponible',
            body: `Bonjour {{userName}},\n\nVotre nouveau relevé pour la période de {{period}} est disponible en cliquant sur le lien ci-dessous et sur votre espace client.\n\nCliquez ici pour télécharger votre relevé : {{pdfLink}}\n\nConnectez-vous pour consulter tous vos relevés : {{appUrl}}/finances\n\nCordialement,\nL'équipe Hello Keys`,
          });
        }
      } catch (error: any) {
        toast.error(error.message);
      } finally {
        setLoading(false);
      }
    };
    fetchTemplate();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateSetting(EMAIL_TEMPLATE_KEY, template);
      toast.success("Modèle d'e-mail sauvegardé avec succès !");
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
                <Skeleton className="h-10 w-32" />
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
                <Button onClick={handleSave} disabled={saving}>
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Sauvegarder
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminSettingsPage;