import { useEffect, useState } from 'react';
import { BadgeCheck, Pause, Play, Star } from 'lucide-react';
import DOMPurify from 'dompurify';
import { Button } from '@/components/ui/button';
import { getPublicReviews, PublicReviewsSummary } from '@/lib/public-reviews-api';

export default function ReviewsEmbedPage() {
  const [summary, setSummary] = useState<PublicReviewsSummary | null>(null);
  const [error, setError] = useState(false);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const elements = [document.body, document.documentElement];
    const backgrounds = elements.map((element) => element.style.background);
    elements.forEach((element) => { element.style.background = 'transparent'; });
    return () => elements.forEach((element, i) => { element.style.background = backgrounds[i]; });
  }, []);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(media.matches);
    const onChange = () => setReducedMotion(media.matches);
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    let active = true;
    let fetching = false;
    const refresh = async () => {
      if (fetching) return;
      fetching = true;
      try {
        const data = await getPublicReviews();
        if (active) {
          setSummary(data);
          setIndex((current) => data.reviews.length ? current % data.reviews.length : 0);
          setError(false);
        }
      } catch {
        if (active) setError(true);
      } finally {
        fetching = false;
      }
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') void refresh();
    };
    void refresh();
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') void refresh();
    }, 30000);
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      active = false;
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, []);

  const count = summary?.reviews.length ?? 0;
  useEffect(() => {
    if (count < 2 || paused || hovered || focused || reducedMotion) return;
    const timer = window.setInterval(() => setIndex((current) => (current + 1) % count), 6500);
    return () => window.clearInterval(timer);
  }, [count, paused, hovered, focused, reducedMotion]);

  const review = summary?.reviews[index];
  const comment = review ? DOMPurify.sanitize(review.comment, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] }) : '';

  return (
    <main className="w-full bg-transparent p-2 font-sans text-slate-900">
      <section
        className="mx-auto w-full max-w-[440px] overflow-hidden rounded-2xl border border-white/80 bg-white/95 shadow-[0_4px_16px_rgba(15,23,42,0.10)]"
        aria-label="Avis clients Hello Keys"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onFocusCapture={() => setFocused(true)}
        onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false); }}
      >
        <div className="flex h-[76px] items-center gap-3 px-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
            <BadgeCheck className="h-6 w-6" aria-hidden="true" />
          </div>
          {error ? <p role="alert" className="text-xs text-slate-500">Avis momentanément indisponibles</p> : !summary ? (
            <p role="status" className="animate-pulse text-xs text-slate-500">Chargement des avis…</p>
          ) : (
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span aria-live="polite" className="whitespace-nowrap text-xl font-bold tracking-tight">{summary.favorableTotal > 0 ? summary.average.toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : '—'}<span className="text-xs font-medium text-slate-400"> / 10</span></span>
                {summary.favorableTotal > 0 && <div className="flex gap-0.5" aria-label={`${summary.average} sur 10`}>
                  {Array.from({ length: 5 }, (_, i) => (
                    <span key={i} className="relative h-3.5 w-3.5">
                      <Star aria-hidden="true" className="absolute h-3.5 w-3.5 fill-slate-200 text-slate-200" />
                      <span className="absolute inset-y-0 left-0 overflow-hidden" style={{ width: `${Math.max(0, Math.min(1, summary.average / 2 - i)) * 100}%` }}><Star aria-hidden="true" className="h-3.5 w-3.5 fill-amber-400 text-amber-400" /></span>
                    </span>
                  ))}
                </div>}
                <span title="Actualisation toutes les 30 secondes depuis les avis enregistrés" className="inline-flex items-center gap-1 text-[9px] font-semibold text-emerald-600"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500 motion-safe:animate-pulse" /> EN LIVE</span>
              </div>
              <p className="mt-0.5 text-[11px] text-slate-500"><strong className="font-semibold text-slate-700">{summary.total.toLocaleString('fr-FR')} avis clients au total</strong> · Hello Keys</p>
            </div>
          )}
        </div>
        {review && (
          <div className="flex h-[46px] items-center gap-2 border-t border-slate-100 bg-slate-50/80 px-4">
            <p key={review.id} title={comment} className="min-w-0 flex-1 truncate text-[11px] italic text-slate-600 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-1 motion-safe:duration-500">« {comment} »</p>
            {count > 1 && !reducedMotion && (
              <Button size="icon" variant="ghost" className="h-6 w-6 shrink-0 rounded-full text-slate-400 hover:bg-slate-200 hover:text-slate-700" onClick={() => setPaused(!paused)} aria-label={paused ? 'Reprendre le défilement des avis' : 'Mettre le défilement des avis en pause'}>
                {paused ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
              </Button>
            )}
          </div>
        )}
        {summary && <p className="border-t border-slate-100 px-4 py-1 text-[9px] text-slate-400">Moyenne des {summary.favorableTotal.toLocaleString('fr-FR')} avis favorables (≥ 8/10)</p>}
      </section>
    </main>
  );
}
