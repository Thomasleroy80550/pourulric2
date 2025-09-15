import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { read, utils, WorkBook } from 'xlsx';
import { createUser, updateUser } from '@/lib/admin-api';
import { adminAddUserRoom } from '@/lib/user-room-api';
import { supabase } from '@/integrations/supabase/client';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ImportUsersDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onImportComplete: () => void;
}

interface UserImportData {
  first_name: string;
  last_name: string;
  email: string;
  room_name: string;
  room_id: string;
  room_id_2?: string; // Added room_id_2
  revyoos_holding_ids?: string;
}

interface ImportResult {
  successful: number;
  skipped: { email: string; reason: string }[];
  errors: { email: string; error: string }[];
}

const ImportUsersDialog: React.FC<ImportUsersDialogProps> = ({ isOpen, onOpenChange, onImportComplete }) => {
  const [file, setFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ImportResult | null>(null);

  const resetState = () => {
    setFile(null);
    setIsImporting(false);
    setProgress(0);
    setResult(null);
  };

  const handleClose = () => {
    if (!isImporting) {
      resetState();
      onOpenChange(false);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      setFile(event.target.files[0]);
    }
  };

  const handleDownloadTemplate = () => {
    // Updated headers to include room_id_2
    const headers = "first_name,last_name,email,room_name,room_id,room_id_2,revyoos_holding_ids";
    const csvContent = "data:text/csv;charset=utf-8," + encodeURIComponent(headers);
    const link = document.createElement("a");
    link.setAttribute("href", csvContent);
    link.setAttribute("download", "modele_import_clients.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImport = async () => {
    if (!file) {
      toast.error('Aucun fichier sélectionné', {
        description: 'Veuillez sélectionner un fichier Excel à importer.',
      });
      return;
    }

    setIsImporting(true);
    setProgress(0);
    setResult({ successful: 0, skipped: [], errors: [] });

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = e.target?.result;
        const workbook: WorkBook = read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json: UserImportData[] = utils.sheet_to_json(worksheet);

        const totalUsers = json.length;
        let currentResult: ImportResult = { successful: 0, skipped: [], errors: [] };

        for (let i = 0; i < totalUsers; i++) {
          const user = json[i];
          // Destructure room_id_2
          const { email, first_name, last_name, room_name, room_id, room_id_2, revyoos_holding_ids } = user;

          if (!email || !first_name || !last_name || !room_name || !room_id) {
            currentResult.errors.push({ email: email || `Ligne ${i + 2}`, error: 'Données manquantes (email, first_name, last_name, room_name, room_id sont requis).' });
            setResult({ ...currentResult });
            setProgress(((i + 1) / totalUsers) * 100);
            continue;
          }

          try {
            // 1. Check if user exists
            const { data: existingUser, error: checkError } = await supabase
              .from('profiles')
              .select('id')
              .eq('email', email)
              .single();

            if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows found
              throw new Error(`Vérification client échouée: ${checkError.message}`);
            }

            if (existingUser) {
              currentResult.skipped.push({ email, reason: 'Client déjà existant.' });
              setResult({ ...currentResult });
              setProgress(((i + 1) / totalUsers) * 100);
              continue;
            }

            // 2. Create user
            const tempPassword = Math.random().toString(36).slice(-10);
            const newUserResponse = await createUser({
              email,
              password: tempPassword,
              first_name,
              last_name,
              role: 'user',
            });
            
            // newUserResponse is now guaranteed to have user.id if no error was thrown
            const newUserId = newUserResponse.user.id;

            // 3. Add user room, passing room_id_2
            await adminAddUserRoom(newUserId, room_id, room_name, room_id_2);

            // 4. Update profile with onboarding status and revyoos id
            await updateUser({
              user_id: newUserId,
              onboarding_status: 'live',
              revyoos_holding_ids: revyoos_holding_ids ? [String(revyoos_holding_ids)] : undefined,
            });

            currentResult.successful++;
          } catch (error: any) {
            currentResult.errors.push({ email, error: error.message });
          } finally {
            setResult({ ...currentResult });
            setProgress(((i + 1) / totalUsers) * 100);
          }
        }

        toast.success('Importation terminée', {
          description: `${currentResult.successful} clients importés avec succès.`,
        });
        onImportComplete();
      } catch (error: any) {
        toast.error("Erreur lors de l'importation", {
          description: `Le fichier n'a pas pu être traité. Erreur: ${error.message}`,
        });
      } finally {
        setIsImporting(false);
      }
    };
    reader.readAsBinaryString(file);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Importer des clients en masse</DialogTitle>
          <DialogDescription>
            Sélectionnez un fichier Excel (.xlsx, .xls) pour importer des clients.
            Le fichier doit contenir les colonnes : `first_name`, `last_name`, `email`, `room_name`, `room_id`, `room_id_2` (optionnel), et `revyoos_holding_ids` (optionnel).
          </DialogDescription>
        </DialogHeader>
        
        {!result ? (
          <div className="grid gap-4 py-4">
            <Input
              id="import-file"
              type="file"
              accept=".xlsx, .xls"
              onChange={handleFileChange}
              disabled={isImporting}
            />
          </div>
        ) : (
          <div className="py-4 space-y-4">
            <Progress value={progress} className="w-full" />
            <p className="text-sm text-center text-muted-foreground">
              {isImporting ? `Traitement en cours... ${Math.round(progress)}%` : 'Importation terminée.'}
            </p>
            <Alert>
              <Terminal className="h-4 w-4" />
              <AlertTitle>Rapport d'importation</AlertTitle>
              <AlertDescription>
                <div className="space-y-2">
                  <p>Succès : {result.successful}</p>
                  <p>Ignorés : {result.skipped.length}</p>
                  <p>Erreurs : {result.errors.length}</p>
                </div>
              </AlertDescription>
            </Alert>
            {(result.skipped.length > 0 || result.errors.length > 0) && (
              <ScrollArea className="h-40 w-full rounded-md border p-4">
                {result.skipped.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2">Clients ignorés :</h4>
                    <ul className="list-disc list-inside text-sm">
                      {result.skipped.map((s, i) => (
                        <li key={i}><strong>{s.email}</strong>: {s.reason}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {result.errors.length > 0 && (
                  <div className="mt-4">
                    <h4 className="font-semibold mb-2 text-destructive">Erreurs :</h4>
                    <ul className="list-disc list-inside text-sm">
                      {result.errors.map((e, i) => (
                        <li key={i}><strong>{e.email}</strong>: {e.error}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </ScrollArea>
            )}
          </div>
        )}

        <DialogFooter>
          {!result ? (
            <>
              <Button variant="outline" onClick={handleDownloadTemplate} disabled={isImporting}>
                Télécharger le modèle (Clients)
              </Button>
              <Button onClick={handleImport} disabled={!file || isImporting}>
                {isImporting ? 'Importation en cours...' : 'Importer'}
              </Button>
            </>
          ) : (
            <Button onClick={handleClose}>Fermer</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ImportUsersDialog;