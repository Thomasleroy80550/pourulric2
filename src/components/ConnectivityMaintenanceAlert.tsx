import { Link } from "react-router-dom";
import { ArrowRight, Sparkles } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

const ConnectivityMaintenanceAlert = () => {
  return (
    <Alert className="border-orange-300 bg-gradient-to-r from-orange-50 to-amber-50 text-orange-950 shadow-sm">
      <Sparkles className="h-4 w-4 text-orange-700" />
      <AlertTitle className="flex flex-wrap items-center gap-2 text-base">
        <span className="inline-flex items-center rounded-full bg-orange-100 px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-orange-800">
          Nouveau
        </span>
        Thermo Sync est enfin disponible
      </AlertTitle>
      <AlertDescription className="mt-2">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p>
            Découvrez la nouvelle solution pour piloter le chauffage de vos locations courte durée et accéder au site officiel en un clic.
          </p>
          <Button asChild size="sm" variant="outline" className="border-orange-300 bg-white/90 text-orange-900 hover:bg-white">
            <Link to="/thermo-sync">
              Voir la news
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
};

export default ConnectivityMaintenanceAlert;
