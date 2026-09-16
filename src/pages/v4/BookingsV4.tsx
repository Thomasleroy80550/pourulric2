import React, { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import V4Layout from "./V4Layout";
import ChannelBadge from "./ChannelBadge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  PROPERTY_IMG,
  useV4Reservations,
  upcomingReservations,
  pastReservations,
  channelOf,
  amountOf,
  formatEuro,
  formatRangeShort,
} from "./v4-data";
import { cn } from "@/lib/utils";

const BookingsV4: React.FC = () => {
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");
  const { reservations, isLoading } = useV4Reservations();

  const list =
    tab === "upcoming"
      ? upcomingReservations(reservations)
      : pastReservations(reservations).slice(0, 30);

  return (
    <V4Layout>
      <div className="space-y-4 px-4 pt-5">
        <h1 className="text-2xl font-bold text-slate-900">Réservations</h1>

        {/* Onglets */}
        <div className="flex rounded-full bg-white p-1 shadow-sm">
          {(
            [
              { key: "upcoming", label: "À venir" },
              { key: "past", label: "Passées" },
            ] as const
          ).map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                "flex-1 rounded-full py-2 text-sm font-semibold transition-colors",
                tab === t.key ? "bg-blue-600 text-white" : "text-slate-500"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Liste */}
        <div className="space-y-2">
          {isLoading && (
            <>
              <Skeleton className="h-20 w-full rounded-2xl" />
              <Skeleton className="h-20 w-full rounded-2xl" />
              <Skeleton className="h-20 w-full rounded-2xl" />
            </>
          )}
          {!isLoading && list.length === 0 && (
            <p className="rounded-2xl bg-white p-6 text-center text-sm text-slate-500 shadow-sm">
              Aucune réservation {tab === "upcoming" ? "à venir" : "passée"}.
            </p>
          )}
          {list.map((b) => {
            const amount = amountOf(b);
            return (
              <Link
                key={b.id}
                to={`/v4/reservations/${b.id}`}
                className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-sm"
              >
                <img
                  src={PROPERTY_IMG}
                  alt=""
                  className="h-16 w-16 rounded-xl object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-900">
                    {b.guest_name}
                  </p>
                  <p className="text-sm text-slate-500">
                    {formatRangeShort(b.check_in_date, b.check_out_date)}
                  </p>
                  {!!b.n_guests && (
                    <p className="text-xs text-slate-400">
                      {b.n_guests} voyageur{b.n_guests > 1 ? "s" : ""}
                    </p>
                  )}
                  {amount > 0 && (
                    <p className="mt-0.5 text-sm font-bold text-slate-900">
                      {formatEuro(amount)}
                    </p>
                  )}
                </div>
                <div className="flex flex-col items-end justify-between self-stretch py-0.5">
                  <ChevronRight className="h-4 w-4 text-slate-300" />
                  <ChannelBadge channel={channelOf(b)} />
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </V4Layout>
  );
};

export default BookingsV4;
