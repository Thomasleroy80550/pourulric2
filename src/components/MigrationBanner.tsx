import { Info } from "lucide-react";

export default function MigrationBanner() {
  return (
    <aside
      aria-label="Information sur la migration du logiciel"
      className="relative z-50 w-full border-b border-amber-300 bg-amber-100 px-4 py-2 text-amber-950 print:hidden"
    >
      <div className="mx-auto flex max-w-7xl items-start justify-center gap-2 text-xs leading-relaxed sm:text-sm">
        <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <p>
          <strong>Migration du logiciel du 16 au 18 novembre :</strong> aucun support client ne sera assuré pendant cette période. Nos équipes seront principalement mobilisées pour le transfert de toutes les données. Le statut du transfert sera visible sur la plateforme. <strong>La plateforme propriétaire sera indisponible pendant la période du transfert.</strong>
        </p>
      </div>
    </aside>
  );
}
