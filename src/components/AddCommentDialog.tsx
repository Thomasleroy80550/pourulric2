import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { updateInvoiceComment } from '@/lib/admin-api';
import { SavedInvoice } from '@/lib/admin-api';

interface AddCommentDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  statement: SavedInvoice | null;
  onCommentSaved: () => void;
}

const AddCommentDialog: React.FC<AddCommentDialogProps> = ({ isOpen, onOpenChange, statement, onCommentSaved }) => {
  const [comment, setComment] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (statement) {
      setComment(statement.admin_comment || '');
    }
  }, [statement]);

  const handleSave = async () => {
    if (!statement) return;
    setIsSaving(true);
    try {
      await updateInvoiceComment(statement.id, comment);
      toast.success("Commentaire sauvegardé avec succès !");
      onCommentSaved();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(`Erreur: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  if (!statement) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ajouter/Modifier un Commentaire</DialogTitle>
          <DialogDescription>
            Ce commentaire sera visible par le client sur son relevé.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-2">
          <Label htmlFor="comment">Commentaire</Label>
          <Textarea
            id="comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Écrivez votre commentaire ici..."
            rows={5}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Sauvegarder
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddCommentDialog;