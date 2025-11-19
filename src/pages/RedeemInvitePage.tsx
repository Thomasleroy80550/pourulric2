import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLocation, useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

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

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

const RedeemInvitePage: React.FC = () => {
  const query = useQuery();
  const navigate = useNavigate();
  const token = query.get('token') || '';
  const [loading, setLoading] = useState(true);
  const [invite, setInvite] = useState<InviteRow | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Veuillez vous connecter pour accepter l'invitation.");
        navigate('/login');
        return;
      }
      setUserEmail(user.email ?? null);

      // Charger l'invitation (RLS autorise le destinataire à voir les invites qui lui sont adressées)
      const { data, error } = await supabase
        .from('delegated_invoice_viewers')
        .select('*')
        .eq('token', token)
        .single();

      if (error) {
        console.error('Error loading invite:', error);
        toast.error("Nous n'avons pas pu trouver cette invitation ou vous n'êtes pas autorisé(e).");
        navigate('/');
        return;
      }
      setInvite(data as InviteRow);
      setLoading(false);
    };
    init();
  }, [token, navigate]);

  const acceptInvite = async () => {
    setLoading(true);
    try {
      const acceptedAt = new Date().toISOString();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Veuillez vous connecter.");
        navigate('/login');
        return;
      }

      const { error } = await supabase
        .from('delegated_invoice_viewers')
        .update({ viewer_id: user.id, status: 'accepted', accepted_at: acceptedAt })
        .eq('token', token);

      if (error) {
        console.error('Error accepting invite:', error);
        toast.error("Impossible d'accepter l'invitation.");
        setLoading(false);
        return;
      }

      toast.success("Invitation acceptée ! Vous pouvez désormais consulter les relevés.");
      navigate('/finances');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <p>Chargement...</p>
      </div>
    );
  }

  if (!invite) {
    return (
      <div className="container mx-auto py-8">
        <p>Invitation introuvable.</p>
      </div>
    );
  }

  const isPending = invite.status === 'pending';

  return (
    <div className="container mx-auto py-8">
      <Card className="max-w-xl mx-auto">
        <CardHeader>
          <CardTitle>Accepter l'invitation</CardTitle>
          <CardDescription>
            Vous êtes invité(e) à consulter les relevés d’un propriétaire. Compte connecté: {userEmail || 'inconnu'}.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isPending ? (
            <Button onClick={acceptInvite}>Accepter l'invitation</Button>
          ) : invite.status === 'accepted' ? (
            <p className="text-green-600">Invitation déjà acceptée. Accédez à vos relevés.</p>
          ) : (
            <p className="text-muted-foreground">Cette invitation a été révoquée.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default RedeemInvitePage;