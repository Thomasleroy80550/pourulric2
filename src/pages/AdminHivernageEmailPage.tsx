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

const DEFAULT_SUBJECT = 'Consignes d’hivernage – fermeture du 4 au 11 janvier';
const DEFAULT_BODY_HTML = `
  <p>Bonjour,</p>
  <p>Nous approchons de la période d’hivernage, durant laquelle la conciergerie sera fermée du <strong>dimanche 4 janvier</strong> au <strong>mercredi 11</strong> inclus.</p>
  <p>Avant notre fermeture, nous souhaitons savoir si vous avez des <strong>instructions particulières</strong> concernant votre logement (chauffage, eau, réfrigérateur, entretien, etc.).</p>
  <p>Merci de nous préciser, <strong>par retour de mail</strong>, ce que vous souhaitez que nous fassions avant notre départ&nbsp;:</p>
  <ul>
    <li>par exemple&nbsp;: couper l’eau ou le chauffe‑eau, laisser le chauffage en hors‑gel, enlever le linge ou en mettre, fermer les volets, etc.</li>
    <li>ou au contraire, si vous préférez ne rien modifier.</li>
  </ul>
  <p>Cela nous permettra de planifier les passages et de garantir que tout soit en ordre avant notre pause hivernale.</p>
  <p>Merci de nous transmettre vos consignes <strong>avant la fermeture</strong> afin que nous puissions nous organiser au mieux.</p>
  <p>Bien à vous,<br/>L’équipe Hello Keys<br/>La Conciergerie Hello Keys</p>
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