import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { UserProfile } from '@/lib/profile-api';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface AuthHistory {
  logins: number;
  password_changes: number;
  recovery_requests: number;
  first_event_at: string | null;
  total: number;
  events: { id: string; created_at: string; action: string; ip_address: string | null; provider: string | null }[];
}

const labels: Record<string, string> = {
  login: 'Connexion',
  logout: 'Déconnexion',
  user_updated_password: 'Mot de passe changé',
  user_recovery_requested: 'Réinitialisation demandée',
  user_modified: 'Compte modifié (détail non disponible)',
  user_signedup: 'Inscription',
  user_repeated_signup: 'Nouvelle tentative d’inscription',
  user_confirmation_requested: 'Confirmation demandée',
  user_invited: 'Invitation',
  user_deleted: 'Compte supprimé',
};

export default function UserAuthHistoryDialog({ user, onClose }: { user: UserProfile; onClose: () => void }) {
  const [history, setHistory] = useState<AuthHistory | null>(null);
  const [page, setPage] = useState(0);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    async function load() {
      try {
        const { data, error: apiError } = await supabase.rpc('get_user_auth_history', {
          p_user_id: user.id, p_page: page, p_filter: filter,
        });
        if (apiError) throw apiError;
        if (active) setHistory(data as AuthHistory);
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : 'Impossible de charger l’historique. Vérifiez vos droits administrateur.');
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => { active = false; };
  }, [user.id, page, filter, reload]);

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Historique — {user.first_name} {user.last_name}</DialogTitle>
          <DialogDescription>{user.email} · Journal d’authentification Supabase</DialogDescription>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Seuls les événements conservés sont affichés. Les renouvellements automatiques de session ne sont pas des connexions.
          Les demandes de réinitialisation ne prouvent pas un changement de mot de passe.
          Les changements administrateur non détaillés peuvent apparaître comme « Compte modifié » et ne sont pas inclus dans le compteur des mots de passe.
        </p>
        {history && !error && (
          <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {[
                ['Connexions enregistrées', history.logins],
                ['Changements de mot de passe confirmés', history.password_changes],
                ['Demandes de réinitialisation', history.recovery_requests],
              ].map(([label, count]) => (
                <div key={label} className="rounded-lg border p-3">
                  <div className="text-2xl font-semibold">{count}</div>
                  <div className="text-sm text-muted-foreground">{label}</div>
                </div>
              ))}
            </div>
            {history.first_event_at && <p className="text-xs text-muted-foreground">Premier événement conservé pour ce compte : {format(new Date(history.first_event_at), 'dd/MM/yyyy HH:mm', { locale: fr })}.</p>}
          </>
        )}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Select value={filter} onValueChange={(value) => { setFilter(value); setPage(0); }} disabled={loading}>
            <SelectTrigger className="w-full sm:w-64" aria-label="Filtrer les événements"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les événements</SelectItem>
              <SelectItem value="login">Connexions</SelectItem>
              <SelectItem value="password">Changements de mot de passe</SelectItem>
              <SelectItem value="recovery">Demandes de réinitialisation</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" disabled={loading} onClick={() => setReload((value) => value + 1)}>Actualiser</Button>
        </div>
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-10" role="status"><Loader2 className="h-5 w-5 animate-spin" /> Chargement…</div>
        ) : error ? (
          <p className="rounded-md border border-destructive p-3 text-sm text-destructive" role="alert">{error}</p>
        ) : history && (
          <>
            <Table>
              <TableHeader><TableRow><TableHead>Date (heure locale)</TableHead><TableHead>Événement</TableHead><TableHead>Adresse IP</TableHead><TableHead>Méthode</TableHead></TableRow></TableHeader>
              <TableBody>
                {history.events.map((event) => (
                  <TableRow key={event.id}>
                    <TableCell className="whitespace-nowrap">{format(new Date(event.created_at), 'dd/MM/yyyy HH:mm:ss', { locale: fr })}</TableCell>
                    <TableCell>{labels[event.action] ?? event.action}</TableCell>
                    <TableCell>{event.ip_address ?? 'Non enregistrée'}</TableCell>
                    <TableCell>{event.provider ?? '—'}</TableCell>
                  </TableRow>
                ))}
                {!history.events.length && <TableRow><TableCell colSpan={4} className="py-8 text-center text-muted-foreground">Aucun événement conservé pour ce filtre.</TableCell></TableRow>}
              </TableBody>
            </Table>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm text-muted-foreground">{history.total} événement(s) · Page {page + 1} / {Math.max(1, Math.ceil(history.total / 50))}</span>
              <div className="flex gap-2">
                <Button variant="outline" disabled={page === 0} onClick={() => setPage((value) => value - 1)}>Précédent</Button>
                <Button variant="outline" disabled={(page + 1) * 50 >= history.total} onClick={() => setPage((value) => value + 1)}>Suivant</Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
