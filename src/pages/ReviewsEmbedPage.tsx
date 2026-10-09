import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, MessageSquareQuote, Pause, Play, Star } from 'lucide-react';
import DOMPurify from 'dompurify';
import { Button } from '@/components/ui/button';
import { getPublicReviews, PublicReviewsSummary } from '@/lib/public-reviews-api';

const sources: Record<string, string> = {
  AIRBNB: 'Airbnb', BOOKING: 'Booking.com', HOMEAWAY: 'Abritel', VRBO: 'Vrbo',
  EXPEDIA: 'Expedia', DIRECT: 'Direct', BE: 'Site web', GOOGLE: 'Google',
};

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex gap-1 text-amber-500" aria-label={`${rating} sur 5`}>
      {Array.from({ length: 5 }, (_, i) => (
        <Star key={i} aria-hidden="true" className={`h-5 w-5 ${i < Math.round(rating) ? 'fill-amber-400' : 'text-slate-200'}`} />
      ))}
    </div>
  );
}

export default function ReviewsEmbedPage() {
  const [summary, setSummary] = useState<PublicReviewsSummary | null>(null);
  const [error, setError] = useState(false);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(media.matches);
    const onChange = () => setReducedMotion(media.matches);
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    let active = true;
    getPublicReviews().then((data) => {
      if (active) setSummary(data);
    }).catch(() => {
      if (active) setError(true);
    });
    return () => { active = false; };
  }, []);

  const count = summary?.reviews.length ?? 0;
  useEffect(() => {
    if (count < 2 || paused || hovered || focused || reducedMotion) return;
    const timer = window.setInterval(() => setIndex((current) => (current + 1) % count), 6500);
    return () => window.clearInterval(timer);
  }, [count, paused, hovered, focused, reducedMotion]);

  const review = summary?.reviews[index];
  const move = (step: number) => setIndex((current) => (current + step + count) % count);

  return (
    <main className="w-full bg-white p-3 text-slate-900 sm:p-5">
      <section className="mx-auto max-w-5xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm" aria-label="Avis clients Hello Keys">
        <div className="bg-gradient-to-br from-teal-50 via-white to-amber-50 px-5 py-6 sm:px-8">
          <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-teal-700"><MessageSquareQuote className="h-4 w-4" /> Hello Keys · Avis clients</p>
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Ils nous ont fait confiance</h1>
          {error ? (
            <p role="alert" className="mt-4 text-sm text-slate-500">Les avis sont momentanément indisponibles.</p>
          ) : !summary ? (
            <p role="status" className="mt-4 animate-pulse text-sm text-slate-500">Chargement des avis…</p>
          ) : (
            <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-3">
              <div className="flex items-baseline gap-1"><span className="text-4xl font-bold">{summary.total > 0 ? summary.average.toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : '—'}</span><span className="text-sm text-slate-500">/ 5</span></div>
              {summary.total > 0 && <Stars rating={summary.average} />}
              <p className="text-sm text-slate-600"><strong className="text-slate-900">{summary.total.toLocaleString('fr-FR')}</strong> avis clients<br /><span className="text-xs">Moyenne sur l’ensemble des avis</span></p>
            </div>
          )}
        </div>
        {summary && (
          <div className="px-5 py-5 sm:px-8" onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} onFocusCapture={() => setFocused(true)} onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false); }}>
            {review ? (
              <>
                <div className="mb-3 flex items-center justify-between gap-3">
                  <Stars rating={review.rating} />
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">{sources[review.source.toUpperCase()] ?? 'Avis voyageur'}</span>
                </div>
                <div className="h-40 overflow-y-auto rounded-xl bg-slate-50 p-4" tabIndex={0} aria-label="Commentaire client">
                  <blockquote className="whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-700">« {DOMPurify.sanitize(review.comment, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] })} »</blockquote>
                </div>
                <div className="mt-3 flex items-center justify-between gap-3">
                  <p className="text-xs text-slate-500">Sélection d’avis favorables · {index + 1}/{count}</p>
                  {count > 1 && <div className="flex items-center gap-1">
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-600 hover:bg-slate-100 hover:text-slate-900" onClick={() => move(-1)} aria-label="Avis précédent"><ChevronLeft className="h-4 w-4" /></Button>
                    {!reducedMotion && <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-600 hover:bg-slate-100 hover:text-slate-900" onClick={() => setPaused(!paused)} aria-label={paused ? 'Reprendre le défilement' : 'Mettre le défilement en pause'}>{paused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}</Button>}
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-600 hover:bg-slate-100 hover:text-slate-900" onClick={() => move(1)} aria-label="Avis suivant"><ChevronRight className="h-4 w-4" /></Button>
                  </div>}
                </div>
              </>
            ) : <p className="py-6 text-sm text-slate-500">{summary.total === 0 ? 'Aucun avis client pour le moment.' : 'Aucun commentaire favorable à afficher pour le moment.'}</p>}
          </div>
        )}
      </section>
    </main>
  );
}
