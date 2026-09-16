import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight, CalendarPlus } from "lucide-react";
import { parseISO, isValid, isSameDay } from "date-fns";
import V4Layout from "./V4Layout";
import { Skeleton } from "@/components/ui/skeleton";
import {
  PROPERTY_IMG,
  useV4Reservations,
  upcomingReservations,
  isCancelled,
  isOwnerBlock,
  formatRangeShort,
  monthLabel,
} from "./v4-data";
import { cn } from "@/lib/utils";

type DayStatus = "reserved" | "blocked";

const weekDays = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

const CalendarV4: React.FC = () => {
  const { reservations, isLoading } = useV4Reservations();
  const [viewDate, setViewDate] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const offset = (new Date(year, month, 1).getDay() + 6) % 7; // lundi = 0

  const dayStatuses = useMemo(() => {
    const map: Record<number, DayStatus> = {};
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
            // "reserved" prime sur "blocked"
            if (map[d.getDate()] !== "reserved") map[d.getDate()] = status;
          }
          d.setDate(d.getDate() + 1);
        }
      });
    return map;
  }, [reservations, year, month]);

  const today = new Date();
  const upcoming = upcomingReservations(reservations).slice(0, 3);

  const cells: (number | null)[] = [
    ...Array.from({ length: offset }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <V4Layout>
      <div className="space-y-5 px-4 pt-5">
        <h1 className="text-2xl font-bold text-slate-900">Calendrier</h1>

        <div className="rounded-2xl bg-white p-4 shadow-sm">
          {/* Navigation mois */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => setViewDate(new Date(year, month - 1, 1))}
              className="rounded-full p-1.5 text-slate-500 hover:bg-slate-50"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <p className="font-semibold text-slate-900">{monthLabel(viewDate)}</p>
            <button
              onClick={() => setViewDate(new Date(year, month + 1, 1))}
              className="rounded-full p-1.5 text-slate-500 hover:bg-slate-50"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          {/* Jours de la semaine */}
          <div className="mt-4 grid grid-cols-7 text-center">
            {weekDays.map((d) => (
              <span key={d} className="text-xs font-medium text-slate-400">
                {d}
              </span>
            ))}
          </div>

          {/* Grille */}
          {isLoading ? (
            <Skeleton className="mt-2 h-48 w-full" />
          ) : (
            <div className="mt-2 grid grid-cols-7 gap-y-1.5 text-center">
              {cells.map((day, i) => {
                if (day === null) return <span key={`e-${i}`} />;
                const status = dayStatuses[day];
                const isToday = isSameDay(new Date(year, month, day), today);
                return (
                  <div key={day} className="flex justify-center">
                    <span
                      className={cn(
                        "flex h-9 w-9 items-center justify-center rounded-lg text-sm",
                        isToday &&
                          "border-2 border-emerald-400 font-bold text-emerald-600",
                        status === "reserved" &&
                          "bg-rose-100 font-medium text-rose-700",
                        status === "blocked" &&
                          "bg-blue-100 font-medium text-blue-700",
                        !status && !isToday && "text-slate-600"
                      )}
                    >
                      {day}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Légende */}
          <div className="mt-4 flex items-center gap-4 border-t border-slate-100 pt-3">
            <span className="flex items-center gap-1.5 text-xs text-slate-500">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-300" /> Réservé
            </span>
            <span className="flex items-center gap-1.5 text-xs text-slate-500">
              <span className="h-2.5 w-2.5 rounded-full bg-blue-300" /> Votre blocage
            </span>
            <span className="flex items-center gap-1.5 text-xs text-slate-500">
              <span className="h-2.5 w-2.5 rounded-full bg-slate-200" /> Disponible
            </span>
          </div>
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
                <img
                  src={PROPERTY_IMG}
                  alt=""
                  className="h-12 w-14 rounded-xl object-cover"
                />
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

        <Link
          to="/calendar"
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 py-3.5 font-semibold text-white shadow-md"
        >
          <CalendarPlus className="h-5 w-5" />
          Bloquer des dates pour moi
        </Link>
      </div>
    </V4Layout>
  );
};

export default CalendarV4;
