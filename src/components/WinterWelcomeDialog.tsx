import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Snowflake, ArrowRight } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useSession } from '@/components/SessionContextProvider';
import ThermoSyncPromoDialog from '@/components/ThermoSyncPromoDialog';
import { supabase } from '@/integrations/supabase/client';
import { WINTER_FORM_PATH, WINTER_SEASON, isWinterSeasonActive } from '@/lib/winter-season';
import './winter-welcome.css';

type WinterWelcomeDialogProps = { previewOpen?: boolean; onPreviewClose?: () => void };
const dashboardPaths = ['/', '/home-v3', '/home-v2', '/home-classic'];

const WinterWelcomeDialog = ({ previewOpen, onPreviewClose }: WinterWelcomeDialogProps) => {
  const manualPreview = previewOpen !== undefined;
  const { session, profile } = useSession();
  const navigate = useNavigate();
  const { pathname, key: navigationKey } = useLocation();
  const [open, setOpen] = useState(false);
  const isDashboard = dashboardPaths.includes(pathname);
  const eligible = !!profile && !profile.is_banned && !['housekeeper', 'accountant'].includes(profile.role || '');
  const userId = session?.user.id;
  const seasonActive = isWinterSeasonActive();
  const visible = manualPreview ? !!previewOpen : open;

  useEffect(() => {
    setOpen(false);
    if (manualPreview || !isDashboard || !eligible || !userId || !seasonActive) return;
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      const { error } = await supabase.from('winter_intro_views').insert({ user_id: userId, season: WINTER_SEASON });
      if (error) {
        if (error.code !== '23505') console.error('[winter-intro] Impossible de vérifier le premier affichage', error);
        return;
      }
      if (!cancelled) setOpen(true);
    }, 100);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [manualPreview, isDashboard, eligible, userId, navigationKey, seasonActive]);

  useEffect(() => {
    if (!visible || manualPreview) return;
    const timer = window.setTimeout(() => setOpen(false), 6200);
    return () => window.clearTimeout(timer);
  }, [visible, manualPreview]);

  const dismiss = () => {
    if (manualPreview) onPreviewClose?.();
    else setOpen(false);
  };

  if (!manualPreview && (!isDashboard || !seasonActive)) return <ThermoSyncPromoDialog />;
  if (!manualPreview && !eligible) return null;

  return <Dialog open={visible} onOpenChange={value => { if (!value) dismiss(); }}>
    <DialogContent className="winter-scene !left-0 !top-0 flex h-[100dvh] w-screen !max-w-none !translate-x-0 !translate-y-0 items-center justify-center overflow-hidden rounded-none border-0 bg-slate-950 p-6 text-white shadow-none sm:!rounded-none [&>button]:right-6 [&>button]:top-6 [&>button]:z-20 [&>button]:text-white">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="winter-aurora absolute -inset-1/2 bg-[radial-gradient(ellipse_at_center,_rgba(56,189,248,0.25),_transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,_rgba(8,145,178,0.18),_transparent_65%)]" />
        <div className="winter-frost winter-frost-left absolute inset-y-0 left-0 w-1/2 border-r border-white/10 bg-gradient-to-r from-sky-100/20 via-sky-200/5 to-transparent backdrop-blur-xl" />
        <div className="winter-frost winter-frost-right absolute inset-y-0 right-0 w-1/2 border-l border-white/10 bg-gradient-to-l from-sky-100/20 via-sky-200/5 to-transparent backdrop-blur-xl" />
        {Array.from({ length: 24 }, (_, index) => <span key={index} className="winter-drift absolute rounded-full bg-sky-100/60" style={{ left: `${(index * 43) % 100}%`, top: `${(index * 29) % 100}%`, width: `${2 + index % 3}px`, height: `${2 + index % 3}px`, animationDelay: `${index % 7 * -0.6}s`, animationDuration: `${6 + index % 5}s` }} />)}
        <svg viewBox="0 0 1440 240" preserveAspectRatio="none" className="absolute bottom-0 h-32 w-full text-sky-200/5 sm:h-56"><path fill="currentColor" d="M0 240V170L170 110 270 140 440 40 580 140 720 95 920 160 1080 55 1200 120 1320 70 1440 160V240Z" /><path d="M0 170L170 110 270 140 440 40 580 140 720 95 920 160 1080 55 1200 120 1320 70 1440 160" fill="none" stroke="currentColor" strokeWidth="2" /></svg>
      </div>
      <div className="relative z-10 max-h-[calc(100dvh-120px)] w-full max-w-2xl overflow-y-auto px-2 py-2 text-center">
        <p className="winter-scene-label text-[10px] font-semibold uppercase tracking-[0.4em] text-sky-200/80 sm:text-xs">Hello Keys · Une nouvelle saison</p>
        <div className="relative mx-auto my-7 flex h-24 w-24 items-center justify-center sm:my-9 sm:h-32 sm:w-32">
          <span aria-hidden="true" className="winter-crystal-ring absolute inset-0 rounded-full border border-sky-200/20" />
          <Snowflake aria-hidden="true" className="winter-crystal h-16 w-16 text-sky-100 sm:h-20 sm:w-20" strokeWidth={1} />
        </div>
        <DialogTitle className="winter-scene-title text-4xl font-light tracking-tight sm:text-6xl">L’hiver s’installe.<span className="mt-2 block font-semibold text-sky-100">Votre sérénité reste.</span></DialogTitle>
        <DialogDescription className="winter-scene-details mx-auto mt-6 max-w-md text-sm leading-relaxed text-sky-100/80 sm:text-base">Préparez votre logement pour l’hiver 2027.<br />Nos vacances : du <strong className="font-medium text-white">3 janvier au 5 février 2027</strong>.<br />Calendriers fermés à la location pendant cette période.</DialogDescription>
        <div className="winter-scene-actions mt-7 flex flex-wrap justify-center gap-3">
          <Button className="rounded-full bg-sky-100 px-6 text-slate-950 hover:bg-white" onClick={() => { dismiss(); navigate(WINTER_FORM_PATH); }}>Préparer mon logement<ArrowRight className="ml-2 h-4 w-4" /></Button>
          <Button variant="ghost" className="rounded-full text-sky-100 hover:bg-white/10 hover:text-white" onClick={dismiss}>Accéder au dashboard</Button>
        </div>
      </div>
      {!manualPreview && <div className="absolute inset-x-6 bottom-6 z-10 sm:inset-x-12">
        <p className="mb-3 text-center text-[10px] uppercase tracking-[0.2em] text-sky-200/50">Votre dashboard se dévoile dans un instant</p>
        <div className="mx-auto h-px max-w-xs overflow-hidden bg-white/10"><div className="winter-scene-progress h-full origin-left bg-sky-200/70" /></div>
      </div>}
    </DialogContent>
  </Dialog>;
};
export default WinterWelcomeDialog;
