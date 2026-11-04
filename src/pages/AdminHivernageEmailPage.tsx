import React, { useMemo, useState } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { buildNewsletterHtml } from '@/components/EmailNewsletterTheme';
import { toast } from 'sonner';
import { getAllProfiles } from '@/lib/admin-api';
import { sendEmail } from '@/lib/notifications-api';
import { Loader2, Mail } from 'lucide-react';

const DEFAULT_SUBJECT = 'Préparez votre logement pour l’hiver 2026–2027';
const DEFAULT_BODY_HTML = `
  <p>Bonjour,</p>
  <p>L’hiver approche ! Nous souhaitons connaître vos préférences pour votre logement pendant toute la période hivernale.</p>
  <p>Dans votre espace propriétaire, ouvrez <strong>« Préparer mon logement pour l’hiver 2026–2027 »</strong> et indiquez si vous souhaitez fermer votre logement, les dates souhaitées et vos consignes particulières.</p>
  <p><strong>Du dimanche 3 janvier au vendredi 5 février 2027, Hello Keys sera en vacances.</strong> Vos calendriers seront fermés à la location durant cette période. Votre espace reste accessible, mais nos délais de réponse pourront être allongés. Merci de votre compréhension !</p>
  <p>Le formulaire vous permet aussi de choisir les actions à réaliser avant notre départ : eau, chauffe-eau, chauffage en hors-gel, réfrigérateur et volets, ou ne rien modifier. Votre logement n’aura pas de linge pendant cette période.</p>
  <p>Merci de nous transmettre vos consignes via le formulaire avant notre fermeture afin que nous puissions organiser les passages.</p>
  <p>Bien à vous,<br/>L’équipe Hello Keys</p>
`;

const AdminHivernageEmailPage: React.FC = () => {
  const [subject, setSubject] = useState<string>(DEFAULT_SUBJECT);
  const [bodyHtml, setBodyHtml] = useState<string>(DEFAULT_BODY_HTML);
  const [sending, setSending] = useState<boolean>(false);

  const previewHtml = useMemo(() => {
    return buildNewsletterHtml({
      subject,
      bodyHtml,
      theme: 'default',
    });
  }, [subject, bodyHtml]);

  const sendToAllOwners = async () => {
    setSending(true);

    const profiles = await getAllProfiles();
    const recipients = profiles.filter((p) => !!p.email).map((p) => p.email as string);

    if (recipients.length === 0) {
      setSending(false);
      toast.error("Aucun propriétaire avec email trouvé.");
      return;
    }

    // Envoi séquentiel simple pour éviter les limites potentielles.
    let sentCount = 0;
    for (const email of recipients) {
      await sendEmail(email, subject, previewHtml);
      sentCount++;
    }

    setSending(false);
    toast.success(`Email envoyé à ${sentCount} destinataire(s).`);
  };

  return (
    <AdminLayout>
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center gap-3">
          <Mail className="h-7 w-7 text-primary" />
          <h1 className="text-3xl font-bold">Email d’hivernage</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Contenu de l’email</CardTitle>
            <CardDescription>
              Modifiez si besoin le sujet et le contenu, puis envoyez à tous les propriétaires.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Sujet</Label>
                <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Contenu (HTML)</Label>
                <Textarea
                  value={bodyHtml}
                  onChange={(e) => setBodyHtml(e.target.value)}
                  rows={12}
                  className="font-mono"
                />
              </div>

              <div className="flex justify-end">
                <Button onClick={sendToAllOwners} disabled={sending}>
                  {sending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Envoyer à tous les propriétaires
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Aperçu</CardTitle>
            <CardDescription>Rendu final de l’email côté destinataire.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border overflow-hidden">
              <iframe
                title="Aperçu Email"
                className="w-full h-[600px] bg-white"
                srcDoc={previewHtml}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminHivernageEmailPage;