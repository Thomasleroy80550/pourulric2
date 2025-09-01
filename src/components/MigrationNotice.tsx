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
        "border-blue-400", // Bordure bleue pour le mode clair
        "dark:border-blue-600" // Bordure bleue plus foncée pour le mode sombre
      )}
    >
      <Info className="h-4 w-4 text-blue-700 dark:text-blue-400" /> {/* Icône bleue */}
      <AlertTitle>Migration des données en cours</AlertTitle>
      <AlertDescription>
        {message}
      </AlertDescription>
    </Alert>
  );
};

export default MigrationNotice;