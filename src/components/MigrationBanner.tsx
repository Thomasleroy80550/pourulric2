import { AlertTriangle, CalendarDays } from "lucide-react";

export default function MigrationBanner() {
  return (
    <aside
      aria-label="Information sur la migration du logiciel"
      className="relative z-50 w-full border-b border-red-800 bg-gradient-to-r from-red-800 via-red-700 to-red-800 px-4 py-3 text-white shadow-md print:hidden"
    >
      <div className="mx-auto flex max-w-7xl items-start gap-3 sm:items-center sm:gap-4">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/20 bg-white/10" aria-hidden="true">
          <AlertTriangle className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <strong className="text-sm font-semibold tracking-wide">Migration du logiciel</strong>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/15 px-2.5 py-0.5 text-xs font-semibold">
              <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
              Du 16 au 18 novembre
            </span>
          </div>
          <p className="text-xs leading-relaxed text-red-50 sm:text-sm">
            <strong className="font-semibold text-white">Aucun support client ne sera assuré pendant cette période.</strong> Nos équipes seront principalement mobilisées pour le transfert de toutes les données. Le statut du transfert sera visible sur la plateforme. <strong className="font-semibold text-white">La plateforme propriétaire sera indisponible pendant la période du transfert.</strong>
          </p>
        </div>
      </div>
    </aside>
  );
}
