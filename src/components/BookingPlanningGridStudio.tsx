"use client";

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, parseISO, addDays, subDays, differenceInDays, isValid, max, min, getISOWeek } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronLeft, ChevronRight, Home, Sparkles, CheckCircle, Clock, XCircle, LogIn, LogOut, CalendarDays } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal } from 'lucide-react';
import { fetchKrossbookingHousekeepingTasks, KrossbookingReservation, saveKrossbookingReservation, fetchKrossbookingRoomTypes, KrossbookingRoomType } from '@/lib/krossbooking';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { UserRoom } from '@/lib/user-room-api';
import { useIsMobile } from '@/hooks/use-mobile';
import ReservationActionsDialog from './ReservationActionsDialog';
import OwnerReservationDialog from './OwnerReservationDialog';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { Profile } from '@/lib/profile-api';

const channelColors: { [key: string]: { name: string; bgColor: string; textColor: string; } } = {
  'AIRBNB': { name: 'Airbnb', bgColor: 'bg-[#ff0000]', textColor: 'text-white' },
  'BOOKING': { name: 'Booking.com', bgColor: 'bg-[#013b94]', textColor: 'text-white' },
  'ABRITEL': { name: 'Abritel', bgColor: 'bg-[#1668e3]', textColor: 'text-white' },
  'HOMEAWAY': { name: 'Abritel', bgColor: 'bg-[#1668e3]', textColor: 'text-white' },
  'HELLOKEYS': { name: 'Hello Keys', bgColor: 'bg-[#255f85]', textColor: 'text-white' },
  'DIRECT': { name: 'Hello Keys', bgColor: 'bg-[#255f85]', textColor: 'text-white' },
  'PROPRI': { name: 'Propriétaire (Ménage)', bgColor: 'bg-rose-500', textColor: 'text-white' },
  'PROP0': { name: 'Propriétaire (Sans Ménage)', bgColor: 'bg-gray-500', textColor: 'text-white' },
  'UNKNOWN': { name: 'Autre', bgColor: 'bg-gray-600', textColor: 'text-white' },
};

// Helper: normaliser pour les comparaisons (évite les soucis de casse/espaces)
const norm = (v?: string | number) => (v ?? '').toString().trim().toLowerCase();

interface BookingPlanningGridStudioProps {
  refreshTrigger: number;
  userRooms: UserRoom[];
  reservations: KrossbookingReservation[];
  onReservationChange: () => void;
  profile: Profile | null;
}

const BookingPlanningGridStudio: React.FC<BookingPlanningGridStudioProps> = ({ refreshTrigger, userRooms, reservations, onReservationChange, profile }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [housekeepingTasks, setHousekeepingTasks] = useState<any[]>([]);
  const [loadingTasks, setLoadingTasks] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const isMobile = useIsMobile();

  const [isActionsDialogOpen, setIsActionsDialogOpen] = useState(false);
  const [selectedBookingForActions, setSelectedBookingForActions] = useState<KrossbookingReservation | null>(null);

  const [isOwnerReservationDialogOpen, setIsOwnerReservationDialogOpen] = useState(false);
  const [bookingToEdit, setBookingToEdit] = useState<KrossbookingReservation | null>(null);

  const [krossbookingRoomTypes, setKrossbookingRoomTypes] = useState<KrossbookingRoomType[]>([]);
  // Vue Studio: ultra compacte
  const slimMode = true;
  const [loadingRoomTypes, setLoadingRoomTypes] = useState<boolean>(true);

  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [hoveredColumnIndex, setHoveredColumnIndex] = useState<number | null>(null);
  const [hoveredRowIndex, setHoveredRowIndex] = useState<number | null>(null);
  const [hasScrolledLeft, setHasScrolledLeft] = useState(false);
  const [hasScrolledRight, setHasScrolledRight] = useState(false);

  const loadHousekeepingTasks = async () => {
    setLoadingTasks(true);
    setError(null);
    try {
      const roomIdsAsNumbers = userRooms.map(room => parseInt(room.room_id)).filter(id => !isNaN(id));
      if (roomIdsAsNumbers.length === 0) {
        setHousekeepingTasks([]);
        setLoadingTasks(false);
        return;
      }
      const monthStartFormatted = format(startOfMonth(currentMonth), 'yyyy-MM-dd');
      const monthEndFormatted = format(endOfMonth(currentMonth), 'yyyy-MM-dd');
      const fetchedTasks = await fetchKrossbookingHousekeepingTasks(monthStartFormatted, monthEndFormatted, roomIdsAsNumbers);
      setHousekeepingTasks(fetchedTasks);
    } catch (err: any) {
      setError(`Erreur lors du chargement des tâches de ménage : ${err.message}`);
      console.error("DEBUG: Error in loadHousekeepingTasks:", err);
    } finally {
      setLoadingTasks(false);
    }
  };

  useEffect(() => {
    loadHousekeepingTasks();
  }, [currentMonth, userRooms, refreshTrigger]);

  useEffect(() => {
    const loadRoomTypes = async () => {
      setLoadingRoomTypes(true);
      try {
        const types = await fetchKrossbookingRoomTypes();
        setKrossbookingRoomTypes(types);
      } catch (error) {
        console.error("Error fetching Krossbooking room types in BookingPlanningGridStudio:", error);
        toast.error("Erreur lors du chargement des types de chambres Krossbooking.");
      } finally {
        setLoadingRoomTypes(false);
      }
    };
    loadRoomTypes();
  }, [refreshTrigger]);

  const daysInMonth = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const goToPreviousMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const goToNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  // Largeurs ultra
  const dayCellWidth = useMemo(() => (isMobile ? 24 : 36), [isMobile]);
  const propertyColumnWidth = useMemo(() => (isMobile ? 70 : 160), [isMobile]);

  const scrollToToday = () => {
    if (!wrapperRef.current) return;
    const now = new Date();
    if (now.getMonth() !== currentMonth.getMonth() || now.getFullYear() !== currentMonth.getFullYear()) return;
    const index = daysInMonth.findIndex((d) => isSameDay(d, now));
    if (index === -1) return;
    const targetLeft = propertyColumnWidth + index * dayCellWidth - (wrapperRef.current.clientWidth / 2);
    wrapperRef.current.scrollLeft = Math.max(0, targetLeft);
  };

  const goToToday = () => setCurrentMonth(new Date());

  useEffect(() => {
    scrollToToday();
  }, [daysInMonth, propertyColumnWidth, dayCellWidth]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') goToPreviousMonth();
      if (e.key === 'ArrowRight') goToNextMonth();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [currentMonth]);

  // Gestion du scroll pour ombrer la colonne sticky et activer les boutons flottants
  const handleScroll = () => {
    const el = wrapperRef.current;
    if (!el) return;
    setHasScrolledLeft(el.scrollLeft > 0);
    const maxScroll = el.scrollWidth - el.clientWidth - 1;
    setHasScrolledRight(el.scrollLeft < maxScroll);
  };

  // Boutons flottants pour un scroll fluide
  const scrollByAmount = (dir: 'left' | 'right') => {
    const el = wrapperRef.current;
    if (!el) return;
    const delta = Math.round(el.clientWidth * 0.6);
    el.scrollTo({ left: el.scrollLeft + (dir === 'left' ? -delta : delta), behavior: 'smooth' });
  };

  // Initiales invité pour style badge
  const getInitials = (name?: string) => {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    const a = (parts[0]?.[0] || '').toUpperCase();
    const b = (parts[1]?.[0] || '').toUpperCase();
    return (a + (b || '')).slice(0, 2);
  };

  const getTaskIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed': return <CheckCircle className="h-3 w-3 text-green-500" />;
      case 'pending': return <Clock className="h-3 w-3 text-yellow-500" />;
      case 'cancelled': return <XCircle className="h-3 w-3 text-red-500" />;
      default: return <Sparkles className="h-3 w-3 text-purple-500" />;
    }
  };

  const handleReservationClick = (booking: KrossbookingReservation) => {
    setSelectedBookingForActions(booking);
    setIsActionsDialogOpen(true);
  };

  const handleEditReservation = (booking: KrossbookingReservation) => {
    setBookingToEdit(booking);
    setIsOwnerReservationDialogOpen(true);
    setIsActionsDialogOpen(false);
  };

  const handleDeleteReservation = async (bookingToCancel: KrossbookingReservation) => {
    if (!window.confirm("Êtes-vous sûr de vouloir annuler cette réservation ?")) return;
    try {
      if (!bookingToCancel) {
        toast.error("Réservation introuvable pour annulation.");
        return;
      }
      if (!bookingToCancel.id_room_type) {
        toast.error("Impossible de trouver le type de chambre pour l'annulation.");
        console.error("Could not find room type for room id:", bookingToCancel.krossbooking_room_id);
        return;
      }
      await saveKrossbookingReservation({
        id_reservation: bookingToCancel.id,
        label: bookingToCancel.guest_name || "Annulation",
        arrival: bookingToCancel.check_in_date,
        departure: bookingToCancel.check_out_date,
        email: bookingToCancel.email || '',
        phone: bookingToCancel.phone || '',
        cod_reservation_status: "CANC",
        id_room: bookingToCancel.krossbooking_room_id,
        id_room_type: bookingToCancel.id_room_type,
        property_id: bookingToCancel.property_id,
      });
      toast.success("Réservation annulée avec succès !");
      setIsActionsDialogOpen(false);
      onReservationChange();
    } catch (err: any) {
      toast.error(`Erreur lors de l'annulation de la réservation : ${err.message}`);
      console.error("Error deleting reservation:", err);
    }
  };

  const isWeekendDay = (d: Date) => d.getDay() === 0 || d.getDay() === 6;
  const isMonday = (d: Date) => d.getDay() === 1;

  return (
    <Card className="max-w-full overflow-hidden border border-slate-200 dark:border-slate-700">
      <CardHeader className="relative flex flex-row items-center justify-between bg-white/90 dark:bg-gray-950/90 backdrop-blur-sm border-b border-slate-200 dark:border-slate-800">
        <CardTitle className="text-lg font-semibold">Planning Studio 2026</CardTitle>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="icon" onClick={goToPreviousMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="font-semibold text-lg tracking-tight text-slate-900 dark:text-white">
            {format(currentMonth, 'MMMM yyyy', { locale: fr })}
          </span>
          <Button variant="outline" size="icon" onClick={goToNextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={goToToday} className="ml-1">
            <CalendarDays className="h-4 w-4" />
            <span className="ml-2 hidden sm:inline">Aujourd'hui</span>
          </Button>
        </div>
        {/* Shine discret sur le header */}
        <div className="pointer-events-none absolute inset-0 opacity-20" style={{ backgroundImage: 'linear-gradient(120deg, rgba(255,255,255,0.35), rgba(255,255,255,0) 45%)' }} />
      </CardHeader>

      <CardContent className="relative p-4 w-full max-w-full overflow-hidden bg-white dark:bg-gray-950">
        {error && (
          <Alert variant="destructive" className="mb-4">
            <Terminal className="h-4 w-4" />
            <AlertTitle>Erreur</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {!loadingTasks && !error && userRooms.length === 0 ? (
          <p className="text-gray-600 dark:text-gray-300">
            Aucune chambre configurée. Veuillez ajouter des chambres via la page "Mon Profil" pour les voir ici.
          </p>
        ) : !loadingTasks && !error && userRooms.length > 0 ? (
          <div ref={wrapperRef} className="relative w-full max-w-full overflow-x-auto rounded-xl" onScroll={handleScroll}>
            {/* Boutons flottants de navigation horizontale */}
            {hasScrolledLeft && (
              <Button
                variant="secondary"
                size="icon"
                onClick={() => scrollByAmount('left')}
                className="absolute left-2 top-1/2 -translate-y-1/2 z-[7] rounded-full bg-white/80 dark:bg-gray-900/70 hover:bg-white/90 dark:hover:bg-gray-900"
              >
                <ChevronLeft className="h-5 w-5 text-slate-700 dark:text-slate-200" />
              </Button>
            )}
            {hasScrolledRight && (
              <Button
                variant="secondary"
                size="icon"
                onClick={() => scrollByAmount('right')}
                className="absolute right-2 top-1/2 -translate-y-1/2 z-[7] rounded-full bg-white/80 dark:bg-gray-900/70 hover:bg-white/90 dark:hover:bg-gray-900"
              >
                <ChevronRight className="h-5 w-5 text-slate-700 dark:text-slate-200" />
              </Button>
            )}

            <div className="grid-container relative rounded-xl ring-1 ring-black/5 dark:ring-white/10 backdrop-blur-sm" style={{
              display: 'grid',
              gridTemplateColumns: `${propertyColumnWidth}px repeat(${daysInMonth.length}, ${dayCellWidth}px)`,
              width: `${propertyColumnWidth + daysInMonth.length * dayCellWidth}px`,
              gridAutoRows: '40px',
              position: 'relative',
            }}
              onMouseLeave={() => { setHoveredColumnIndex(null); setHoveredRowIndex(null); }}
            >
              {/* Weekend full-height overlays (subtle) */}
              {daysInMonth.map((day, idx) =>
                isWeekendDay(day) ? (
                  <div
                    key={`wknd-${idx}`}
                    className="pointer-events-none absolute top-0 bottom-0 z-[1] bg-slate-500/5 dark:bg-slate-100/5"
                    style={{
                      left: `${propertyColumnWidth + idx * dayCellWidth}px`,
                      width: `${dayCellWidth}px`,
                    }}
                  />
                ) : null
              )}

              {/* Row hover highlight (fluide) */}
              {hoveredRowIndex !== null && (
                <div
                  className="pointer-events-none absolute left-0 right-0 z-[1] bg-slate-200/20 dark:bg-slate-700/15"
                  style={{
                    top: `${(3 + hoveredRowIndex) * 40}px`,
                    height: `40px`,
                  }}
                />
              )}

              {/* Today vertical highlight */}
              {
                (() => {
                  const now = new Date();
                  if (now.getMonth() === currentMonth.getMonth() && now.getFullYear() === currentMonth.getFullYear()) {
                    const idx = daysInMonth.findIndex((d) => isSameDay(d, now));
                    if (idx !== -1) {
                      const left = propertyColumnWidth + idx * dayCellWidth;
                      return (
                        <div
                          className="pointer-events-none absolute top-0 bottom-0 z-[4] border-x border-blue-400/40 bg-blue-200/10 dark:bg-blue-500/10"
                          style={{ left: `${left}px`, width: `${dayCellWidth}px`, animation: 'pulse-glow 3s ease-in-out infinite' }}
                        />
                      );
                    }
                  }
                  return null;
                })()
              }
              {/* Current week band highlight */}
              {
                (() => {
                  const now = new Date();
                  if (now.getMonth() === currentMonth.getMonth() && now.getFullYear() === currentMonth.getFullYear()) {
                    const dow = now.getDay();
                    const daysSinceMonday = dow === 0 ? 6 : dow - 1;
                    const mondayOfWeek = subDays(now, daysSinceMonday);
                    const mondayIndex = daysInMonth.findIndex((d) => isSameDay(d, mondayOfWeek));
                    if (mondayIndex !== -1) {
                      const endIndex = Math.min(mondayIndex + 6, daysInMonth.length - 1);
                      const left = propertyColumnWidth + mondayIndex * dayCellWidth;
                      const width = (endIndex - mondayIndex + 1) * dayCellWidth;
                      return (
                        <div
                          className="pointer-events-none absolute top-0 bottom-0 z-[3] bg-fuchsia-200/8 dark:bg-fuchsia-500/8 border-x border-fuchsia-400/30"
                          style={{ left: `${left}px`, width: `${width}px` }}
                        />
                      );
                    }
                  }
                  return null;
                })()
              }

              {/* Hovered column guideline */}
              {hoveredColumnIndex !== null && (
                <div
                  className="pointer-events-none absolute top-0 bottom-0 z-[2] bg-slate-200/10 dark:bg-slate-700/10 border-x border-slate-300/40"
                  style={{
                    left: `${propertyColumnWidth + hoveredColumnIndex * dayCellWidth}px`,
                    width: `${dayCellWidth}px`,
                  }}
                />
              )}

              {/* Header Row 0: Week numbers */}
              <div className="grid-cell header-cell sticky left-0 z-10 bg-white/90 dark:bg-gray-950/90 backdrop-blur-sm border-b border-r col-span-1"></div>
              {daysInMonth.map((day, index) => (
                <div
                  key={`week-${index}`}
                  className={cn(
                    "grid-cell header-cell text-center text-[11px] sm:text-xs text-gray-500 border-b border-r",
                    isMonday(day) && "font-medium",
                    isWeekendDay(day) && "bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-300",
                    isSameDay(day, new Date()) && "bg-blue-300/80 dark:bg-blue-600/80 border-blue-600 dark:border-blue-300 ring-1 ring-blue-500",
                    hoveredColumnIndex === index && !isSameDay(day, new Date()) && "ring-1 ring-slate-400/50"
                  )}
                  style={{ width: `${dayCellWidth}px` }}
                  onMouseEnter={() => setHoveredColumnIndex(index)}
                >
                  {isMonday(day) ? `S ${getISOWeek(day)}` : ""}
                </div>
              ))}

              {/* Header Row 1: Day numbers */}
              <div className="grid-cell header-cell sticky left-0 z-10 bg-white/90 dark:bg-gray-950/90 backdrop-blur-sm border-b border-r col-span-1"></div>
              {daysInMonth.map((day, index) => (
                <div
                  key={index}
                  className={cn(
                    "grid-cell header-cell text-center font-semibold border-b border-r",
                    slimMode && "text-[10px]",
                    "border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-gray-800 transition-colors",
                    isWeekendDay(day) && "bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300",
                    isMonday(day) && "border-l-2 border-slate-300",
                    isSameDay(day, new Date()) && "bg-blue-300 dark:bg-blue-600 border-blue-600 dark:border-blue-300 ring-1 ring-blue-500",
                    hoveredColumnIndex === index && !isSameDay(day, new Date()) && "ring-1 ring-slate-400/50"
                  )}
                  style={{ width: `${dayCellWidth}px` }}
                  onMouseEnter={() => setHoveredColumnIndex(index)}
                >
                  {format(day, 'dd', { locale: fr })}
                </div>
              ))}

              {/* Header Row 2: Day names */}
              <div className="grid-cell header-cell sticky left-0 z-10 bg-white/90 dark:bg-gray-950/90 backdrop-blur-sm border-b border-r col-span-1"></div>
              {daysInMonth.map((day, index) => (
                <div
                  key={`day-name-${index}`}
                  className={cn(
                    "grid-cell header-cell text-center text-xs text-gray-500 border-b border-r",
                    slimMode && "text-[9px]",
                    "border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-gray-800 transition-colors",
                    isWeekendDay(day) && "bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-300",
                    isMonday(day) && "border-l-2 border-slate-300",
                    isSameDay(day, new Date()) && "bg-blue-300 dark:bg-blue-600 border-blue-600 dark:border-blue-300 ring-1 ring-blue-500",
                    hoveredColumnIndex === index && !isSameDay(day, new Date()) && "ring-1 ring-slate-400/50"
                  )}
                  style={{ width: `${dayCellWidth}px` }}
                  onMouseEnter={() => setHoveredColumnIndex(index)}
                >
                  {format(day, 'EEE', { locale: fr })}
                </div>
              ))}

              {/* Rows per room */}
              {userRooms.map((room, roomIndex) => (
                <React.Fragment key={room.id}>
                  {/* Property Name Cell */}
                  <div
                    className={cn(
                      "grid-cell property-name-cell sticky left-0 z-10 bg-white/90 dark:bg-gray-950/90 backdrop-blur-sm border-r border-b flex items-center px-2",
                      slimMode ? "text-xs" : "text-sm"
                    )}
                    style={{ gridRow: `${4 + roomIndex}` }}
                    onMouseEnter={() => setHoveredRowIndex(roomIndex)}
                    onMouseLeave={() => setHoveredRowIndex((prev) => (prev === roomIndex ? null : prev))}
                  >
                    <Home className="h-4 w-4 mr-2 text-gray-500" />
                    <span className={cn("font-medium truncate", slimMode ? "text-xs" : "text-sm")}>
                      {room.room_name}
                    </span>
                  </div>

                  {/* Background day cells */}
                  {daysInMonth.map((day, dayIndex) => {
                    const tasksForThisDay = housekeepingTasks.filter(task =>
                      isValid(parseISO(task.date)) && isSameDay(parseISO(task.date), day) && norm(task.id_room) === norm(room.room_id)
                    );
                    const isStripe = roomIndex % 2 === 0;

                    return (
                      <div
                        key={`${room.id}-${format(day, 'yyyy-MM-dd')}-bg`}
                        className={cn(
                          "grid-cell border-b border-r relative flex flex-col justify-center items-center border-slate-200 dark:border-slate-700",
                          isSameDay(day, new Date())
                            ? "bg-blue-200 dark:bg-blue-700 border-3 border-blue-600 dark:border-blue-300 ring-1 ring-blue-400"
                            : isWeekendDay(day)
                              ? "bg-slate-100 dark:bg-slate-900/60"
                              : (isStripe ? "bg-gray-50 dark:bg-gray-800" : "bg-gray-100 dark:bg-gray-900/60"),
                          isMonday(day) && "border-l-2 border-slate-300",
                          "hover:bg-slate-50 dark:hover:bg-gray-700 transition-colors"
                        )}
                        style={{ width: `${dayCellWidth}px`, gridRow: `${4 + roomIndex}` }}
                        onMouseEnter={() => { setHoveredColumnIndex(dayIndex); setHoveredRowIndex(roomIndex); }}
                        onMouseLeave={() => setHoveredRowIndex((prev) => (prev === roomIndex ? null : prev))}
                      >
                        {tasksForThisDay.length > 0 && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="absolute top-1 right-1 flex items-center justify-center w-5 h-5 rounded-full bg-gray-200 dark:bg-gray-700 cursor-pointer z-20">
                                {tasksForThisDay.length > 1 ? (
                                  <span className="text-xs font-bold text-gray-700 dark:text-gray-300">{tasksForThisDay.length}</span>
                                ) : (
                                  getTaskIcon(tasksForThisDay[0].status)
                                )}
                              </div>
                            </TooltipTrigger>
                            <TooltipContent className="p-2 text-sm">
                              <p className="font-bold mb-1">Tâches de ménage ({format(day, 'dd/MM', { locale: fr })}):</p>
                              {tasksForThisDay.map((task, idx) => (
                                <p key={idx} className="flex items-center">
                                  {getTaskIcon(task.status)}
                                  <span className="ml-1 capitalize">{task.task_type.replace('_', ' ')} - {task.status}</span>
                                </p>
                              ))}
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    );
                  })}

                  {/* Reservation Bars */}
                  {reservations
                    .filter((res) => {
                      // Correspondance robuste: par id principal, id secondaire, OU nom exact normalisé
                      const resId = norm(res.krossbooking_room_id);
                      const resName = norm(res.property_name);
                      const roomId1 = norm(room.room_id);
                      const roomId2 = norm((room as any).room_id_2);
                      const roomName = norm(room.room_name);
                      const byId = !!resId && (resId === roomId1 || (!!roomId2 && resId === roomId2));
                      const byName = !!resName && resName === roomName;
                      return byId || byName;
                    })
                    .map((reservation, idx) => {
                      // Filtre robuste annulation
                      const status = (reservation.status || '').toString().toUpperCase();
                      if (status.includes('CANC')) return null;

                      const checkIn = isValid(parseISO(reservation.check_in_date)) ? parseISO(reservation.check_in_date) : null;
                      const checkOut = isValid(parseISO(reservation.check_out_date)) ? parseISO(reservation.check_out_date) : null;
                      if (!checkIn || !checkOut) return null;

                      const monthStart = startOfMonth(currentMonth);
                      const monthEnd = endOfMonth(currentMonth);
                      const numberOfNights = differenceInDays(checkOut, checkIn);

                      const barStartDate = checkIn;
                      const barEndDate = checkOut;
                      const visibleBarStart = max([barStartDate, monthStart]);
                      const visibleBarEnd = min([barEndDate, monthEnd]);
                      if (visibleBarStart > visibleBarEnd) return null;

                      const startIndex = daysInMonth.findIndex(d => isSameDay(d, visibleBarStart));
                      const endIndex = daysInMonth.findIndex(d => isSameDay(d, visibleBarEnd));
                      if (startIndex === -1 || endIndex === -1 || startIndex > endIndex) return null;

                      let calculatedLeft: number;
                      let calculatedWidth: number;
                      const isSingleDayStay = numberOfNights === 0;

                      if (isSingleDayStay) {
                        calculatedLeft = propertyColumnWidth + (startIndex * dayCellWidth) + (dayCellWidth / 4);
                        calculatedWidth = Math.max(8, dayCellWidth / 2);
                      } else {
                        calculatedLeft = propertyColumnWidth + (startIndex * dayCellWidth) + (dayCellWidth / 2);
                        calculatedWidth = Math.max(8, (endIndex - startIndex) * dayCellWidth);
                      }

                      const isOwnerBlock = reservation.status === 'PROPRI' || reservation.status === 'PROP0';
                      const effectiveChannelKey = isOwnerBlock ? reservation.status : (reservation.channel_identifier || 'UNKNOWN');
                      const channelInfo = channelColors[effectiveChannelKey] || channelColors['UNKNOWN'];

                      const isArrivalDayVisible = isSameDay(checkIn, visibleBarStart);
                      const isDepartureDayVisible = isSameDay(checkOut, visibleBarEnd);

                      const barClasses = cn(
                        `flex items-center justify-center font-semibold overflow-hidden whitespace-nowrap ${channelInfo.bgColor} ${channelInfo.textColor} animate-fade-in-up`,
                        isMobile ? 'text-[0.6rem] px-0.5' : 'text-xs px-1',
                        slimMode && (isMobile ? 'text-[0.55rem]' : 'text-[10px]'),
                        'border border-white/20 dark:border-black/20 hover:brightness-105 transition-transform hover:-translate-y-[1px] hover:scale-[1.01] rounded-md'
                      );

                      // Animation décalée pour un effet fluide
                      return (
                        <Tooltip key={reservation.id}>
                          <TooltipTrigger asChild>
                            <div
                              className={barClasses}
                              style={{
                                position: 'absolute',
                                top: `${(3 + roomIndex) * 40 + 2}px`,
                                left: `${calculatedLeft}px`,
                                width: `${calculatedWidth}px`,
                                height: '36px',
                                marginTop: '0px',
                                marginBottom: '0px',
                                zIndex: 5,
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                borderRadius: isSingleDayStay ? 9999 : undefined,
                                animationDelay: `${(roomIndex * 40 + idx * 12)}ms`,
                              }}
                              onClick={() => handleReservationClick(reservation)}
                            >
                              {/* Effet glossy léger */}
                              <div className="absolute inset-0 pointer-events-none opacity-25" style={{ backgroundImage: 'linear-gradient(180deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.06) 100%)' }} />
                              {isArrivalDayVisible && !isSingleDayStay && <LogIn className={cn("h-4 w-4 flex-shrink-0", isMobile && "h-3 w-3")} />}
                              {isSingleDayStay && <Sparkles className={cn("h-4 w-4 flex-shrink-0", isMobile && "h-3 w-3")} />}

                              <span className="flex-grow text-center px-1 truncate">
                                <span className="inline-flex items-center gap-1">
                                  <span className={cn("inline-block w-2 h-2 rounded-full", channelInfo.bgColor)} />
                                  <span className="mr-1">{channelInfo.name.charAt(0).toUpperCase()}.</span>
                                </span>
                                <span className="mr-1">{numberOfNights}n</span>
                                <span className="mx-1">|</span>
                                <span className="truncate">{reservation.guest_name}</span>
                              </span>
                              {/* Initiales invité à droite pour style badge */}
                              <span className="ml-1 mr-1 inline-flex items-center justify-center w-6 h-6 rounded-full bg-white/20 text-white/90 text-[10px] font-semibold">
                                {getInitials(reservation.guest_name)}
                              </span>

                              {isDepartureDayVisible && !isSingleDayStay && <LogOut className={cn("h-4 w-4 flex-shrink-0", isMobile && "h-3 w-3")} />}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent className="p-2 text-sm">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={cn("inline-block w-2 h-2 rounded-full", channelInfo.bgColor)} />
                              <p className="font-bold">{reservation.guest_name}</p>
                            </div>
                            <p>Chambre: {reservation.property_name}</p>
                            <p>Du {format(checkIn, 'dd/MM/yyyy', { locale: fr })} au {format(checkOut, 'dd/MM/yyyy', { locale: fr })}</p>
                            <p>{numberOfNights} nuit(s)</p>
                            <p>Statut: {channelInfo.name}</p>
                            <p>Montant: {reservation.amount}</p>
                            <p>Canal: {reservation.channel_identifier || 'N/A'}</p>
                          </TooltipContent>
                        </Tooltip>
                      );
                    })}
                </React.Fragment>
              ))}
            </div>
          </div>
        ) : null}

        {/* Legend */}
        <div className="mt-8 p-4 border rounded-md bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm">
          <h3 className="text-md font-semibold mb-3">Légende des plateformes</h3>
          <div className="flex flex-wrap gap-3">
            {Object.entries(channelColors).map(([key, value]) => {
              const initial = value.name.charAt(0).toUpperCase();
              return (
                <div key={key} className="flex items-center">
                  <span className={`legend-bubble mr-2 ${value.bgColor}`}>{initial}</span>
                  <span className="text-sm text-gray-700 dark:text-gray-300">{value.name}</span>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>

      <ReservationActionsDialog
        isOpen={isActionsDialogOpen}
        onOpenChange={setIsActionsDialogOpen}
        booking={selectedBookingForActions}
        onEdit={handleEditReservation}
        onDelete={handleDeleteReservation}
      />

      <OwnerReservationDialog
        isOpen={isOwnerReservationDialogOpen}
        onOpenChange={setIsOwnerReservationDialogOpen}
        userRooms={userRooms}
        allReservations={reservations}
        onReservationCreated={onReservationChange}
        initialBooking={bookingToEdit}
        profile={profile}
      />
    </Card>
  );
};

export default BookingPlanningGridStudio;