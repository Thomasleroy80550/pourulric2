import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Snowflake, CalendarDays, ArrowRight, Home } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useSession } from '@/components/SessionContextProvider';
import ThermoSyncPromoDialog from '@/components/ThermoSyncPromoDialog';
import { WINTER_FORM_PATH, WINTER_NOTICE, WINTER_SEASON } from '@/lib/winter-season';
import './winter-welcome.css';

const WinterWelcomeDialog = () => {
  const { session, profile } = useSession();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const [showPromo, setShowPromo] = useState(false);
  const userId = session?.user.id;
  const isClient = !!profile && !['admin', 'housekeeper', 'accountant'].includes(profile.role || '');
  const storageKey = `hk-winter-welcome-2027-${userId}`;

  useEffect(() => {
    setOpen(false);
    setShowPromo(false);
    if (!isClient || !userId) return;
    if (Date.now() >= new Date('2027-02-06T00:00:00+01:00').getTime()) {
      setShowPromo(true);
      return;
    }
    let seen = false;
    try { seen = localStorage.getItem(storageKey) === '1'; } catch { /* Le dialogue reste disponible sans stockage. */ }
    if (seen) { setShowPromo(true); return; }
    if (pathname === WINTER_FORM_PATH || pathname === '/hivernage-2026') return;
    const timer = window.setTimeout(() => setOpen(true), 650);
    return () => window.clearTimeout(timer);
  }, [isClient, userId, storageKey, pathname]);

  const dismiss = () => {
    try { localStorage.setItem(storageKey, '1'); } catch { /* Le navigateur peut refuser le stockage local. */ }
    setOpen(false);
  };

  if (!isClient) return null;
  if (showPromo) return <ThermoSyncPromoDialog />;

  return <Dialog open={open} onOpenChange={value => { if (!value) dismiss(); }}>
    <DialogContent className="max-h-[90dvh] overflow-y-auto overflow-x-hidden rounded-3xl border-sky-200 p-0 sm:max-w-xl">
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-sky-950 to-cyan-900 px-6 pb-8 pt-10 text-white sm:px-9">
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">{Array.from({ length: 16 }, (_, index) => <Snowflake key={index} className="winter-entry-flake absolute -top-8 text-sky-100/40" style={{ left: `${(index * 37) % 100}%`, width: `${12 + index % 4 * 5}px`, animationDelay: `${index % 6 * -0.9}s`, animationDuration: `${5 + index % 4}s` }} />)}</div>
        <div className="relative winter-entry-content">
          <span className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-200">Hello Keys · Hiver {WINTER_SEASON}</span>
          <div className="winter-entry-emblem my-6 flex h-20 w-20 items-center justify-center rounded-3xl border border-white/20 bg-white/10"><Snowflake className="h-11 w-11 text-sky-100" /></div>
          <DialogTitle className="text-3xl font-bold tracking-tight sm:text-4xl">On passe en mode hiver.</DialogTitle>
          <DialogDescription className="mt-3 text-base leading-relaxed text-sky-100">Un logement bien préparé, un hiver plus serein. Prenez un instant pour nous partager vos préférences.</DialogDescription>
        </div>
      </div>
      <div className="space-y-5 px-6 pb-6 sm:px-9 sm:pb-8">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl bg-muted/60 p-4"><Home className="mb-2 h-5 w-5 text-sky-600" /><p className="text-sm font-semibold">Votre fermeture hivernale</p><p className="mt-1 text-xs text-muted-foreground">Choisissez si vous souhaitez fermer et précisez vos dates.</p></div>
          <div className="rounded-xl bg-muted/60 p-4"><CalendarDays className="mb-2 h-5 w-5 text-sky-600" /><p className="text-sm font-semibold">Nos vacances</p><p className="mt-1 text-xs text-muted-foreground">Du 3 janvier au 5 février 2027.</p></div>
        </div>
        <p className="text-sm leading-relaxed text-muted-foreground">{WINTER_NOTICE}</p>
        <Button className="w-full bg-sky-700 text-white hover:bg-sky-800" onClick={() => { dismiss(); navigate(WINTER_FORM_PATH); }}>Préparer mon logement<ArrowRight className="ml-2 h-4 w-4" /></Button>
        <Button className="w-full" variant="ghost" onClick={dismiss}>Je le ferai plus tard</Button>
      </div>
    </DialogContent>
  </Dialog>;
};
export default WinterWelcomeDialog;
