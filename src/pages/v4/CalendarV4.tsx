import React from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight, CalendarPlus } from "lucide-react";
import V4Layout from "./V4Layout";
import { PROPERTY_IMG } from "./mockData";
import { cn } from "@/lib/utils";

type DayStatus = "reserved" | "blocked" | "available";

// Septembre 2026 : le 1er tombe un mardi
const dayStatuses: Record<number, DayStatus> = {
  10: "blocked", 11: "blocked", 12: "blocked", 13: "blocked",
  14: "blocked", 15: "blocked",
  16: "reserved", 17: "reserved", 18: "reserved", 19: "reserved",
  20: "reserved", 21: "reserved",
  23: "reserved", 24: "reserved", 25: "reserved", 26: "reserved",
  29: "blocked", 30: "blocked",
};

const TODAY = 9;
const weekDays = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

const CalendarV4: React.FC = () => {
  // Grille : septembre 2026 commence un mardi (offset 1), 30 jours
  const cells: (number | null)[] = [
    ...Array.from({ length: 1 }, () => null),
    ...Array.from({ length: 30 }, (_, i) => i + 1),
  ];

  return (
    <V4Layout>
      <div className="space-y-5 px-4 pt-5">
        <h1 className="text-2xl font-bold text-slate-900">Calendrier</h1>

        <div className="rounded-2xl bg-white p-4 shadow-sm">
          {/* Navigation mois */}
          <div className="flex items-center justify-between">
            <button className="rounded-full p-1.5 text-slate-500 hover:bg-slate-50">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <p className="font-semibold text-slate-900">Septembre 2026</p>
            <button className="rounded-full p-1.5 text-slate-500 hover:bg-slate-50">
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
          <div className="mt-2 grid grid-cols-7 gap-y-1.5 text-center">
            {cells.map((day, i) => {
              if (day === null) return <span key={`e-${i}`} />;
              const status = dayStatuses[day];
              const isToday = day === TODAY;
              return (
                <div key={day} className="flex justify-center">
                  <span
                    className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-lg text-sm",
                      isToday &&
                        "border-2 border-emerald-400 font-bold text-emerald-600",
                      status === "reserved" && "bg-rose-100 text-rose-700 font-medium",
                      status === "blocked" && "bg-blue-100 text-blue-700 font-medium",
                      !status && !isToday && "text-slate-600"
                    )}
                  >
                    {day}
                  </span>
                </div>
              );
            })}
          </div>

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
            {[
              { id: "r1", dates: "16 → 21 sept.", guest: "Martine DESANGLOIS", guests: 2 },
              { id: "r2", dates: "3 → 8 oct.", guest: "Sophie Martin", guests: 3 },
            ].map((r) => (
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
                  <p className="text-sm font-semibold text-slate-900">{r.dates}</p>
                  <p className="text-sm text-slate-600">{r.guest}</p>
                  <p className="text-xs text-slate-400">{r.guests} voyageurs</p>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-300" />
              </Link>
            ))}
          </div>
        </div>

        <button className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 py-3.5 font-semibold text-white shadow-md">
          <CalendarPlus className="h-5 w-5" />
          Bloquer des dates pour moi
        </button>
      </div>
    </V4Layout>
  );
};

export default CalendarV4;
