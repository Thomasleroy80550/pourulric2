import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { v4 as uuidv4 } from 'uuid';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { MailPlus, X, CheckCircle2 } from 'lucide-react';

type InviteRow = {
  id: string;
  owner_id: string;
  invitee_email: string;
  token: string;
  status: 'pending' | 'accepted' | 'revoked';
  viewer_id: string | null;
  created_at: string;
  accepted_at: string | null;
};

interface Props {
  className?: string;
}

const DelegatedAccessPanel: React.FC<Props> = ({ className }) => {
  const [inviteeEmail, setInviteeEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [invites, setInvites] = useState<InviteRow[]>([]);

  const loadInvites = async () => {
    const { data, error } = await supabase
      .from('delegated_invoice_viewers')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading invites:', error);
      toast.error("Erreur lors du chargement des invitations.");
      return;
    }
    setInvites((data || []) as InviteRow[]);
  };

  useEffect(() => {
    loadInvites();
  }, []);

  const sendInviteEmail = async (email: string, token: string) => {
    const acceptUrl = `${window.location.origin}/redeem-invite?token=${encodeURIComponent(token)}`;
    const subject = "Invitation d'accès délégué aux relevés Hello Keys";
    const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2>Vous avez été invité(e) à consulter les relevés Hello Keys</h2>
        <p>Le propriétaire vous a accordé un accès délégué à ses relevés et finances.</p>
        <p>Pour accepter l'invitation, cliquez sur le bouton ci-dessous. Vous devrez vous connecter (ou créer un compte) avec cet email: <strong>${email}</strong>.</p>
        <p style="margin:24px 0">
          <a href="${acceptUrl}" style="background:#111827;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none;display:inline-block">Accepter l'invitation</a>
        </p>
        <p>Si vous ne souhaitez pas accepter, ignorez ce message.</p>
      </div>
    `;

    const { error } = await supabase.functions.invoke('send-email', {
      body: { to: email, subject, html },
    });
    if (error) {
      console.error('Failed to send invite email:', error);
      // Ne pas bloquer l’invitation si l’email échoue; informer seulement
      toast.error("Invitation créée, mais l'email n'a pas pu être envoyé.");
    } else {
      toast.success("Invitation envoyée par email.");
    }
  };

  const createInvite = async () => {
    if (!inviteeEmail || !/\S+@\S+\.\S+/.test(inviteeEmail)) {
      toast.error("Veuillez saisir un email valide.");
      return;
    }
    setLoading(true);
    try {
      const token = uuidv4();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Vous devez être connecté pour inviter un utilisateur.");
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('delegated_invoice_viewers')
        .insert({
          owner_id: user.id,
          invitee_email: inviteeEmail.trim().toLowerCase(),
          token,
          status: 'pending',
        })
        .select('*')
        .single();

      if (error) {
        console.error('Error creating invite:', error);
        toast.error("Impossible de créer l'invitation.");
      } else {
        toast.success("Invitation créée.");
        await sendInviteEmail(inviteeEmail.trim().toLowerCase(), token);
        setInviteeEmail('');
        await loadInvites();
      }
    } finally {
      setLoading(false);
    }
  };

  const revokeInvite = async (inviteId: string) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('delegated_invoice_viewers')
        .update({ status: 'revoked' })
        .eq('id', inviteId);
      if (error) {
        console.error('Error revoking invite:', error);
        toast.error("Impossible de révoquer l'invitation.");
      } else {
        toast.success("Invitation révoquée.");
        await loadInvites();
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MailPlus className="h-5 w-5" />
          Accès délégués
        </CardTitle>
        <CardDescription>
          Invitez une personne (ex. votre conjoint) à consulter vos relevés et finances avec son propre compte.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center gap-2">
          <Input
            type="email"
            placeholder="email de la personne à inviter"
            value={inviteeEmail}
            onChange={(e) => setInviteeEmail(e.target.value)}
            disabled={loading}
          />
          <Button onClick={createInvite} disabled={loading}>
            {loading ? 'Envoi...' : 'Inviter'}
          </Button>
        </div>

        <div className="space-y-3">
          {invites.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune invitation pour le moment.</p>
          ) : (
            invites.map((inv) => (
              <div
                key={inv.id}
                className="flex items-center justify-between border rounded-md p-3"
              >
                <div className="space-y-1">
                  <p className="text-sm font-medium">{inv.invitee_email}</p>
                  <p className="text-xs text-muted-foreground">
                    Statut: {inv.status}
                    {inv.status === 'accepted' && inv.accepted_at ? ` (depuis ${new Date(inv.accepted_at).toLocaleDateString()})` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {inv.status === 'accepted' ? (
                    <span className="inline-flex items-center text-green-600 text-xs">
                      <CheckCircle2 className="h-4 w-4 mr-1" /> Acceptée
                    </span>
                  ) : null}
                  {inv.status !== 'revoked' && (
                    <Button variant="outline" size="sm" onClick={() => revokeInvite(inv.id)} disabled={loading}>
                      <X className="h-4 w-4 mr-1" /> Révoquer
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default DelegatedAccessPanel;