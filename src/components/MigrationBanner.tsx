import { AlertTriangle, CalendarDays, CheckCircle2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function MigrationBanner() {
  return (
    <Dialog>
      <aside
        aria-label="Information sur la migration du logiciel"
        className="relative z-50 w-full border-b border-red-800 bg-gradient-to-r from-red-800 via-red-700 to-red-800 px-3 py-1.5 text-white print:hidden"
      >
        <div className="mx-auto flex max-w-7xl items-center justify-center gap-2 text-xs leading-5 sm:gap-3 sm:text-sm">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <p
            className="min-w-0 truncate"
            title="Migration du 16 au 18 novembre : support client et plateforme propriétaire indisponibles."
          >
            Migration du <strong>16 au 18 novembre</strong> : support client et plateforme propriétaire indisponibles.
          </p>
          <DialogTrigger asChild>
            <button
              type="button"
              className="shrink-0 rounded-sm font-bold underline decoration-white/60 underline-offset-4 transition-colors hover:text-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-red-700"
            >
              En savoir plus
            </button>
          </DialogTrigger>
        </div>
      </aside>

      <DialogContent className="max-h-[85dvh] w-[calc(100%-2rem)] max-w-2xl overflow-y-auto rounded-xl p-5 sm:p-7">
        <DialogHeader className="text-left">
          <DialogTitle className="pr-6 text-xl leading-snug">Notre logiciel hôtelier arrive ! 🎉</DialogTitle>
          <DialogDescription>
            Une nouvelle étape pour Hello Keys : la migration de vos données du 16 au 18 novembre.
          </DialogDescription>
        </DialogHeader>

        <section className="space-y-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-950">
          <h2 className="flex items-center gap-2 font-bold">
            <CalendarDays className="h-4 w-4 shrink-0" aria-hidden="true" />
            Migration du 16 au 18 novembre
          </h2>
          <p>Nos équipes seront principalement mobilisées pour le transfert de toutes les données vers notre nouveau logiciel.</p>
          <ul className="list-disc space-y-1.5 pl-5">
            <li><strong>Aucun support client ne sera assuré</strong> pendant cette période.</li>
            <li><strong>La plateforme propriétaire sera indisponible</strong> pendant le transfert.</li>
            <li>Le statut du transfert sera visible sur la plateforme.</li>
          </ul>
          <p>Merci pour votre patience et votre compréhension durant cette transition.</p>
        </section>

        <article className="space-y-4 text-sm leading-relaxed text-muted-foreground">
          <header className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-red-700">Information</p>
            <h2 className="text-lg font-bold text-foreground">Hello Keys lance son logiciel hôtelier ! 🎉</h2>
            <p className="text-xs">27 août 2026</p>
          </header>
          <p>Nous sommes fiers de vous annoncer que nous avons officiellement passé avec succès les certifications nécessaires au déploiement progressif de notre propre logiciel hôtelier ! 🎉</p>
          <p>Cette réussite marque le fruit de longs mois de travail, d’exigence et d’engagement de toute notre équipe.</p>
          <p>✍️ Et ce n’est pas tout : nous venons également de signer un contrat de connectivité, qui nous permettra d’interconnecter notre solution avec les principales plateformes du marché et d’offrir une expérience toujours plus fluide à nos clients et partenaires.</p>
          <div className="space-y-2">
            <p className="font-semibold text-foreground">Concrètement, cela signifie :</p>
            <ul className="space-y-2">
              {[
                "Une gestion hôtelière optimisée et sur mesure",
                "Une synchronisation en temps réel avec les canaux de réservation",
                "Plus d’autonomie, de fiabilité et de performance pour nos utilisateurs",
              ].map((benefit) => (
                <li key={benefit} className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
                  <span>{benefit}</span>
                </li>
              ))}
            </ul>
          </div>
          <p>Le déploiement se fera progressivement dans les semaines à venir, avec un accompagnement personnalisé pour chacun de nos clients.</p>
          <p>Merci à nos équipes, nos partenaires et nos clients pour leur confiance.</p>
          <p className="font-semibold text-foreground">🙏 L’aventure ne fait que commencer !</p>
        </article>
      </DialogContent>
    </Dialog>
  );
}
