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
    <Card className="shadow-md max-w-full overflow-hidden border border-slate-200 dark:border-slate-700">
      <CardHeader className="flex flex-row items-center justify-between bg-gradient-to-r from-indigo-600 via-fuchsia-600 to-pink-600 text-white">
        <CardTitle className="text-lg font-semibold">Planning Studio 2026</CardTitle>
        <div className="flex items-center space-x-2">
          <Button variant="secondary" size="icon" onClick={goToPreviousMonth} className="bg-white/20 hover:bg-white/30 text-white">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="font-medium text-lg drop-shadow-sm">
            {format(currentMonth, 'MMMM yyyy', { locale: fr })}
          </span>
          <Button variant="secondary" size="icon" onClick={goToNextMonth} className="bg-white/20 hover:bg-white/30 text-white">
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="secondary" size="sm" onClick={goToToday} className="ml-1 bg-white/20 hover:bg-white/30 text-white">
            <CalendarDays className="h-4 w-4" />
            <span className="ml-2 hidden sm:inline">Aujourd'hui</span>
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-4 w-full max-w-full overflow-hidden bg-slate-50 dark:bg-gray-900">
        {(loadingTasks || loadingRoomTypes) && reservations.length === 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        )}
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
          <div ref={wrapperRef} className="relative w-full max-w-full overflow-x-auto rounded-lg">
            {/* Scroll shadows */}
            <div className="pointer-events-none absolute inset-y-0 left-0 w-6 z-[6] bg-gradient-to-r from-black/10 to-transparent dark:from-white/10" />
            <div className="pointer-events-none absolute inset-y-0 right-0 w-6 z-[6] bg-gradient-to-l from-black/10 to-transparent dark:from-white/10" />

            <div className="grid-container relative" style={{
              gridTemplateColumns: `${propertyColumnWidth}px repeat(${daysInMonth.length}, ${dayCellWidth}px)`,
              width: `${propertyColumnWidth + daysInMonth.length * dayCellWidth}px`,
              gridAutoRows: '40px',
              position: 'relative',
            }}
              onMouseLeave={() => setHoveredColumnIndex(null)}
            >
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
                          style={{ left: `${left}px`, width: `${dayCellWidth}px` }}
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
                  <div className={cn("grid-cell property-name-cell sticky left-0 z-10 bg-white/90 dark:bg-gray-950/90 backdrop-blur-sm border-r border-b flex items-center px-2", slimMode ? "text-xs" : "text-sm")}
                    style={{ gridRow: `${4 + roomIndex}` }}>
                    <Home className="h-4 w-4 mr-2 text-gray-500" />
                    <span className={cn("font-medium truncate", slimMode ? "text-xs" : "text-sm")}>
                      {room.room_name}
                    </span>
                  </div>

                  {/* Background day cells */}
                  {daysInMonth.map((day, dayIndex) => {
                    const tasksForThisDay = housekeepingTasks.filter(task =>
                      isValid(parseISO(task.date)) && isSameDay(parseISO(task.date), day) && task.id_room.toString() === room.room_id
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
                        onMouseEnter={() => setHoveredColumnIndex(dayIndex)}
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
                    .filter(res => res.property_name === room.room_name || res.krossbooking_room_id === room.room_id)
                    .map((reservation) => {
                      if (reservation.status === 'CANC') return null;

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
                        calculatedWidth = dayCellWidth / 2;
                      } else {
                        calculatedLeft = propertyColumnWidth + (startIndex * dayCellWidth) + (dayCellWidth / 2);
                        calculatedWidth = (endIndex - startIndex) * dayCellWidth;
                      }

                      const isOwnerBlock = reservation.status === 'PROPRI' || reservation.status === 'PROP0';
                      const effectiveChannelKey = isOwnerBlock ? reservation.status : (reservation.channel_identifier || 'UNKNOWN');
                      const channelInfo = channelColors[effectiveChannelKey] || channelColors['UNKNOWN'];

                      const isArrivalDayVisible = isSameDay(checkIn, visibleBarStart);
                      const isDepartureDayVisible = isSameDay(checkOut, visibleBarEnd);

                      const barClasses = cn(
                        `absolute h-9 flex items-center justify-center font-semibold overflow-hidden whitespace-nowrap ${channelInfo.bgColor} ${channelInfo.textColor}`,
                        isMobile ? 'text-[0.6rem] px-0.5' : 'text-xs px-1',
                        slimMode && (isMobile ? 'text-[0.55rem]' : 'text-[10px]'),
                        'border border-white/20 dark:border-black/20 shadow-sm hover:shadow-md hover:brightness-95 transition-transform hover:-translate-y-[1px]'
                      );

                      return (
                        <Tooltip key={reservation.id}>
                          <TooltipTrigger asChild>
                            <div
                              className={barClasses}
                              style={{
                                gridRow: `${4 + roomIndex}`,
                                left: `${calculatedLeft}px`,
                                width: `${calculatedWidth}px`,
                                height: '36px',
                                marginTop: '2px',
                                marginBottom: '2px',
                                zIndex: 5,
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                borderRadius: isSingleDayStay
                                  ? 9999
                                  : undefined,
                              }}
                              onClick={() => handleReservationClick(reservation)}
                            >
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
            {Object.entries(channelColors).map(([key, value]) => (
              <div key={key} className="flex items-center">
                <span className={`w-4 h-4 rounded-full mr-2 ring-2 ring-white/10 ${value.bgColor}`}></span>
                <span className="text-sm text-gray-700 dark:text-gray-300">{value.name}</span>
              </div>
            ))}
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