import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { Users, LogIn, Loader2, ChevronDown, Undo2, CheckCircle2 } from 'lucide-react';
import { getProfileById } from '@/lib/profile-api';

const RETURN_SESSION_KEY = 'shared_space_return_session';

type SpaceRow = {
  id: string;
  master_id: string;
  masterName: string | null;
};

const SpaceSwitcher: React.FC = () => {
  const [spaces, setSpaces] = useState<SpaceRow[]>([]);
  const [switching, setSwitching] = useState(false);
  const [hasReturnSession, setHasReturnSession] = useState(false);

  useEffect(() => {
    setHasReturnSession(!!localStorage.getItem(RETURN_SESSION_KEY));

    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('account_members')
        .select('id, master_id')
        .eq('member_id', user.id)
        .eq('status', 'accepted');

      if (error || !data || data.length === 0) return;

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
    };
    load();
  }, []);

  const switchToMaster = async (space: SpaceRow) => {
    setSwitching(true);
    const toastId = toast.loading("Bascule vers l'espace partagé...");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Session non trouvée.");

      // Sauvegarder la session actuelle pour pouvoir revenir
      localStorage.setItem(RETURN_SESSION_KEY, JSON.stringify(session));

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
        toast.success("Vous êtes maintenant dans l'espace partagé !", { id: toastId });
        window.location.href = '/';
        return;
      }

      if (data?.action_link) {
        toast.success("Ouverture de l'espace partagé...", { id: toastId });
        window.location.href = data.action_link;
        return;
      }

      throw new Error("Réponse inattendue du serveur.");
    } catch (err: any) {
      localStorage.removeItem(RETURN_SESSION_KEY);
      console.error('Error switching to master:', err);
      toast.error(`Erreur lors de la bascule : ${err.message}`, { id: toastId });
      setSwitching(false);
    }
  };

  const returnToMyAccount = async () => {
    const saved = localStorage.getItem(RETURN_SESSION_KEY);
    if (!saved) return;
    setSwitching(true);
    try {
      const session = JSON.parse(saved);
      const { error } = await supabase.auth.setSession(session);
      if (error) throw error;
      localStorage.removeItem(RETURN_SESSION_KEY);
      sessionStorage.removeItem('hk_space_chosen');
      toast.success("Retour à la sélection de compte.");
      window.location.href = '/espaces';
    } catch (err: any) {
      toast.error(`Impossible de revenir à votre compte : ${err.message}. Reconnectez-vous.`);
      localStorage.removeItem(RETURN_SESSION_KEY);
      setSwitching(false);
    }
  };

  // Rien à afficher si l'utilisateur n'a aucun espace et n'est pas en mode bascule
  if (spaces.length === 0 && !hasReturnSession) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={switching}>
          {switching ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Users className="h-4 w-4 mr-1" />}
          <span className="hidden sm:inline">Espaces</span>
          <ChevronDown className="h-3 w-3 ml-1" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>Changer d'espace</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {hasReturnSession ? (
          <DropdownMenuItem onClick={returnToMyAccount} className="cursor-pointer">
            <Undo2 className="h-4 w-4 mr-2" />
            Revenir à la sélection de compte
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem disabled>
            <CheckCircle2 className="h-4 w-4 mr-2 text-green-600" />
            Mon espace (actuel)
          </DropdownMenuItem>
        )}
        {spaces.map((space) => (
          <DropdownMenuItem key={space.id} onClick={() => switchToMaster(space)} className="cursor-pointer">
            <LogIn className="h-4 w-4 mr-2" />
            Espace de {space.masterName || 'un propriétaire'}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default SpaceSwitcher;
