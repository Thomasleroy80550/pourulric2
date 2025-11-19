import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLocation, useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import CGUVModal from '@/components/CGUVModal';
import { CURRENT_CGUV_VERSION } from '@/lib/constants';

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
  const [userEmail, setUserEmail] = useState<string | null>(null);

  // Info pour inscription déléguée
  const [inviteeEmail, setInviteeEmail] = useState<string>('');
  const [firstName, setFirstName] = useState<string>('');
  const [lastName, setLastName] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [cguvAccepted, setCguvAccepted] = useState<boolean>(false);
  const [isCguvOpen, setIsCguvOpen] = useState<boolean>(false);

  // Info pour acceptation si connecté
  const [invite, setInvite] = useState<InviteRow | null>(null);

  // Récupérer user + charger l’invitation (ou les infos d’invite via edge function si non connecté)
  useEffect(() => {
    const init = async () => {
      if (!token) {
        toast.error("Lien d'invitation invalide.");
        navigate('/');
        return;
      }

      const { data: authData } = await supabase.auth.getUser();
      const user = authData?.user ?? null;

      if (!user) {
        // Non connecté → récupérer l'email de l'invité via edge function
        const { data, error } = await supabase.functions.invoke('get-invite-info', {
          body: { token },
        });
        if (error || !data?.inviteeEmail) {
          toast.error("Invitation introuvable ou expirée.");
          navigate('/');
          return;
        }
        setInviteeEmail(data.inviteeEmail);
        setLoading(false);
        return;
      }

      // Connecté
      setUserEmail(user.email ?? null);

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

  const acceptInviteAndSetCGUV = async () => {
    setLoading(true);
    try {
      const acceptedAt = new Date().toISOString();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Veuillez vous connecter.");
        navigate('/login');
        return;
      }

      // Marquer acceptation des CGUV sur le profil
      const { error: profErr } = await supabase
        .from('profiles')
        .update({ cguv_accepted_at: acceptedAt, cguv_version: CURRENT_CGUV_VERSION })
        .eq('id', user.id);
      if (profErr) {
        console.warn('Impossible de marquer les CGUV comme acceptées:', profErr.message);
      }

      // Accepter l'invitation
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

  const handleSignup = async () => {
    if (!inviteeEmail) {
      toast.error("Email d'invitation manquant.");
      return;
    }
    if (!password || password.length < 6) {
      toast.error('Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }
    if (!cguvAccepted) {
      toast.error('Vous devez lire et accepter les CGUV pour continuer.');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: inviteeEmail,
        password,
        options: {
          data: { first_name: firstName, last_name: lastName },
          emailRedirectTo: window.location.origin + `/redeem-invite?token=${encodeURIComponent(token)}`,
        },
      });

      if (error) {
        if ((error as any)?.status === 422) {
          toast.error("Un compte existe déjà avec cet email. Veuillez vous connecter pour accepter l'invitation.");
          navigate('/login');
          return;
        }
        toast.error(`Inscription impossible: ${error.message}`);
        return;
      }

      toast.success('Inscription réussie ! Vérifiez votre email pour confirmer votre compte, puis revenez sur ce lien pour finaliser.');
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

  // Non connecté → formulaire de création de compte délégué + CGUV
  if (!userEmail) {
    return (
      <div className="container mx-auto py-8">
        <Card className="max-w-xl mx-auto">
          <CardHeader>
            <CardTitle>Créer votre compte délégué</CardTitle>
            <CardDescription>
              Vous avez été invité(e) à consulter les relevés d’un propriétaire. Créez votre compte et acceptez les CGUV pour continuer.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Email</label>
              <Input value={inviteeEmail} disabled />
              <p className="text-xs text-muted-foreground mt-1">
                Cet email est celui utilisé par l’invitation.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div>
                <label className="text-sm font-medium">Prénom</label>
                <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium">Nom</label>
                <Input value={lastName} onChange={(e) => setLastName(e.target.value)} />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Mot de passe</label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>

            <div className="flex items-center justify-between border rounded-md p-3">
              <div className="text-sm">
                <p className="font-medium">Conditions Générales d'Utilisation (CGUV)</p>
                <p className="text-xs text-muted-foreground">
                  Vous devez lire et accepter les CGUV pour créer votre compte délégué.
                </p>
              </div>
              <Button variant="outline" onClick={() => setIsCguvOpen(true)}>
                Lire les CGUV
              </Button>
            </div>

            <Button className="w-full" onClick={handleSignup} disabled={!cguvAccepted}>
              Créer mon compte délégué
            </Button>

            <CGUVModal
              isOpen={isCguvOpen}
              onOpenChange={(open) => setIsCguvOpen(open)}
              onAccept={() => {
                setCguvAccepted(true);
                setIsCguvOpen(false);
                toast.success('CGUV acceptées.');
              }}
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Connecté → accepter l’invitation (et CGUV marquées acceptées)
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
            Compte connecté: {userEmail || 'inconnu'}. En acceptant, vous pourrez consulter les relevés.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isPending ? (
            <Button onClick={acceptInviteAndSetCGUV}>Accepter l'invitation</Button>
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