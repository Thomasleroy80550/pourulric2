import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Ban } from "lucide-react";

const SuspendedAccountMessage = () => {
  return (
    <div className="container mx-auto py-10">
      <Alert variant="destructive">
        <Ban className="h-4 w-4" />
        <AlertTitle>Accès restreint</AlertTitle>
        <AlertDescription>
          Votre compte est actuellement suspendu pour manquement de paiement. L'accès à cette section a été temporairement désactivé.
          <br />
          Veuillez contacter le support pour régulariser votre situation et retrouver un accès complet à nos services.
        </AlertDescription>
      </Alert>
    </div>
  );
};

export default SuspendedAccountMessage;