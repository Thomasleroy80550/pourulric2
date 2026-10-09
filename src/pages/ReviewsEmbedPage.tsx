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
      <section className="mx-auto flex h-[80px] w-full max-w-[360px] items-center gap-3 rounded-full border border-white/80 bg-white px-5 shadow-[0_4px_16px_rgba(15,23,42,0.12)]" aria-label="Satisfaction clients Hello Keys">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-amber-50">
          <Star className="h-6 w-6 fill-amber-400 text-amber-400" aria-hidden="true" />
        </div>
        {error ? <p role="alert" className="text-xs text-slate-500">Avis indisponibles</p> : !summary ? (
          <p role="status" className="animate-pulse text-xs text-slate-500">Chargement…</p>
        ) : (
          <div aria-live="polite" className="min-w-0">
            <p className="text-3xl font-extrabold tracking-tight text-slate-900">{summary.globalAverage !== null ? summary.globalAverage.toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : '—'}<span className="text-sm font-semibold text-slate-400">/10</span></p>
            <p className="text-xs font-medium text-slate-600">{summary.total.toLocaleString('fr-FR')} avis clients</p>
          </div>
        )}
      </section>
    </main>
  );
}
