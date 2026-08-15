import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { v4 as uuidv4 } from 'uuid';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Users, UserPlus, X, CheckCircle2, LogIn, Loader2, Crown } from 'lucide-react';
import { getProfileById } from '@/lib/profile-api';

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

type AccessibleSpace = MemberRow & {
  masterName: string | null;
};

interface Props {
  className?: string;
}

const SharedSpacePanel: React.FC<Props> = ({ className }) => {
  const [inviteeEmail, setInviteeEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [accessibleSpaces, setAccessibleSpaces] = useState<AccessibleSpace[]>([]);
  const [switchingId, setSwitchingId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const loadData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);

    // Membres de MON espace (je suis le compte maître)
    const { data: myMembers, error: membersError } = await supabase
      .from('account_members')
      .select('*')
      .eq('master_id', user.id)
      .order('created_at', { ascending: false });

    if (membersError) {
      console.error('Error loading members:', membersError);
    } else {
      setMembers((myMembers || []) as MemberRow[]);
    }

    // Espaces auxquels J'AI accès (je suis membre)
    const { data: mySpaces, error: spacesError } = await supabase
      .from('account_members')
      .select('*')
      .eq('member_id', user.id)
      .eq('status', 'accepted')
      .order('created_at', { ascending: false });

    if (spacesError) {
      console.error('Error loading accessible spaces:', spacesError);
    } else {
      const spaces: AccessibleSpace[] = await Promise.all(
        ((mySpaces || []) as MemberRow[]).map(async (row) => {
          try {
            const profile = await getProfileById(row.master_id);
            const name = profile ? `${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim() : null;
            return { ...row, masterName: name || null };
          } catch {
            return { ...row, masterName: null };
          }
        })
      );
      setAccessibleSpaces(spaces);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const sendInviteEmail = async (email: string, token: string) => {
    const acceptUrl = `${window.location.origin}/rejoindre-espace?token=${encodeURIComponent(token)}`;
    const subject = "Invitation à rejoindre un espace partagé Hello Keys";
    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #111827;">
        <div style="background:#E1F2FF; padding: 20px 24px; border-radius: 12px 12px 0 0;">
          <img src="https://beta.proprietaire.hellokeys.fr/logo.png" alt="Hello Keys" width="128" style="display:block; border:0;">
        </div>
        <div style="padding: 24px; border: 1px solid #CDE8FF; border-top: 0; border-radius: 0 0 12px 12px;">
          <h2 style="color:#255F85;">Vous avez été invité(e) à rejoindre un espace partagé 🤝</h2>
          <p>Le titulaire d'un compte Hello Keys vous invite à accéder à l'ensemble de ses données : tableaux de bord, réservations, finances, relevés…</p>
          <p>Pour accepter l'invitation, cliquez sur le bouton ci-dessous avec cet email : <strong>${email}</strong>.</p>
          <p style="margin:24px 0">
            <a href="${acceptUrl}" style="background:#255F85;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none;display:inline-block;font-weight:600">Rejoindre l'espace partagé</a>
          </p>
          <p style="color:#6B7280; font-size: 13px;">Si vous ne souhaitez pas accepter, ignorez simplement ce message.</p>
        </div>
      </div>
    `;

    const { error } = await supabase.functions.invoke('send-email', {
      body: { to: email, subject, html },
    });
    if (error) {
      console.error('Failed to send invite email:', error);
      toast.error("Invitation créée, mais l'email n'a pas pu être envoyé.");
    } else {
      toast.success("Invitation envoyée par email.");
    }
  };

  const createInvite = async () => {
    const email = inviteeEmail.trim().toLowerCase();
    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      toast.error("Veuillez saisir un email valide.");
      return;
    }
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Vous devez être connecté.");
        return;
      }
      if (user.email?.toLowerCase() === email) {
        toast.error("Vous ne pouvez pas vous inviter vous-même.");
        return;
      }

      const token = uuidv4();
      const { error } = await supabase
        .from('account_members')
        .insert({
          master_id: user.id,
          member_email: email,
          token,
          status: 'pending',
        });

      if (error) {
        console.error('Error creating invite:', error);
        toast.error("Impossible de créer l'invitation.");
      } else {
        await sendInviteEmail(email, token);
        setInviteeEmail('');
        await loadData();
      }
    } finally {
      setLoading(false);
    }
  };

  const revokeMember = async (memberId: string) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('account_members')
        .update({ status: 'revoked' })
        .eq('id', memberId);
      if (error) {
        console.error('Error revoking member:', error);
        toast.error("Impossible de révoquer l'accès.");
      } else {
        toast.success("Accès révoqué.");
        await loadData();
      }
    } finally {
      setLoading(false);
    }
  };

  const switchToMaster = async (space: AccessibleSpace) => {
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
    } finally {
      setSwitchingId(null);
    }
  };

  const statusBadge = (status: MemberRow['status']) => {
    switch (status) {
      case 'accepted':
        return <Badge className="bg-green-100 text-green-700 hover:bg-green-100"><CheckCircle2 className="h-3 w-3 mr-1" /> Actif</Badge>;
      case 'pending':
        return <Badge variant="secondary">En attente</Badge>;
      case 'revoked':
        return <Badge variant="outline" className="text-muted-foreground">Révoqué</Badge>;
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Espace partagé
        </CardTitle>
        <CardDescription>
          Invitez des personnes de confiance (associé, conjoint, famille…) à accéder à l'intégralité de votre espace : tableaux de bord, réservations, finances, relevés…
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Espaces auxquels j'ai accès */}
        {accessibleSpaces.length > 0 && (
          <div className="space-y-3">
            <p className="text-sm font-semibold flex items-center gap-2">
              <Crown className="h-4 w-4 text-amber-500" /> Espaces auxquels vous avez accès
            </p>
            {accessibleSpaces.map((space) => (
              <div key={space.id} className="flex items-center justify-between border rounded-md p-3 bg-muted/30">
                <div>
                  <p className="text-sm font-medium">
                    Espace de {space.masterName || 'un propriétaire'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Accès complet · depuis le {new Date(space.accepted_at || space.created_at).toLocaleDateString('fr-FR')}
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => switchToMaster(space)}
                  disabled={switchingId === space.id}
                >
                  {switchingId === space.id ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <LogIn className="h-4 w-4 mr-1" />}
                  Accéder
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Inviter un membre */}
        <div className="space-y-3">
          <p className="text-sm font-semibold flex items-center gap-2">
            <UserPlus className="h-4 w-4" /> Inviter un membre dans votre espace
          </p>
          <div className="flex items-center gap-2">
            <Input
              type="email"
              placeholder="email de la personne à inviter"
              value={inviteeEmail}
              onChange={(e) => setInviteeEmail(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') createInvite(); }}
              disabled={loading}
            />
            <Button onClick={createInvite} disabled={loading}>
              {loading ? 'Envoi...' : 'Inviter'}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            ⚠️ Le membre invité aura accès à <strong>toutes les données</strong> de votre compte. N'invitez que des personnes de confiance.
          </p>
        </div>

        {/* Liste des membres */}
        <div className="space-y-3">
          {members.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun membre dans votre espace pour le moment.</p>
          ) : (
            members.map((member) => (
              <div key={member.id} className="flex items-center justify-between border rounded-md p-3">
                <div className="space-y-1">
                  <p className="text-sm font-medium">{member.member_email}</p>
                  <p className="text-xs text-muted-foreground">
                    Invité le {new Date(member.created_at).toLocaleDateString('fr-FR')}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {statusBadge(member.status)}
                  {member.status !== 'revoked' && (
                    <Button variant="outline" size="sm" onClick={() => revokeMember(member.id)} disabled={loading}>
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

export default SharedSpacePanel;
