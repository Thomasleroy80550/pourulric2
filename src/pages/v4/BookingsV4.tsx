import React, { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, ExternalLink } from "lucide-react";
import V4Layout from "./V4Layout";
import ChannelBadge from "./ChannelBadge";
import { PROPERTY_IMG, bookings, formatEuro } from "./mockData";
import { cn } from "@/lib/utils";

function formatRange(start: string, end: string): string {
  const s = new Date(start);
  const e = new Date(end);
  const months = [
    "janv.", "févr.", "mars", "avr.", "mai", "juin",
    "juil.", "août", "sept.", "oct.", "nov.", "déc.",
  ];
  return `${s.getDate()} → ${e.getDate()} ${months[e.getMonth()]} ${e.getFullYear()}`;
}

const BookingsV4: React.FC = () => {
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");
  const list = bookings.filter((b) => (tab === "past" ? b.past : !b.past));

  return (
    <V4Layout>
      <div className="space-y-4 px-4 pt-5">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-900">Réservations</h1>
          <button className="rounded-full bg-white p-2 text-slate-500 shadow-sm">
            <ExternalLink className="h-4 w-4" />
          </button>
        </div>

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
          {list.map((b) => (
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
                  {b.guestName}
                </p>
                <p className="text-sm text-slate-500">
                  {formatRange(b.startDate, b.endDate)}
                </p>
                <p className="text-xs text-slate-400">{b.guests} voyageurs</p>
                <p className="mt-0.5 text-sm font-bold text-slate-900">
                  {formatEuro(b.amount)}
                </p>
              </div>
              <div className="flex flex-col items-end justify-between self-stretch py-0.5">
                <ChevronRight className="h-4 w-4 text-slate-300" />
                <ChannelBadge channel={b.channel} />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </V4Layout>
  );
};

export default BookingsV4;
