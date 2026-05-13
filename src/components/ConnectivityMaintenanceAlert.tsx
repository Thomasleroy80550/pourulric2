import { Link } from "react-router-dom";
import { ArrowRight, Wrench } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

const ConnectivityMaintenanceAlert = () => {
  return (
    <Alert className="border-emerald-200 bg-gradient-to-r from-emerald-50 to-amber-50 text-amber-950 shadow-sm">
      <Wrench className="h-4 w-4 text-emerald-700" />
      <AlertTitle className="flex flex-wrap items-center gap-2 text-base">
        <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-emerald-800">
          Mise à jour effectuée
        </span>
        Nouvelle mise à jour connectivité disponible
      </AlertTitle>
      <AlertDescription className="mt-2">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p>
            La nouvelle vue planning iCal est maintenant en ligne. La maintenance continue sur l&apos;API de connectivité, mais vous pouvez déjà suivre les dernières avancées.
          </p>
          <Button asChild size="sm" variant="outline" className="border-emerald-300 bg-white/90 text-emerald-900 hover:bg-white">
            <Link to="/maintenance/connectivite">
              Voir la mise à jour
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
};

export default ConnectivityMaintenanceAlert;
