import { AlertTriangle, CalendarDays } from "lucide-react";

interface KrossbookingMaintenanceNoticeProps {
  className?: string;
}

const KrossbookingMaintenanceNotice = ({ className = "" }: KrossbookingMaintenanceNoticeProps) => {
  return (
    <section
      className={`rounded-2xl border border-amber-300 bg-amber-50 p-4 text-amber-950 shadow-sm ${className}`}
      aria-label="Maintenance Krossbooking"
    >
      <div className="flex gap-3">
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-200 text-amber-800">
          <AlertTriangle className="h-5 w-5" />
        </div>
        <div className="space-y-2 text-sm leading-relaxed">
          <div>
            <p className="text-base font-semibold">Incident en cours chez notre prestataire Krossbooking</p>
            <p className="mt-1 font-medium">Nous rencontrons une nouvelle coupure provenant de notre prestataire.</p>
          </div>

          <p>
            Inutile de nous envoyer des messages ou d'appeler notre service technique : notre équipe est déjà sur le problème.
          </p>

          <div className="flex gap-2 rounded-xl bg-white/70 p-3 text-amber-900">
            <CalendarDays className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              Les réservations restent consultables dans le calendrier, onglet <span className="font-semibold">iCal</span>.
            </p>
          </div>

          <p>
            Nous faisons de notre mieux pour rétablir la situation. Le dysfonctionnement ne vient pas de chez nous, mais de notre prestataire.
          </p>
        </div>
      </div>
    </section>
  );
};

export default KrossbookingMaintenanceNotice;
