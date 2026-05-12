import { Wrench } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const ConnectivityMaintenanceAlert = () => {
  return (
    <Alert className="border-amber-200 bg-amber-50 text-amber-950">
      <Wrench className="h-4 w-4 text-amber-700" />
      <AlertTitle>Maintenance en cours</AlertTitle>
      <AlertDescription>
        Opération de maintenance sur l&apos;API de connectivité. Nos techniciens font le maximum pour rétablir la situation.
      </AlertDescription>
    </Alert>
  );
};

export default ConnectivityMaintenanceAlert;
