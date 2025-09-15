import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { UserProfile } from '@/lib/profile-api';
import { Strategy } from '@/lib/strategy-api';
import { upsertStrategy } from '@/lib/admin-api';
import { useSession } from '@/components/SessionContextProvider';
import { toast } from 'sonner';

interface StrategyDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  user: UserProfile | null;
  strategy: Strategy | null;
  onStrategyUpdate: () => void;
}

const StrategyDialog: React.FC<StrategyDialogProps> = ({ isOpen, onOpenChange, user, strategy, onStrategyUpdate }) => {
  const { profile: adminProfile } = useSession();
  const [content, setContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (strategy) {
      setContent(strategy.strategy_content);
    } else {
      setContent('');
    }
  }, [strategy]);

  const handleSave = async () => {
    if (!user || !adminProfile) {
      toast.error("Impossible de sauvegarder : données utilisateur ou admin manquantes.");
      return;
    }
    if (!content.trim()) {
      toast.error("Le contenu de la stratégie ne peut pas être vide.");
      return;
    }

    setIsSaving(true);
    try {
      await upsertStrategy(user.id, adminProfile.id, content);
      toast.success(`La stratégie pour ${user.first_name} ${user.last_name} a été sauvegardée.`);
      onStrategyUpdate();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(`Erreur lors de la sauvegarde : ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  if (!user) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[625px]">
        <DialogHeader>
          <DialogTitle>Gérer la Stratégie</DialogTitle>
          <DialogDescription>
            Définir ou mettre à jour la stratégie de performance pour {user.first_name} {user.last_name}.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="strategy-content">Contenu de la stratégie</Label>
            <Textarea
              id="strategy-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Définissez ici les objectifs, les recommandations de prix, les actions marketing, etc."
              className="min-h-[200px]"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Sauvegarde...' : 'Sauvegarder la stratégie'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default StrategyDialog;