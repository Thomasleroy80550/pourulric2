import React, { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, CalendarPlus, MoonStar, PercentCircle } from "lucide-react";
import { parseISO, isValid, isSameDay } from "date-fns";
import V4Layout from "./V4Layout";
import OwnerReservationDialog from "@/components/OwnerReservationDialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useSession } from "@/components/SessionContextProvider";
import { clearReservationsCache } from "@/lib/krossbooking";
import { GuestAvatar } from "./V4Thumb";
import {
  useV4Reservations,
  upcomingReservations,
  isCancelled,
  isOwnerBlock,
  formatRangeShort,
  monthLabel,
} from "./v4-data";
import { cn } from "@/lib/utils";

type DayStatus = "reserved" | "blocked";

interface DayInfo {
  status: DayStatus;
  isStart: boolean;
  isEnd: boolean;
  reservationId: string;
}

const weekDays = ["L", "M", "M", "J", "V", "S", "D"];

const CalendarV4: React.FC = () => {
  const navigate = useNavigate();
  const { reservations, rooms, isLoading } = useV4Reservations();
  const { profile } = useSession();
  const queryClient = useQueryClient();
  const [isBlockDialogOpen, setIsBlockDialogOpen] = useState(false);
  const [viewDate, setViewDate] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  const handleReservationCreated = () => {
    clearReservationsCache();
    queryClient.invalidateQueries({ queryKey: ["v4-reservations"] });
  };

  const today = new Date();
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const offset = (new Date(year, month, 1).getDay() + 6) % 7; // lundi = 0
  const isCurrentMonth =
    today.getFullYear() === year && today.getMonth() === month;

  const days = useMemo(() => {
    const map: Record<number, DayInfo> = {};
    reservations
      .filter((r) => !isCancelled(r))
      .forEach((r) => {
        const start = parseISO(r.check_in_date);
        const end = parseISO(r.check_out_date);
        if (!isValid(start) || !isValid(end)) return;
        const status: DayStatus = isOwnerBlock(r) ? "blocked" : "reserved";
        const d = new Date(start);
        while (d < end) {
          if (d.getFullYear() === year && d.getMonth() === month) {
            const dayNum = d.getDate();
            // Les réservations voyageurs priment sur les blocages
            if (map[dayNum]?.status !== "reserved") {
              const lastNight = new Date(end);
              lastNight.setDate(lastNight.getDate() - 1);
              map[dayNum] = {
                status,
                isStart: isSameDay(d, start),
                isEnd: isSameDay(d, lastNight),
                reservationId: r.id,
              };
            }
          }
          d.setDate(d.getDate() + 1);
        }
      });
    return map;
  }, [reservations, year, month]);

  // Stats du mois affiché
  const reservedNights = Object.values(days).filter(
    (d) => d.status === "reserved"
  ).length;
  const occupancy = Math.min(
    100,
    Math.round((reservedNights / daysInMonth) * 100)
  );

  const upcoming = upcomingReservations(reservations).slice(0, 3);

  const cells: (number | null)[] = [
    ...Array.from({ length: offset }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const handleDayClick = (day: number) => {
    const info = days[day];
    if (info?.status === "reserved") {
      navigate(`/v4/reservations/${info.reservationId}`);
    }
  };

  return (
    <V4Layout>
      <div className="space-y-5 px-4 pt-5">
        <h1 className="text-2xl font-bold text-slate-900">Calendrier</h1>

        <div className="rounded-2xl bg-white p-4 shadow-sm">
          {/* Navigation mois */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => setViewDate(new Date(year, month - 1, 1))}
              className="rounded-full bg-slate-50 p-2 text-slate-600"
              aria-label="Mois précédent"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="flex flex-col items-center">
              <p className="font-bold text-slate-900">{monthLabel(viewDate)}</p>
              {!isCurrentMonth && (
                <button
                  onClick={() =>
                    setViewDate(
                      new Date(today.getFullYear(), today.getMonth(), 1)
                    )
                  }
                  className="text-xs font-semibold text-hk-600"
                >
                  Revenir à aujourd'hui
                </button>
              )}
            </div>
            <button
              onClick={() => setViewDate(new Date(year, month + 1, 1))}
              className="rounded-full bg-slate-50 p-2 text-slate-600"
              aria-label="Mois suivant"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Stats du mois */}
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2">
              <MoonStar className="h-4 w-4 text-hk-600" />
              <div>
                <p className="text-sm font-bold leading-tight text-slate-900">
                  {reservedNights}
                </p>
                <p className="text-[10px] text-slate-500">nuits réservées</p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2">
              <PercentCircle className="h-4 w-4 text-hk-600" />
              <div>
                <p className="text-sm font-bold leading-tight text-slate-900">
                  {occupancy} %
                </p>
                <p className="text-[10px] text-slate-500">d'occupation</p>
              </div>
            </div>
          </div>

          {/* Jours de la semaine */}
          <div className="mt-4 grid grid-cols-7 text-center">
            {weekDays.map((d, i) => (
              <span key={i} className="text-[11px] font-semibold text-slate-400">
                {d}
              </span>
            ))}
          </div>

          {/* Grille */}
          {isLoading ? (
            <Skeleton className="mt-2 h-52 w-full rounded-xl" />
          ) : (
            <div className="mt-1.5 grid grid-cols-7 gap-y-1">
              {cells.map((day, i) => {
                if (day === null) return <span key={`e-${i}`} className="h-10" />;
                const info = days[day];
                const date = new Date(year, month, day);
                const isToday = isSameDay(date, today);
                const isPast =
                  date < new Date(today.getFullYear(), today.getMonth(), today.getDate());
                const col = (offset + day - 1) % 7;

                return (
                  <button
                    key={day}
                    onClick={() => handleDayClick(day)}
                    className="relative flex h-10 items-center justify-center"
                  >
                    {/* Bande de séjour continue */}
                    {info && (
                      <span
                        className={cn(
                          "absolute inset-y-0.5",
                          info.status === "reserved"
                            ? "bg-rose-100"
                            : "bg-hk-100",
                          isPast && "opacity-50",
                          // arrondis : début/fin de séjour + bords de semaine
                          info.isStart || col === 0
                            ? "left-0.5 rounded-l-full"
                            : "-left-px",
                          info.isEnd || col === 6
                            ? "right-0.5 rounded-r-full"
                            : "-right-px"
                        )}
                      />
                    )}
                    {/* Cercle aujourd'hui */}
                    {isToday && (
                      <span className="absolute inset-y-0.5 left-1/2 aspect-square -translate-x-1/2 rounded-full border-2 border-hk-600" />
                    )}
                    <span
                      className={cn(
                        "relative text-sm",
                        info?.status === "reserved" && "font-semibold text-rose-700",
                        info?.status === "blocked" && "font-semibold text-hk-700",
                        !info && "text-slate-700",
                        isPast && !isToday && "text-opacity-40",
                        isPast && info && "opacity-60",
                        isToday && "font-bold text-hk-700"
                      )}
                    >
                      {day}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Légende */}
          <div className="mt-3 flex items-center justify-center gap-4 border-t border-slate-100 pt-3">
            <span className="flex items-center gap-1.5 text-xs text-slate-500">
              <span className="h-2.5 w-5 rounded-full bg-rose-200" /> Réservé
            </span>
            <span className="flex items-center gap-1.5 text-xs text-slate-500">
              <span className="h-2.5 w-5 rounded-full bg-hk-200" /> Blocage
            </span>
            <span className="flex items-center gap-1.5 text-xs text-slate-500">
              <span className="h-2.5 w-5 rounded-full border border-slate-200 bg-white" />{" "}
              Libre
            </span>
          </div>
          <p className="mt-2 text-center text-[11px] text-slate-400">
            Touchez un séjour pour voir la réservation
          </p>
        </div>

        {/* Prochaines réservations */}
        <div>
          <h2 className="px-1 font-semibold text-slate-900">
            Prochaines réservations
          </h2>
          <div className="mt-2 space-y-2">
            {isLoading && <Skeleton className="h-16 w-full rounded-2xl" />}
            {!isLoading && upcoming.length === 0 && (
              <p className="rounded-2xl bg-white p-4 text-center text-sm text-slate-500 shadow-sm">
                Aucune réservation à venir.
              </p>
            )}
            {upcoming.map((r) => (
              <Link
                key={r.id}
                to={`/v4/reservations/${r.id}`}
                className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-sm"
              >
                <GuestAvatar name={r.guest_name} className="h-12 w-14 text-base" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-900">
                    {formatRangeShort(r.check_in_date, r.check_out_date)}
                  </p>
                  <p className="text-sm text-slate-600">{r.guest_name}</p>
                  {!!r.n_guests && (
                    <p className="text-xs text-slate-400">
                      {r.n_guests} voyageur{r.n_guests > 1 ? "s" : ""}
                    </p>
                  )}
                </div>
                <ChevronRight className="h-4 w-4 text-slate-300" />
              </Link>
            ))}
          </div>
        </div>

        <button
          onClick={() => setIsBlockDialogOpen(true)}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-hk-600 py-3.5 font-semibold text-white shadow-md"
        >
          <CalendarPlus className="h-5 w-5" />
          Bloquer des dates pour moi
        </button>
      </div>

      <OwnerReservationDialog
        isOpen={isBlockDialogOpen}
        onOpenChange={setIsBlockDialogOpen}
        userRooms={rooms}
        allReservations={reservations}
        onReservationCreated={handleReservationCreated}
        profile={profile}
      />
    </V4Layout>
  );
};

export default CalendarV4;
