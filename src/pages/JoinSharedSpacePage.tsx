import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLocation, useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Users } from 'lucide-react';
import CGUVModal from '@/components/CGUVModal';
import { CURRENT_CGUV_VERSION } from '@/lib/constants';
import { getProfileById, UserProfile } from '@/lib/profile-api';

type MemberRow = {
  id: string;
  master_id: string;
  member_email: string;
  member_id: string | null;
  token: string;
  status: 'pending' | 'accepted' | 'revoked';
  created_at: string;
  accepted_at: string | null;
};

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

const JoinSharedSpacePage: React.FC = () => {
  const query = useQuery();
  const navigate = useNavigate();
  const token = query.get('token') || '';

  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  // Inscription pour un invité sans compte
  const [inviteeEmail, setInviteeEmail] = useState<string>('');
  const [masterName, setMasterName] = useState<string | null>(null);
  const [firstName, setFirstName] = useState<string>('');
  const [lastName, setLastName] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [cguvAccepted, setCguvAccepted] = useState<boolean>(false);
  const [isCguvOpen, setIsCguvOpen] = useState<boolean>(false);

  // Acceptation si connecté
  const [invite, setInvite] = useState<MemberRow | null>(null);
  const [masterProfile, setMasterProfile] = useState<UserProfile | null>(null);

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
        // Non connecté → récupérer les infos de l'invitation via edge function
        const { data, error } = await supabase.functions.invoke('get-space-invite-info', {
          body: { token },
        });
        if (error || !data?.inviteeEmail) {
          toast.error("Invitation introuvable ou expirée.");
          navigate('/');
          return;
        }
        setInviteeEmail(data.inviteeEmail);
        setMasterName(data.masterName || null);
        setLoading(false);
        return;
      }

      setUserEmail(user.email ?? null);

      const { data, error } = await supabase
        .from('account_members')
        .select('*')
        .eq('token', token)
        .single();

      if (error) {
        console.error('Error loading invite:', error);
        toast.error("Nous n'avons pas pu trouver cette invitation ou vous n'êtes pas autorisé(e).");
        navigate('/');
        return;
      }
      setInvite(data as MemberRow);
      setLoading(false);
    };
    init();
  }, [token, navigate]);

  useEffect(() => {
    const loadMaster = async () => {
      if (invite?.master_id) {
        try {
          const profile = await getProfileById(invite.master_id);
          setMasterProfile(profile);
        } catch {
          // non bloquant
        }
      }
    };
    loadMaster();
  }, [invite]);

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

      // Marquer acceptation des CGUV sur le profil
      const { error: profErr } = await supabase
        .from('profiles')
        .update({ cguv_accepted_at: acceptedAt, cguv_version: CURRENT_CGUV_VERSION })
        .eq('id', user.id);
      if (profErr) {
        console.warn('Impossible de marquer les CGUV comme acceptées:', profErr.message);
      }

      const { error } = await supabase
        .from('account_members')
        .update({ member_id: user.id, status: 'accepted', accepted_at: acceptedAt })
        .eq('token', token);

      if (error) {
        console.error('Error accepting invite:', error);
        toast.error("Impossible d'accepter l'invitation.");
        return;
      }

      toast.success("Invitation acceptée ! Vous pouvez maintenant accéder à l'espace partagé depuis votre profil.");
      navigate('/profile');
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
      // Création du compte côté serveur : email déjà confirmé, profil actif, invitation acceptée
      const { data, error } = await supabase.functions.invoke('join-shared-space', {
        body: {
          token,
          password,
          firstName,
          lastName,
          cguvVersion: CURRENT_CGUV_VERSION,
        },
      });

      if (error || data?.error) {
        const message = data?.error || error?.message || '';
        if (message === 'already_exists') {
          toast.error("Un compte existe déjà avec cet email. Veuillez vous connecter pour accepter l'invitation.");
          navigate('/login');
          return;
        }
        toast.error(`Inscription impossible: ${message}`);
        return;
      }

      // Connexion immédiate (aucune confirmation d'email requise)
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: inviteeEmail,
        password,
      });

      if (signInError) {
        toast.success("Compte créé ! Connectez-vous pour accéder à l'espace partagé.");
        navigate('/login');
        return;
      }

      toast.success("Bienvenue ! Votre accès à l'espace partagé est actif. Retrouvez-le sur votre profil.");
      navigate('/profile');
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

  // Non connecté → création de compte membre
  if (!userEmail) {
    return (
      <div className="container mx-auto py-8">
        <Card className="max-w-xl mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" /> Rejoindre l'espace partagé
            </CardTitle>
            <CardDescription>
              {masterName
                ? `${masterName} vous invite à accéder à l'intégralité de son espace Hello Keys.`
                : "Vous avez été invité(e) à accéder à l'espace d'un propriétaire Hello Keys."}
              {' '}Créez votre compte pour continuer.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Email</label>
              <Input value={inviteeEmail} disabled />
              <p className="text-xs text-muted-foreground mt-1">
                Cet email est celui utilisé par l'invitation.
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
                  Vous devez lire et accepter les CGUV pour créer votre compte.
                </p>
              </div>
              <Button variant="outline" onClick={() => setIsCguvOpen(true)}>
                Lire les CGUV
              </Button>
            </div>

            <Button className="w-full" onClick={handleSignup} disabled={!cguvAccepted}>
              Créer mon compte et rejoindre l'espace
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
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" /> Rejoindre l'espace partagé
          </CardTitle>
          <CardDescription>
            Compte connecté : {userEmail || 'inconnu'}. En acceptant, vous aurez accès à l'intégralité de l'espace du compte maître.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {masterProfile && (
            <div className="border rounded-md p-3 bg-muted/30">
              <p className="text-sm font-medium">Invité par</p>
              <p className="text-sm text-muted-foreground">
                {masterProfile.first_name || ''} {masterProfile.last_name || ''} {masterProfile.email ? `(${masterProfile.email})` : ''}
              </p>
            </div>
          )}
          {isPending ? (
            <Button onClick={acceptInvite}>Accepter l'invitation</Button>
          ) : invite.status === 'accepted' ? (
            <p className="text-green-600">
              Invitation déjà acceptée. Rendez-vous sur votre profil pour accéder à l'espace partagé.
            </p>
          ) : (
            <p className="text-muted-foreground">Cette invitation a été révoquée.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default JoinSharedSpacePage;
