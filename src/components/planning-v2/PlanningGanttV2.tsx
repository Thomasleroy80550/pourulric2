"use client";

import React, { useMemo, useRef, useState, useEffect } from 'react';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  addMonths,
  subMonths,
  addDays,
  differenceInDays,
  isSameDay,
  parseISO,
  isValid,
  startOfDay,
} from 'date-fns';
import { fr } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, CalendarDays, Search, Repeat, LogIn, LogOut, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { UserRoom } from '@/lib/user-room-api';
import { KrossbookingReservation } from '@/lib/krossbooking';

/* -------------------------------------------------------------------------- */
/*  Constantes de layout (desktop) — versions mobiles calculées plus bas      */
/* -------------------------------------------------------------------------- */
const COL_WIDTH = 36; // largeur d'une colonne = 1 jour
const ROW_HEIGHT = 60; // hauteur d'une ligne logement
const LABEL_WIDTH = 240; // largeur de la colonne de gauche (sticky)
const BAR_HEIGHT = 34; // hauteur d'une barre de réservation
const HEADER_HEIGHT = 52; // hauteur de l'entête des jours
const MONTH_BAND_HEIGHT = 28; // hauteur du bandeau des mois

// Versions compactes pour mobile
const COL_WIDTH_MOBILE = 30;
const ROW_HEIGHT_MOBILE = 52;
const LABEL_WIDTH_MOBILE = 112;
const BAR_HEIGHT_MOBILE = 26;
const HEADER_HEIGHT_MOBILE = 44;
const MONTH_BAND_HEIGHT_MOBILE = 24;

/* -------------------------------------------------------------------------- */
/*  Couleurs par canal / source                                               */
/* -------------------------------------------------------------------------- */
type ChannelStyle = {
  label: string;
  bar: string; // couleur pleine (confirmée)
  barPending: string; // version claire (en attente)
  dot: string; // pastille légende
};

const CHANNELS: Record<string, ChannelStyle> = {
  // Couleurs officielles des marques
  BOOKING: { label: 'Booking.com', bar: 'bg-[#003580]', barPending: 'bg-[#003580]/40', dot: 'bg-[#003580]' },
  AIRBNB: { label: 'Airbnb', bar: 'bg-[#FF5A5F]', barPending: 'bg-[#FF5A5F]/40', dot: 'bg-[#FF5A5F]' },
  ABRITEL: { label: 'Abritel', bar: 'bg-[#1F66E5]', barPending: 'bg-[#1F66E5]/40', dot: 'bg-[#1F66E5]' },
  HOMEAWAY: { label: 'Abritel', bar: 'bg-[#1F66E5]', barPending: 'bg-[#1F66E5]/40', dot: 'bg-[#1F66E5]' },
  VRBO: { label: 'Vrbo', bar: 'bg-[#0E166E]', barPending: 'bg-[#0E166E]/40', dot: 'bg-[#0E166E]' },
  EXPEDIA: { label: 'Expedia', bar: 'bg-[#FFC72C]', barPending: 'bg-[#FFC72C]/40', dot: 'bg-[#FFC72C]' },
  DIRECT: { label: 'Direct', bar: 'bg-[#255f85]', barPending: 'bg-[#255f85]/40', dot: 'bg-[#255f85]' },
  HELLOKEYS: { label: 'Hello Keys', bar: 'bg-[#255f85]', barPending: 'bg-[#255f85]/40', dot: 'bg-[#255f85]' },
  PROPRI: { label: 'Propriétaire (ménage)', bar: 'bg-[#E11D48]', barPending: 'bg-[#E11D48]/40', dot: 'bg-[#E11D48]' },
  PROP0: { label: 'Propriétaire', bar: 'bg-[#64748B]', barPending: 'bg-[#64748B]/40', dot: 'bg-[#64748B]' },
  OWNER_BLOCK: { label: 'Bloqué', bar: 'bg-slate-400', barPending: 'bg-slate-300', dot: 'bg-slate-400' },
  BLOCKED: { label: 'Bloqué', bar: 'bg-slate-400', barPending: 'bg-slate-300', dot: 'bg-slate-400' },
  UNKNOWN: { label: 'Autre', bar: 'bg-slate-500', barPending: 'bg-slate-300', dot: 'bg-slate-500' },
};

// Palette pour les pastilles d'initiales des logements
const AVATAR_COLORS = [
  'bg-rose-500', 'bg-orange-500', 'bg-amber-500', 'bg-lime-500', 'bg-emerald-500',
  'bg-teal-500', 'bg-cyan-500', 'bg-blue-500', 'bg-indigo-500', 'bg-violet-500',
  'bg-fuchsia-500', 'bg-pink-500',
];

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */
const norm = (v?: string | number) => (v ?? '').toString().trim().toLowerCase();

const parseAmount = (amount?: string): number => {
  if (!amount) return 0;
  const cleaned = amount.replace(/[^0-9.,-]/g, '').replace(/\s/g, '').replace(',', '.');
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
};

const getChannelKey = (res: KrossbookingReservation): string => {
  const status = (res.status || '').toUpperCase();
  if (status === 'BLOCKED' || res.cod_channel === 'OWNER_BLOCK') return 'BLOCKED';
  if (status === 'PROPRI') return 'PROPRI';
  if (status === 'PROP0') return 'PROP0';
  return (res.channel_identifier || res.cod_channel || 'UNKNOWN').toUpperCase();
};

const getChannelStyle = (key: string): ChannelStyle => CHANNELS[key] || CHANNELS.UNKNOWN;

const isPendingRes = (res: KrossbookingReservation): boolean => {
  const status = (res.status || '').toUpperCase();
  return ['TENT', 'WAIT', 'OPTION', 'UNCONF', 'PENDING', 'REQUEST'].some((s) => status.includes(s));
};

const isCancelled = (res: KrossbookingReservation): boolean =>
  (res.status || '').toUpperCase().includes('CANC');

const getInitials = (name?: string): string => {
  if (!name) return '?';
  return name.trim().slice(0, 2).toUpperCase();
};

const avatarColorFor = (key: string): string => {
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = key.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
};

const isWeekend = (d: Date) => d.getDay() === 0 || d.getDay() === 6;

type ParsedRes = {
  res: KrossbookingReservation;
  checkIn: Date;
  checkOut: Date;
};

type Rotation = {
  roomKey: string;
  day: Date;
  dayIndex: number;
  departure: KrossbookingReservation;
  arrival: KrossbookingReservation;
};

/* -------------------------------------------------------------------------- */
/*  Composant principal                                                       */
/* -------------------------------------------------------------------------- */
interface PlanningGanttV2Props {
  userRooms: UserRoom[];
  reservations: KrossbookingReservation[];
}

const PlanningGanttV2: React.FC<PlanningGanttV2Props> = ({ userRooms, reservations }) => {
  const isMobile = useIsMobile();

  // Dimensions responsives
  const COL_W = isMobile ? COL_WIDTH_MOBILE : COL_WIDTH;
  const ROW_H = isMobile ? ROW_HEIGHT_MOBILE : ROW_HEIGHT;
  const LABEL_W = isMobile ? LABEL_WIDTH_MOBILE : LABEL_WIDTH;
  const BAR_H = isMobile ? BAR_HEIGHT_MOBILE : BAR_HEIGHT;
  const HEADER_H = isMobile ? HEADER_HEIGHT_MOBILE : HEADER_HEIGHT;
  const MONTH_BAND_H = isMobile ? MONTH_BAND_HEIGHT_MOBILE : MONTH_BAND_HEIGHT;

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [containerWidth, setContainerWidth] = useState(0);
  const [search, setSearch] = useState('');
  const [activeChannels, setActiveChannels] = useState<Set<string>>(new Set());
  const [selectedRes, setSelectedRes] = useState<ParsedRes | null>(null);
  const [selectedRotation, setSelectedRotation] = useState<Rotation | null>(null);

  const wrapperRef = useRef<HTMLDivElement | null>(null);

  // Mesure de la largeur pour calculer les colonnes de débordement (mois suivant)
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setContainerWidth(el.clientWidth));
    ro.observe(el);
    setContainerWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  const monthDays = useMemo(() => {
    return eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) });
  }, [currentMonth]);

  // Colonnes de débordement : on remplit avec le début du mois suivant
  const overflowDays = useMemo(() => {
    const available = Math.max(0, containerWidth - LABEL_W);
    const totalColsNeeded = Math.ceil(available / COL_W);
    const extra = Math.max(0, totalColsNeeded - monthDays.length);
    if (extra === 0) return [];
    const nextStart = startOfMonth(addMonths(currentMonth, 1));
    return Array.from({ length: extra }, (_, i) => addDays(nextStart, i));
  }, [containerWidth, monthDays.length, currentMonth, LABEL_W, COL_W]);

  const allDays = useMemo(() => [...monthDays, ...overflowDays], [monthDays, overflowDays]);
  const gridStart = allDays[0];
  const monthDaysCount = monthDays.length;

  const today = startOfDay(new Date());
  const todayIndex = allDays.findIndex((d) => isSameDay(d, today));

  // Logements filtrés par recherche
  const filteredRooms = useMemo(() => {
    const q = norm(search);
    if (!q) return userRooms;
    return userRooms.filter(
      (r) => norm(r.room_name).includes(q) || norm(r.room_id).includes(q) || norm(r.property_type).includes(q),
    );
  }, [userRooms, search]);

  // Association réservation -> logement
  const matchesRoom = (res: KrossbookingReservation, room: UserRoom): boolean => {
    const resId = norm(res.krossbooking_room_id);
    const resName = norm(res.property_name);
    const byId = !!resId && (resId === norm(room.room_id) || (!!room.room_id_2 && resId === norm(room.room_id_2)));
    const byName = !!resName && resName === norm(room.room_name);
    return byId || byName;
  };

  // Canaux présents dans les données
  const availableChannels = useMemo(() => {
    const keys = new Set<string>();
    for (const r of reservations) {
      if (isCancelled(r)) continue;
      keys.add(getChannelKey(r));
    }
    return Array.from(keys);
  }, [reservations]);

  const channelActive = (key: string) => activeChannels.size === 0 || activeChannels.has(key);

  const toggleChannel = (key: string) => {
    setActiveChannels((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // Réservations visibles (filtre canal + non annulées + intersection période)
  const visibleReservations = useMemo(() => {
    const gridEnd = allDays[allDays.length - 1];
    if (!gridStart || !gridEnd) return [];
    return reservations.filter((r) => {
      if (isCancelled(r)) return false;
      if (!channelActive(getChannelKey(r))) return false;
      const ci = isValid(parseISO(r.check_in_date)) ? parseISO(r.check_in_date) : null;
      const co = isValid(parseISO(r.check_out_date)) ? parseISO(r.check_out_date) : null;
      if (!ci || !co) return false;
      return ci <= gridEnd && co >= gridStart;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reservations, allDays, activeChannels]);

  // Rotations (ménage) : un départ ET une arrivée le même jour sur le même logement
  const rotationsByRoom = useMemo(() => {
    const map = new Map<string, Rotation[]>();
    for (const room of filteredRooms) {
      const roomRes = reservations.filter(
        (r) => !isCancelled(r) && matchesRoom(r, room) && getChannelKey(r) !== 'BLOCKED',
      );
      const parsed: ParsedRes[] = roomRes
        .map((res) => {
          const ci = isValid(parseISO(res.check_in_date)) ? parseISO(res.check_in_date) : null;
          const co = isValid(parseISO(res.check_out_date)) ? parseISO(res.check_out_date) : null;
          return ci && co ? { res, checkIn: ci, checkOut: co } : null;
        })
        .filter(Boolean) as ParsedRes[];

      const rotations: Rotation[] = [];
      for (const dep of parsed) {
        for (const arr of parsed) {
          if (dep.res.id === arr.res.id) continue;
          if (isSameDay(dep.checkOut, arr.checkIn)) {
            const dayIndex = allDays.findIndex((d) => isSameDay(d, dep.checkOut));
            if (dayIndex !== -1) {
              rotations.push({
                roomKey: room.id,
                day: dep.checkOut,
                dayIndex,
                departure: dep.res,
                arrival: arr.res,
              });
            }
          }
        }
      }
      map.set(room.id, rotations);
    }
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredRooms, reservations, allDays]);

  /* ----------------------------- Statistiques ----------------------------- */
  const stats = useMemo(() => {
    const mStart = startOfMonth(currentMonth);
    const mEnd = endOfMonth(currentMonth);

    // Réservations qui touchent le mois courant
    const monthRes = reservations.filter((r) => {
      if (isCancelled(r) || getChannelKey(r) === 'BLOCKED') return false;
      if (!channelActive(getChannelKey(r))) return false;
      const ci = isValid(parseISO(r.check_in_date)) ? parseISO(r.check_in_date) : null;
      const co = isValid(parseISO(r.check_out_date)) ? parseISO(r.check_out_date) : null;
      if (!ci || !co) return false;
      // Uniquement pour les logements affichés
      const belongs = filteredRooms.some((room) => matchesRoom(r, room));
      return belongs && ci <= mEnd && co >= mStart;
    });

    // Nuits occupées dans le mois
    let occupiedNights = 0;
    for (const r of monthRes) {
      const ci = parseISO(r.check_in_date);
      const co = parseISO(r.check_out_date);
      const from = ci < mStart ? mStart : ci;
      const to = co > addDays(mEnd, 1) ? addDays(mEnd, 1) : co;
      occupiedNights += Math.max(0, differenceInDays(to, from));
    }

    const totalNights = filteredRooms.length * monthDaysCount;
    const occupancy = totalNights > 0 ? Math.round((occupiedNights / totalNights) * 100) : 0;

    let rotationsCount = 0;
    for (const room of filteredRooms) {
      const rots = rotationsByRoom.get(room.id) || [];
      rotationsCount += rots.filter((rot) => rot.day >= mStart && rot.day <= mEnd).length;
    }

    return {
      rooms: filteredRooms.length,
      reservations: monthRes.length,
      rotations: rotationsCount,
      occupancy,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reservations, filteredRooms, currentMonth, monthDaysCount, rotationsByRoom, activeChannels]);

  /* --------------------------- Navigation mois ---------------------------- */
  const goPrev = () => setCurrentMonth((m) => subMonths(m, 1));
  const goNext = () => setCurrentMonth((m) => addMonths(m, 1));
  const goToday = () => setCurrentMonth(new Date());

  const gridContentWidth = LABEL_W + allDays.length * COL_W;

  /* -------------------------------------------------------------------------- */
  /*  Rendu                                                                     */
  /* -------------------------------------------------------------------------- */
  return (
    <div className="space-y-4">
      {/* En-tête + contrôles */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight flex items-center gap-2">
            <CalendarDays className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
            Planning
          </h1>
          <p className="text-sm text-muted-foreground">
            {userRooms.length} logement{userRooms.length > 1 ? 's' : ''}
          </p>
        </div>

        <div className="flex items-center gap-2 justify-between sm:justify-end">
          <Button variant="outline" size="icon" onClick={goPrev} className="flex-shrink-0">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="font-semibold text-sm sm:text-base flex-1 sm:flex-none sm:min-w-[150px] text-center capitalize">
            {format(currentMonth, isMobile ? 'MMM yyyy' : 'MMMM yyyy', { locale: fr })}
          </span>
          <Button variant="outline" size="icon" onClick={goNext} className="flex-shrink-0">
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="secondary" size="sm" onClick={goToday} className="flex-shrink-0 whitespace-nowrap">
            Auj.
          </Button>
        </div>
      </div>

      {/* Cartes de stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
        <StatCard label="Logements" value={stats.rooms} color="text-blue-600" />
        <StatCard label="Réservations" value={stats.reservations} color="text-emerald-600" />
        <StatCard label="Rotations" value={stats.rotations} color="text-orange-500" />
        <StatCard label="Occupation" value={`${stats.occupancy}%`} color="text-violet-600" />
      </div>

      {/* Recherche + filtres canaux */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full lg:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un logement..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Filtres : défilement horizontal sur mobile */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 lg:flex-wrap lg:overflow-visible lg:mx-0 lg:px-0 lg:pb-0">
          {availableChannels.map((key) => {
            const style = getChannelStyle(key);
            const active = activeChannels.has(key);
            return (
              <button
                key={key}
                type="button"
                onClick={() => toggleChannel(key)}
                className={cn(
                  'flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium border transition-all whitespace-nowrap flex-shrink-0',
                  active
                    ? `${style.bar} text-white border-transparent shadow-sm`
                    : 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800',
                )}
              >
                <span className={cn('w-2 h-2 rounded-full', active ? 'bg-white' : style.dot)} />
                {style.label}
              </button>
            );
          })}
          {activeChannels.size > 0 && (
            <button
              type="button"
              onClick={() => setActiveChannels(new Set())}
              className="rounded-full px-3 py-1 text-xs font-medium border border-gray-200 dark:border-gray-700 text-muted-foreground hover:bg-gray-50 dark:hover:bg-gray-800 whitespace-nowrap flex-shrink-0"
            >
              Tout afficher
            </button>
          )}
        </div>
      </div>

      {/* Astuce scroll horizontal sur mobile */}
      {isMobile && (
        <p className="text-[11px] text-muted-foreground -mb-1 px-1">
          Faites glisser horizontalement pour naviguer dans le calendrier →
        </p>
      )}

      {/* Grille Gantt */}
      <Card className="overflow-hidden border-slate-200 dark:border-slate-700">
        <div ref={wrapperRef} className="w-full overflow-x-auto">
          <div style={{ width: gridContentWidth, minWidth: '100%' }}>
            {/* Bandeau des mois */}
            <div className="flex" style={{ height: MONTH_BAND_H }}>
              <div
                className="sticky left-0 z-20 bg-white dark:bg-gray-950 border-b border-r border-slate-200 dark:border-slate-700 flex items-center px-3"
                style={{ width: LABEL_W, minWidth: LABEL_W }}
              />
              <div
                className="border-b border-r-2 border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-gray-900 flex items-center justify-center text-xs font-semibold capitalize text-slate-700 dark:text-slate-200"
                style={{ width: monthDaysCount * COL_W }}
              >
                {format(currentMonth, 'MMMM yyyy', { locale: fr })}
              </div>
              {overflowDays.length > 0 && (
                <div
                  className="border-b border-slate-200 dark:border-slate-700 bg-slate-100/60 dark:bg-gray-900/60 flex items-center justify-center text-xs font-semibold capitalize text-slate-500 dark:text-slate-400 overflow-hidden"
                  style={{ width: overflowDays.length * COL_W }}
                >
                  {format(addMonths(currentMonth, 1), 'MMM', { locale: fr })}
                </div>
              )}
            </div>

            {/* Entête des jours */}
            <div className="flex" style={{ height: HEADER_H }}>
              <div
                className="sticky left-0 z-20 bg-white dark:bg-gray-950 border-b border-r border-slate-200 dark:border-slate-700 flex items-center px-3 text-xs font-semibold text-muted-foreground"
                style={{ width: LABEL_W, minWidth: LABEL_W }}
              >
                Logement
              </div>
              {allDays.map((day, i) => {
                const weekend = isWeekend(day);
                const isToday = todayIndex === i;
                const isMonthBoundary = i === monthDaysCount;
                return (
                  <div
                    key={i}
                    className={cn(
                      'flex flex-col items-center justify-center border-b border-r border-slate-100 dark:border-slate-800 text-center',
                      weekend && 'bg-slate-50 dark:bg-gray-900/50',
                      isToday && 'bg-blue-50 dark:bg-blue-950/40',
                      isMonthBoundary && 'border-l-2 border-l-slate-300 dark:border-l-slate-600',
                    )}
                    style={{ width: COL_W, minWidth: COL_W }}
                  >
                    <span className={cn('text-[10px] uppercase', isToday ? 'text-blue-600 font-semibold' : 'text-muted-foreground')}>
                      {format(day, 'EEEEE', { locale: fr })}
                    </span>
                    <span
                      className={cn(
                        'text-xs sm:text-sm',
                        isToday ? 'font-bold text-blue-600' : 'font-medium text-slate-700 dark:text-slate-200',
                      )}
                    >
                      {format(day, 'd')}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Lignes logements */}
            {filteredRooms.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">Aucun logement à afficher.</div>
            ) : (
              filteredRooms.map((room, roomIndex) => {
                const roomReservations = visibleReservations.filter((r) => matchesRoom(r, room));
                const rotations = (rotationsByRoom.get(room.id) || []).filter(
                  (rot) => channelActive(getChannelKey(rot.departure)) || channelActive(getChannelKey(rot.arrival)),
                );
                const avatarColor = avatarColorFor(room.room_name || room.id);

                return (
                  <div key={room.id} className="flex" style={{ height: ROW_H }}>
                    {/* Colonne fixe logement */}
                    <div
                      className={cn(
                        'sticky left-0 z-20 border-b border-r border-slate-200 dark:border-slate-700 flex items-center gap-2 px-2 sm:gap-2.5 sm:px-3',
                        roomIndex % 2 === 0 ? 'bg-white dark:bg-gray-950' : 'bg-slate-50/70 dark:bg-gray-900/40',
                      )}
                      style={{ width: LABEL_W, minWidth: LABEL_W }}
                    >
                      <div
                        className={cn(
                          'flex-shrink-0 flex items-center justify-center h-7 w-7 sm:h-9 sm:w-9 rounded-lg text-white text-[10px] sm:text-xs font-bold shadow-sm',
                          avatarColor,
                        )}
                      >
                        {getInitials(room.room_name)}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs sm:text-sm font-semibold truncate text-slate-800 dark:text-slate-100 leading-tight">
                          {room.room_name}
                        </div>
                        <div className="text-[10px] sm:text-[11px] text-muted-foreground truncate flex items-center gap-1">
                          <Building2 className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate">{room.property_type || `Ch. ${room.room_id}`}</span>
                        </div>
                      </div>
                    </div>

                    {/* Zone jours (barres en absolu) */}
                    <div
                      className={cn(
                        'relative border-b border-slate-100 dark:border-slate-800',
                        roomIndex % 2 === 0 ? 'bg-white dark:bg-gray-950' : 'bg-slate-50/40 dark:bg-gray-900/30',
                      )}
                      style={{ width: allDays.length * COL_W }}
                    >
                      {/* Fonds de colonnes (week-end / aujourd'hui / séparateur) */}
                      {allDays.map((day, i) => {
                        const weekend = isWeekend(day);
                        const isToday = todayIndex === i;
                        const isMonthBoundary = i === monthDaysCount;
                        return (
                          <div
                            key={i}
                            className={cn(
                              'absolute top-0 bottom-0 border-r border-slate-100 dark:border-slate-800',
                              weekend && 'bg-slate-100/60 dark:bg-gray-800/40',
                              isToday && 'bg-blue-50/70 dark:bg-blue-950/30 border-l-2 border-l-blue-500',
                              isMonthBoundary && 'border-l-2 border-l-slate-300 dark:border-l-slate-600',
                            )}
                            style={{ left: i * COL_W, width: COL_W }}
                          />
                        );
                      })}

                      {/* Barres de réservation */}
                      {roomReservations.map((res) => {
                        const ci = parseISO(res.check_in_date);
                        const co = parseISO(res.check_out_date);
                        const nights = Math.max(0, differenceInDays(co, ci));

                        const startOffset = differenceInDays(ci, gridStart);
                        const endOffset = differenceInDays(co, gridStart);

                        // Convention hôtelière : arrivée en milieu de journée, départ en milieu de journée
                        let startPos = startOffset + 0.5;
                        let endPos = endOffset + 0.5;

                        const arrivalVisible = startPos >= 0;
                        const departureVisible = endPos <= allDays.length;

                        startPos = Math.max(0, startPos);
                        endPos = Math.min(allDays.length, endPos);
                        if (endPos <= startPos) return null;

                        const left = startPos * COL_W;
                        const width = Math.max(10, (endPos - startPos) * COL_W);

                        const channelKey = getChannelKey(res);
                        const style = getChannelStyle(channelKey);
                        const pending = isPendingRes(res);
                        const isBlock = channelKey === 'BLOCKED';
                        const showIcons = width > 70;

                        return (
                          <button
                            key={res.id}
                            type="button"
                            onClick={() => setSelectedRes({ res, checkIn: ci, checkOut: co })}
                            className={cn(
                              'absolute flex items-center overflow-hidden text-white text-[10px] sm:text-[11px] font-medium shadow-sm transition-all hover:brightness-105 hover:z-10',
                              pending ? style.barPending : style.bar,
                              pending && 'text-slate-700',
                              isBlock && 'bg-[repeating-linear-gradient(45deg,#94a3b8,#94a3b8_6px,#cbd5e1_6px,#cbd5e1_12px)] text-slate-700',
                              arrivalVisible ? 'rounded-l-full pl-2' : 'pl-1',
                              departureVisible ? 'rounded-r-full pr-2' : 'pr-1',
                            )}
                            style={{
                              left,
                              width,
                              top: (ROW_H - BAR_H) / 2,
                              height: BAR_H,
                            }}
                            title={`${res.guest_name} · ${nights} nuit(s)`}
                          >
                            {arrivalVisible && showIcons && <LogIn className="h-3 w-3 flex-shrink-0 mr-1 opacity-80" />}
                            <span className="truncate flex-grow">
                              {isBlock ? 'Bloqué' : res.guest_name}
                            </span>
                            {departureVisible && showIcons && <LogOut className="h-3 w-3 flex-shrink-0 ml-1 opacity-80" />}
                          </button>
                        );
                      })}

                      {/* Marqueurs de rotation (ménage) */}
                      {rotations.map((rot, ri) => {
                        const centerLeft = (rot.dayIndex + 0.5) * COL_W;
                        return (
                          <button
                            key={`rot-${ri}`}
                            type="button"
                            onClick={() => setSelectedRotation(rot)}
                            className="absolute z-20 flex items-center justify-center group"
                            style={{ left: centerLeft - 9, top: 2, width: 18, bottom: 2 }}
                            title="Rotation · Ménage"
                          >
                            <span
                              className="absolute top-0 bottom-0 border-l-2 border-dashed border-orange-500"
                              style={{ left: 8 }}
                            />
                            <span className="relative flex items-center justify-center h-5 w-5 rounded-full bg-orange-500 text-white shadow ring-2 ring-white dark:ring-gray-950 group-hover:scale-110 transition-transform">
                              <Repeat className="h-3 w-3" />
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </Card>

      {/* Légende */}
      <Card className="p-3 sm:p-4">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 sm:gap-x-6 sm:gap-y-3">
          <span className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200">Légende :</span>
          {Object.entries(CHANNELS)
            .filter(([k]) => !['HOMEAWAY', 'PROP0', 'OWNER_BLOCK'].includes(k))
            .map(([key, style]) => (
              <div key={key} className="flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs text-muted-foreground">
                <span className={cn('w-3 h-3 rounded-full', style.dot)} />
                {style.label}
              </div>
            ))}
          <div className="flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs text-muted-foreground">
            <span className="w-6 h-3 rounded-sm bg-[repeating-linear-gradient(45deg,#94a3b8,#94a3b8_4px,#cbd5e1_4px,#cbd5e1_8px)]" />
            Bloqué
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-xs text-muted-foreground">
            <span className="flex items-center justify-center h-5 w-5 rounded-full bg-orange-500 text-white">
              <Repeat className="h-3 w-3" />
            </span>
            Rotation · Ménage (départ &amp; arrivée le même jour)
          </div>
        </div>
      </Card>

      {/* Modale de détail réservation */}
      <ReservationDetailDialog parsed={selectedRes} onClose={() => setSelectedRes(null)} />

      {/* Modale de rotation */}
      <RotationDialog rotation={selectedRotation} onClose={() => setSelectedRotation(null)} />
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/*  Sous-composants                                                           */
/* -------------------------------------------------------------------------- */
const StatCard: React.FC<{ label: string; value: React.ReactNode; color: string }> = ({ label, value, color }) => (
  <Card className="p-3 sm:p-4">
    <div className="text-[11px] sm:text-xs text-muted-foreground truncate">{label}</div>
    <div className={cn('text-xl sm:text-2xl font-bold mt-0.5 sm:mt-1', color)}>{value}</div>
  </Card>
);

const DetailRow: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-slate-800 last:border-0">
    <span className="text-sm text-muted-foreground">{label}</span>
    <span className="text-sm font-medium text-slate-800 dark:text-slate-100">{value}</span>
  </div>
);

const ReservationDetailDialog: React.FC<{ parsed: ParsedRes | null; onClose: () => void }> = ({ parsed, onClose }) => {
  if (!parsed) return null;
  const { res, checkIn, checkOut } = parsed;
  const nights = Math.max(0, differenceInDays(checkOut, checkIn));
  const channelKey = getChannelKey(res);
  const style = getChannelStyle(channelKey);
  const price = parseAmount(res.amount);
  const commission = res.ota_commissions_deducted ?? res.ota_commissions_collected ?? 0;
  const net = Math.max(0, price - commission);

  return (
    <Dialog open={!!parsed} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className={cn('w-3 h-3 rounded-full', style.dot)} />
            {res.guest_name}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-1">
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="secondary">{style.label}</Badge>
            {isPendingRes(res) && <Badge variant="outline" className="text-amber-600 border-amber-300">En attente</Badge>}
          </div>
          <DetailRow label="Logement" value={res.property_name} />
          <DetailRow label="Arrivée" value={format(checkIn, 'EEE dd MMM yyyy', { locale: fr })} />
          <DetailRow label="Départ" value={format(checkOut, 'EEE dd MMM yyyy', { locale: fr })} />
          <DetailRow label="Nuits" value={`${nights} nuit(s)`} />
          <DetailRow label="Voyageurs" value={res.n_guests ? `${res.n_guests} pers.` : '—'} />
          <DetailRow label="Prix" value={`${price.toFixed(2)} €`} />
          <DetailRow label="Commission" value={`${commission.toFixed(2)} €`} />
          <DetailRow label="Net estimé" value={<span className="text-emerald-600 font-semibold">{net.toFixed(2)} €</span>} />
          <DetailRow label="ID réservation" value={<span className="font-mono text-xs">{res.id}</span>} />
          <DetailRow label="ID chambre" value={<span className="font-mono text-xs">{res.krossbooking_room_id || '—'}</span>} />
        </div>
      </DialogContent>
    </Dialog>
  );
};

const RotationDialog: React.FC<{ rotation: Rotation | null; onClose: () => void }> = ({ rotation, onClose }) => {
  if (!rotation) return null;
  const { day, departure, arrival } = rotation;

  return (
    <Dialog open={!!rotation} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Repeat className="h-4 w-4 text-orange-500" />
            Changement de locataire
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="text-center text-sm text-muted-foreground capitalize">
            {format(day, 'EEEE dd MMMM yyyy', { locale: fr })}
          </div>

          {/* Départ */}
          <div className="rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/30 p-3">
            <div className="flex items-center gap-2 text-red-600 text-xs font-semibold mb-1">
              <LogOut className="h-4 w-4" /> Départ
            </div>
            <div className="font-semibold text-slate-800 dark:text-slate-100">{departure.guest_name}</div>
            <div className="text-xs text-muted-foreground">
              Du {format(parseISO(departure.check_in_date), 'dd/MM', { locale: fr })} au{' '}
              {format(parseISO(departure.check_out_date), 'dd/MM', { locale: fr })}
            </div>
          </div>

          {/* Badge central */}
          <div className="flex justify-center">
            <Badge className="bg-orange-500 hover:bg-orange-500 text-white gap-1.5">
              <Repeat className="h-3 w-3" /> Rotation · Ménage
            </Badge>
          </div>

          {/* Arrivée */}
          <div className="rounded-lg border border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-950/30 p-3">
            <div className="flex items-center gap-2 text-green-600 text-xs font-semibold mb-1">
              <LogIn className="h-4 w-4" /> Arrivée
            </div>
            <div className="font-semibold text-slate-800 dark:text-slate-100">{arrival.guest_name}</div>
            <div className="text-xs text-muted-foreground">
              Du {format(parseISO(arrival.check_in_date), 'dd/MM', { locale: fr })} au{' '}
              {format(parseISO(arrival.check_out_date), 'dd/MM', { locale: fr })}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PlanningGanttV2;
