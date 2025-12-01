"use client";

import React, { useMemo, useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Home, ChevronLeft, ChevronRight, LogIn, LogOut, Sparkles } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, parseISO, differenceInDays, max, min } from "date-fns";
import { fr } from "date-fns/locale";
import { UserRoom } from "@/lib/user-room-api";
import { KrossbookingReservation } from "@/lib/krossbooking";

type Props = {
  userRooms: UserRoom[];
  reservations: KrossbookingReservation[];
  onReservationChange?: () => void;
  refreshTrigger?: number;
  profile?: any;
};

const channelMap = (channel?: string) => {
  const key = (channel || "").toUpperCase();
  if (key.includes("AIRBNB")) return { name: "Airbnb", bg: "bg-red-500", text: "text-white" };
  if (key.includes("BOOKING")) return { name: "Booking", bg: "bg-blue-600", text: "text-white" };
  if (key.includes("VRBO") || key.includes("ABRITEL")) return { name: "VRBO", bg: "bg-indigo-600", text: "text-white" };
  if (key.includes("OWNER") || key.includes("BLOCK")) return { name: "Owner", bg: "bg-gray-600", text: "text-white" };
  return { name: key || "N/A", bg: "bg-emerald-600", text: "text-white" };
};

const BookingPlanningGridV2: React.FC<Props> = ({ userRooms, reservations }) => {
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const daysInMonth = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const isMobile = false; // V2 ciblée desktop (mobile conserve votre vue liste)
  const dayCellWidth = isMobile ? 28 : 34;
  const propertyColumnWidth = isMobile ? 80 : 160;

  const goToNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const goToPreviousMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

  const wrapperRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const now = new Date();
    if (now.getMonth() !== currentMonth.getMonth() || now.getFullYear() !== currentMonth.getFullYear()) return;
    const idx = daysInMonth.findIndex(d => isSameDay(d, now));
    if (idx === -1 || !wrapperRef.current) return;
    const target = propertyColumnWidth + idx * dayCellWidth - (wrapperRef.current.clientWidth / 2);
    wrapperRef.current.scrollLeft = Math.max(0, target);
  }, [daysInMonth, currentMonth]);

  const todayOverlay = (() => {
    const now = new Date();
    if (now.getMonth() !== currentMonth.getMonth() || now.getFullYear() !== currentMonth.getFullYear()) return null;
    const idx = daysInMonth.findIndex(d => isSameDay(d, now));
    if (idx === -1) return null;
    const left = propertyColumnWidth + idx * dayCellWidth;
    return (
      <div
        className="pointer-events-none absolute top-0 bottom-0 z-[3] bg-blue-500/8 border-x border-blue-400/30"
        style={{ left: `${left}px`, width: `${dayCellWidth}px` }}
      />
    );
  })();

  const headerCell = (day: Date, key: React.Key) => (
    <div
      key={key}
      className={`grid-cell header-cell text-center text-[11px] font-medium border-b border-r
        ${isSameDay(day, new Date()) ? "bg-blue-300 dark:bg-blue-600 border-blue-600 dark:border-blue-300 ring-1 ring-blue-500" : "bg-white dark:bg-gray-950"}
      `}
      style={{ width: `${dayCellWidth}px` }}
    >
      <div className="leading-tight">{format(day, "dd", { locale: fr })}</div>
      <div className="text-[10px] text-gray-500">{format(day, "EEE", { locale: fr })}</div>
    </div>
  );

  const clampToMonth = (startISO: string, endISO: string) => {
    const start = parseISO(startISO);
    const end = parseISO(endISO);
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const clampedStart = max([start, monthStart]);
    const clampedEnd = min([end, monthEnd]);
    return { clampedStart, clampedEnd };
  };

  return (
    <Card className="shadow-md max-w-full overflow-hidden">
      <CardHeader className="flex items-center justify-between">
        <CardTitle className="text-lg font-semibold">Planning V2 (compact)</CardTitle>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="icon" onClick={goToPreviousMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="font-medium text-lg">{format(currentMonth, "MMMM yyyy", { locale: fr })}</span>
          <Button variant="outline" size="icon" onClick={goToNextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-4 w-full max-w-full overflow-hidden">
        <div ref={wrapperRef} className="relative w-full max-w-full overflow-x-auto">
          {/* scroll shadows */}
          <div className="pointer-events-none absolute inset-y-0 left-0 w-6 z-[6] bg-gradient-to-r from-black/5 to-transparent dark:from-white/10" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-6 z-[6] bg-gradient-to-l from-black/5 to-transparent dark:from-white/10" />
          <div
            className="grid-container relative"
            style={{
              gridTemplateColumns: `${propertyColumnWidth}px repeat(${daysInMonth.length}, ${dayCellWidth}px)`,
              width: `${propertyColumnWidth + daysInMonth.length * dayCellWidth}px`,
              gridAutoRows: "36px",
              position: "relative",
            }}
          >
            {todayOverlay}

            {/* Header: placeholder sticky + day headers */}
            <div className="grid-cell header-cell sticky left-0 z-10 bg-white/90 dark:bg-gray-950/90 backdrop-blur-sm border-b border-r col-span-1"></div>
            {daysInMonth.map((day, idx) => headerCell(day, idx))}

            {/* Rows per room */}
            {userRooms.map((room, roomIdx) => (
              <React.Fragment key={room.id}>
                {/* Sticky property cell */}
                <div
                  className="grid-cell sticky left-0 z-10 bg-white/90 dark:bg-gray-950/90 backdrop-blur-sm border-r border-b flex items-center px-2 text-xs"
                  style={{ gridRow: `${2 + roomIdx}` }}
                >
                  <Home className="h-4 w-4 mr-2 text-gray-500" />
                  <span className="font-medium truncate">{room.room_name}</span>
                </div>

                {/* Background day cells */}
                {daysInMonth.map((day, dayIdx) => (
                  <div
                    key={`${room.id}-${format(day, "yyyy-MM-dd")}-bg`}
                    className={`grid-cell border-b border-r relative flex items-center justify-center
                      ${isSameDay(day, new Date()) ? "bg-blue-200 dark:bg-blue-700" : day.getDay() === 0 || day.getDay() === 6 ? "bg-slate-100 dark:bg-slate-900/60" : "bg-gray-50 dark:bg-gray-800"}
                    `}
                    style={{ width: `${dayCellWidth}px`, gridRow: `${2 + roomIdx}` }}
                  />
                ))}

                {/* Reservations bars */}
                {reservations
                  .filter(r => r.property_name === room.room_name || r.krossbooking_room_id === room.room_id)
                  .map((r) => {
                    const { clampedStart, clampedEnd } = clampToMonth(r.check_in_date, r.check_out_date);
                    const startIdx = daysInMonth.findIndex(d => isSameDay(d, clampedStart));
                    const endIdx = daysInMonth.findIndex(d => isSameDay(d, clampedEnd));
                    if (startIdx === -1 && endIdx === -1) return null;
                    const idx = startIdx === -1 ? 0 : startIdx;
                    const nights = Math.max(1, (endIdx === -1 ? daysInMonth.length - 1 : endIdx) - idx);
                    const left = propertyColumnWidth + idx * dayCellWidth;
                    const width = nights * dayCellWidth;

                    const info = channelMap(r.channel_identifier || r.cod_channel || r.status);

                    const isSingle = differenceInDays(clampedEnd, clampedStart) <= 1;
                    return (
                      <Tooltip key={r.id}>
                        <TooltipTrigger asChild>
                          <div
                            className={`absolute ${info.bg} ${info.text} font-semibold shadow-sm border border-white/20 dark:border-black/20`}
                            style={{
                              gridRow: `${2 + roomIdx}`,
                              left: `${left}px`,
                              width: `${width}px`,
                              height: "30px",
                              marginTop: "3px",
                              marginBottom: "3px",
                              zIndex: 5,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              borderRadius: isSingle ? 9999 : 6,
                              padding: "0 6px",
                            }}
                          >
                            {!isSingle && <LogIn className="h-3 w-3 opacity-80" />}
                            {isSingle && <Sparkles className="h-3 w-3 opacity-80" />}
                            <span className="flex-1 text-center truncate text-[11px] px-1">
                              {r.guest_name} • {r.amount || ""} • {info.name}
                            </span>
                            {!isSingle && <LogOut className="h-3 w-3 opacity-80" />}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent className="p-2 text-sm">
                          <p className="font-bold">{r.guest_name}</p>
                          <p>Chambre: {r.property_name}</p>
                          <p>
                            Du {format(parseISO(r.check_in_date), "dd/MM/yyyy", { locale: fr })} au{" "}
                            {format(parseISO(r.check_out_date), "dd/MM/yyyy", { locale: fr })}
                          </p>
                          <p>Canal: {r.channel_identifier || r.cod_channel || r.status}</p>
                          <p>Montant: {r.amount}</p>
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
              </React.Fragment>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default BookingPlanningGridV2;