import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Snowflake, ArrowRight, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import WinterWelcomeDialog from '@/components/WinterWelcomeDialog';
import { WINTER_FORM_PATH, WINTER_SEASON } from '@/lib/winter-season';

export default function WinterSeasonBanner() {
  const [previewOpen, setPreviewOpen] = useState(false);
  return <>
    <section className="relative mb-6 overflow-hidden rounded-2xl bg-gradient-to-br from-slate-950 via-sky-950 to-cyan-900 p-5 text-white sm:p-6" aria-label="Préparation hivernale">
      <Snowflake aria-hidden="true" className="pointer-events-none absolute -right-4 -top-4 h-32 w-32 text-white/10" />
      <div className="relative flex flex-wrap items-center justify-between gap-5">
        <div>
          <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-sky-200"><Snowflake className="h-4 w-4" />Hiver {WINTER_SEASON}</p>
          <h2 className="text-xl font-bold">Préparons votre logement pour l’hiver</h2>
          <p className="mt-2 max-w-xl text-sm text-sky-100">Vos dates de fermeture et vos consignes pour les vacances Hello Keys du 3 janvier au 5 février 2027.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild className="bg-white text-sky-950 hover:bg-sky-100"><Link to={WINTER_FORM_PATH}>Ouvrir le formulaire<ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
          <Button variant="outline" className="border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white" onClick={() => setPreviewOpen(true)}><Play className="mr-2 h-4 w-4" />Voir l’animation</Button>
        </div>
      </div>
    </section>
    <WinterWelcomeDialog previewOpen={previewOpen} onPreviewClose={() => setPreviewOpen(false)} />
  </>;
}
