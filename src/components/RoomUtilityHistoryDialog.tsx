import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { getRoomUtilityEvents, RoomUtilityEvent } from '@/lib/admin-api';
import { PlugZap, Droplet, History } from 'lucide-react';

interface Props {
  userRoomId: string;
  roomName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const UtilityIcon: React.FC<{ utility: 'electricity' | 'water' }> = ({ utility }) => {
  return utility === 'electricity' ? (
    <PlugZap className="h-4 w-4 text-amber-600" />
  ) : (
    <Droplet className="h-4 w-4 text-sky-600" />
  );
};

const RoomUtilityHistoryDialog: React.FC<Props> = ({ userRoomId, roomName, open, onOpenChange }) => {
  const { data: events, isLoading, error, refetch } = useQuery<RoomUtilityEvent[]>({
    queryKey: ['roomUtilityEvents', userRoomId, open],
    queryFn: () => getRoomUtilityEvents(userRoomId),
    enabled: open,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5 text-muted-foreground" />
            Historique des compteurs
          </DialogTitle>
          <DialogDescription>Journal de {roomName}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 max-h-[60vh] overflow-y-auto">
          {isLoading && <p className="text-sm text-muted-foreground">Chargement...</p>}
          {error && <p className="text-sm text-red-500">Erreur de chargement.</p>}
          {events && events.length === 0 && (
            <p className="text-sm text-muted-foreground">Aucun événement pour le moment.</p>
          )}
          {events && events.map((e) => {
            const who = `${e.profiles?.first_name || ''} ${e.profiles?.last_name || ''}`.trim() || 'Admin';
            const when = new Date(e.created_at).toLocaleString();
            const label =
              e.utility === 'electricity'
                ? e.action === 'cut' ? 'Électricité coupée' : 'Électricité rétablie'
                : e.action === 'cut' ? 'Eau coupée' : 'Eau rétablie';

            const badgeVariant = e.action === 'cut' ? 'destructive' : 'success' as const;

            return (
              <div key={e.id} className="flex items-center justify-between rounded-md border p-3">
                <div className="flex items-center gap-2">
                  <UtilityIcon utility={e.utility} />
                  <span className="font-medium">{label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={badgeVariant}>{e.action === 'cut' ? 'coupé' : 'rétabli'}</Badge>
                  <span className="text-xs text-muted-foreground">{when}</span>
                  <span className="text-xs text-muted-foreground">• {who}</span>
                </div>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RoomUtilityHistoryDialog;