import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { Loader2, Home, Building2, LogOut } from 'lucide-react';
import { getProfileById } from '@/lib/profile-api';

export const SPACE_CHOSEN_KEY = 'hk_space_chosen';
const RETURN_SESSION_KEY = 'shared_space_return_session';

type SpaceRow = {
  id: string;
  master_id: string;
  masterName: string | null;
};

const SpaceSelectionPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [spaces, setSpaces] = useState<SpaceRow[]>([]);
  const [myName, setMyName] = useState<string>('');
  const [switchingId, setSwitchingId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/login');
        return;
      }

      const { data: myProfile } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('id', user.id)
        .maybeSingle();
      setMyName(`${myProfile?.first_name ?? ''} ${myProfile?.last_name ?? ''}`.trim() || (user.email ?? 'Mon compte'));

      const { data, error } = await supabase
        .from('account_members')
        .select('id, master_id')
        .eq('member_id', user.id)
        .eq('status', 'accepted');

      if (!error && data && data.length > 0) {
        const rows: SpaceRow[] = await Promise.all(
          data.map(async (row: any) => {
            try {
              const profile = await getProfileById(row.master_id);
              const name = profile ? `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim() : null;
              return { id: row.id, master_id: row.master_id, masterName: name || null };
            } catch {
              return { id: row.id, master_id: row.master_id, masterName: null };
            }
          })
        );
        setSpaces(rows);
      }
      setLoading(false);
    };
    load();
  }, [navigate]);

  const chooseMySpace = () => {
    sessionStorage.setItem(SPACE_CHOSEN_KEY, '1');
    navigate('/');
  };

  const switchToMaster = async (space: SpaceRow) => {
    setSwitchingId(space.id);
    const toastId = toast.loading("Ouverture de l'espace...");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Session non trouvée.");

      // Sauvegarder la session pour pouvoir revenir
      localStorage.setItem(RETURN_SESSION_KEY, JSON.stringify(session));
      sessionStorage.setItem(SPACE_CHOSEN_KEY, '1');

      const { data, error } = await supabase.functions.invoke('switch-to-master', {
        body: { master_id: space.master_id },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      if (data?.email && data?.email_otp) {
        const { error: otpError } = await supabase.auth.verifyOtp({
          email: data.email,
          token: data.email_otp,
          type: 'magiclink',
        });
        if (otpError) throw otpError;
        toast.success("Bienvenue dans l'espace !", { id: toastId });
        window.location.href = '/';
        return;
      }

      if (data?.action_link) {
        window.location.href = data.action_link;
        return;
      }

      throw new Error("Réponse inattendue du serveur.");
    } catch (err: any) {
      localStorage.removeItem(RETURN_SESSION_KEY);
      toast.error(`Erreur : ${err.message}`, { id: toastId });
      setSwitchingId(null);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem(RETURN_SESSION_KEY);
    sessionStorage.removeItem(SPACE_CHOSEN_KEY);
    navigate('/login');
  };

  const initials = (name: string) =>
    name.split(/\s+/).map((p) => p[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || '?';

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-950 p-6">
      <img src="/logo.png" alt="Hello Keys" className="w-40 h-auto mb-8" />
      <h1 className="text-2xl md:text-3xl font-bold mb-2 text-center">Qui souhaitez-vous gérer ?</h1>
      <p className="text-muted-foreground mb-10 text-center">Choisissez l'espace auquel vous voulez accéder.</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-3xl">
        {/* Mon espace */}
        <Card
          className="cursor-pointer hover:shadow-lg hover:border-primary transition-all"
          onClick={chooseMySpace}
        >
          <CardContent className="flex flex-col items-center text-center p-8 gap-4">
            <Avatar className="h-20 w-20">
              <AvatarFallback className="text-xl bg-blue-100 text-blue-700">{initials(myName)}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold">{myName}</p>
              <p className="text-sm text-muted-foreground flex items-center justify-center gap-1 mt-1">
                <Home className="h-3.5 w-3.5" /> Mon espace
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Espaces partagés */}
        {spaces.map((space) => (
          <Card
            key={space.id}
            className="cursor-pointer hover:shadow-lg hover:border-primary transition-all"
            onClick={() => switchingId ? undefined : switchToMaster(space)}
          >
            <CardContent className="flex flex-col items-center text-center p-8 gap-4">
              <Avatar className="h-20 w-20">
                <AvatarFallback className="text-xl bg-amber-100 text-amber-700">
                  {switchingId === space.id ? <Loader2 className="h-6 w-6 animate-spin" /> : initials(space.masterName || 'P')}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold">{space.masterName || 'Propriétaire'}</p>
                <p className="text-sm text-muted-foreground flex items-center justify-center gap-1 mt-1">
                  <Building2 className="h-3.5 w-3.5" /> Espace partagé
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Button variant="ghost" className="mt-10 text-muted-foreground" onClick={handleLogout}>
        <LogOut className="h-4 w-4 mr-2" /> Se déconnecter
      </Button>
    </div>
  );
};

export default SpaceSelectionPage;
