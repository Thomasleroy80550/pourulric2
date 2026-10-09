import { useEffect, useState } from 'react';
import { Star } from 'lucide-react';
import { getPublicReviews, PublicReviewsSummary } from '@/lib/public-reviews-api';

export default function ReviewsEmbedPage() {
  const [summary, setSummary] = useState<PublicReviewsSummary | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const elements = [document.body, document.documentElement];
    const backgrounds = elements.map((element) => element.style.background);
    elements.forEach((element) => { element.style.background = 'transparent'; });
    return () => elements.forEach((element, i) => { element.style.background = backgrounds[i]; });
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

  return (
    <main className="w-full bg-transparent p-2 font-sans text-slate-900">
      <section className="mx-auto flex h-[80px] w-full max-w-[360px] items-center justify-center rounded-2xl border border-slate-100 bg-white px-4 shadow-[0_4px_16px_rgba(15,23,42,0.10)]" aria-label="Satisfaction clients Hello Keys">
        {error ? <p role="alert" className="text-xs text-slate-500">Avis indisponibles</p> : !summary ? (
          <p role="status" className="animate-pulse text-xs text-slate-500">Chargement…</p>
        ) : (
          <div aria-live="polite" className="flex w-full min-w-0 items-center justify-center gap-4">
            <p className="shrink-0 whitespace-nowrap text-3xl font-bold tracking-tight text-slate-900">{summary.badgeAverage !== null ? summary.badgeAverage.toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : '—'}<span className="ml-0.5 text-sm font-medium text-slate-400">/10</span></p>
            <div className="h-8 w-px shrink-0 bg-slate-200" aria-hidden="true" />
            <div className="min-w-0 space-y-1.5">
              {summary.badgeAverage !== null && (
                <div className="flex gap-1" aria-hidden="true">
                  {Array.from({ length: 5 }, (_, i) => (
                    <Star key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                  ))}
                </div>
              )}
              <p className="text-[11px] leading-tight text-slate-500"><span className="font-semibold text-slate-900">{summary.total.toLocaleString('fr-FR')}</span> avis au total</p>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
