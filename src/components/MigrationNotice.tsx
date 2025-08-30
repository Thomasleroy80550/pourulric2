import React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Info } from 'lucide-react';

interface MigrationNoticeProps {
  message: string;
}

const MigrationNotice: React.FC<MigrationNoticeProps> = ({ message }) => {
  if (!message) return null;

  return (
    <Alert variant="default" className="m-4 bg-blue-100 border-blue-300 text-blue-800 dark:bg-blue-900/30 dark:border-blue-700 dark:text-blue-300">
      <Info className="h-4 w-4 !text-blue-800 dark:!text-blue-300" />
      <AlertTitle>Migration des données en cours</AlertTitle>
      <AlertDescription>
        {message}
      </AlertDescription>
    </Alert>
  );
};

export default MigrationNotice;