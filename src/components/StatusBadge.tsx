import React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status?: string | null;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const getStatusVariant = (): 'default' | 'secondary' | 'destructive' | 'outline' => {
    switch (status) {
      case 'success':
        return 'default'; // Vert
      case 'error':
        return 'destructive'; // Rouge
      case 'processing':
        return 'outline'; // Bleu
      case 'pending':
      default:
        return 'secondary'; // Gris
    }
  };

  const getStatusText = (): string => {
    switch (status) {
      case 'success':
        return 'Succès';
      case 'error':
        return 'Erreur';
      case 'processing':
        return 'En cours';
      case 'pending':
        return 'En attente';
      default:
        return 'Inconnu';
    }
  };

  const variant = getStatusVariant();
  const text = getStatusText();

  return (
    <Badge
      variant={variant}
      className={cn({
        'bg-green-500 hover:bg-green-600 text-white': status === 'success',
      })}
    >
      {text}
    </Badge>
  );
};

export default StatusBadge;