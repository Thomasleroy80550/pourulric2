import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Users, LogIn, Loader2 } from 'lucide-react';
import { getProfileById } from '@/lib/profile-api';

type SpaceRow = {
  id: string;
  master_id: string;
  masterName: string | null;
};

const SharedSpaceBanner: React.FC = () => {
  const [spaces, setSpaces] = useState<SpaceRow[]>([]);
  const [switchingId, setSwitchingId] = useState<string | null>(null);

  useEffect(() => {
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
    setSwitchingId(space.id);
    const toastId = toast.loading("Bascule vers l'espace partagé...");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Session non trouvée.");

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
      console.error('Error switching to master:', err);
      toast.error(`Erreur lors de la bascule : ${err.message}`, { id: toastId });
      setSwitchingId(null);
    }
  };

  if (spaces.length === 0) return null;

  return (
    <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-900/10 dark:border-blue-800 p-4">
      {spaces.map((space) => (
        <div key={space.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="font-semibold text-blue-900 dark:text-blue-100">
                Vous avez accès à l'espace de {space.masterName || 'un propriétaire'}
              </p>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                Basculez dans son espace pour voir ses statistiques, logements, calendrier et finances.
              </p>
            </div>
          </div>
          <Button
            onClick={() => switchToMaster(space)}
            disabled={switchingId === space.id}
            className="shrink-0"
          >
            {switchingId === space.id ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <LogIn className="h-4 w-4 mr-2" />}
            Accéder à l'espace
          </Button>
        </div>
      ))}
    </div>
  );
};

export default SharedSpaceBanner;
