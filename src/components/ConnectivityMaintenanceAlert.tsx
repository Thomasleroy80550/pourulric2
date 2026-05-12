import { Link } from "react-router-dom";
import { ArrowRight, Wrench } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

const ConnectivityMaintenanceAlert = () => {
  return (
    <Alert className="border-amber-200 bg-amber-50 text-amber-950">
      <Wrench className="h-4 w-4 text-amber-700" />
      <AlertTitle>Maintenance en cours</AlertTitle>
      <AlertDescription className="mt-2">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p>
            Opération de maintenance sur l&apos;API de connectivité. Nos techniciens font le maximum pour rétablir la situation.
          </p>
          <Button asChild size="sm" variant="outline" className="border-amber-300 bg-white/80 text-amber-900 hover:bg-white">
            <Link to="/maintenance/connectivite">
              Voir les détails
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
};

export default ConnectivityMaintenanceAlert;
