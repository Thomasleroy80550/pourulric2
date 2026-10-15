import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useSession } from "@/components/SessionContextProvider";
import { forgetDeviceLock, readSavedDevice } from "@/lib/pwa-lock-api";
import { supabase } from "@/integrations/supabase/client";

export default function DevicePinSettings() {
  const { session } = useSession();
  const [busy, setBusy] = useState(false);
  const userId = session?.user.id;
  if (!userId || !readSavedDevice(userId)) return null;

  const forget = async () => {
    setBusy(true);
    try {
      await forgetDeviceLock(userId);
      const { error } = await supabase.auth.signOut({ scope: "local" });
      if (error) throw error;
      toast.success("Cet appareil a été oublié. La prochaine connexion demandera votre compte.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible d’oublier cet appareil.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3 rounded-2xl bg-white p-4 shadow-sm">
      <h2 className="font-semibold text-slate-900">Connexion par code</h2>
      <p className="text-sm text-slate-500">Votre code fonctionne sur ce téléphone, même après déconnexion. Pour retirer cette autorisation et revenir à la connexion par email, oubliez cet appareil.</p>
      <AlertDialog>
        <AlertDialogTrigger asChild><Button variant="outline" className="w-full rounded-xl" disabled={busy}>Oublier cet appareil</Button></AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Oublier le code sur ce téléphone ?</AlertDialogTitle>
            <AlertDialogDescription>Le code et l’autorisation de cet appareil seront supprimés. Vous serez déconnecté et devrez utiliser votre email et mot de passe pour enregistrer un nouveau code.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={forget}>Oublier et me déconnecter</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
