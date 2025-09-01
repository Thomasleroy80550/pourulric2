import React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Info } from 'lucide-react';
import { cn } from '@/lib/utils'; // Assurez-vous que ce chemin est correct pour votre utilitaire cn

interface MigrationNoticeProps {
  message: string;
}

const MigrationNotice: React.FC<MigrationNoticeProps> = ({ message }) => {
  if (!message) return null;

  return (
    <Alert
      variant="default"
      className={cn(
        "m-4 max-w-2xl mx-auto",
        "bg-blue-100 border-blue-300 text-blue-800", // Mode clair: fond bleu clair, bordure bleue, texte bleu foncé
        "dark:bg-blue-900 dark:border-blue-700 dark:text-blue-300" // Mode sombre: fond bleu foncé, bordure plus foncée, texte bleu clair
      )}
    >
      <Info className="h-4 w-4 text-blue-700 dark:text-blue-400 animate-pulse" /> {/* Icône bleue avec effet de pulsation */}
      <AlertTitle>Migration des données en cours</AlertTitle>
      <AlertDescription>
        {message}
      </AlertDescription>
    </Alert>
  );
};

export default MigrationNotice;