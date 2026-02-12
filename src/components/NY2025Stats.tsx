"use client";

import React from "react";
import { Euro, Users, BedDouble, CalendarDays } from "lucide-react";

type NY2025StatsProps = {
  amount: number;
  clients: number;
  nights: number;
  reservations: number;
  nightsEquivalence?: string;
  className?: string;
};

const formatNumber = (n: number) =>
  new Intl.NumberFormat("fr-FR").format(n);

const formatEuro = (n: number) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(n);

const NY2025Stats: React.FC<NY2025StatsProps> = ({
  amount,
  clients,
  nights,
  reservations,
  nightsEquivalence,
  className
}) => {
  return (
    <div className={className}>
      <div className="text-slate-700 text-xs md:text-sm uppercase tracking-[0.25em] mb-3 text-center">
        Merci à vous
      </div>
      <h2 className="text-3xl md:text-5xl font-extrabold text-slate-900 tracking-tight text-center">
        Hello Keys 2025
      </h2>

      <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-3xl mx-auto">
        <div className="flex items-center gap-3 rounded-lg bg-white/70 border border-slate-200 p-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-sky-100 text-sky-700">
            <Euro className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-slate-600">Montant des réservations</p>
            <p className="text-lg md:text-xl font-bold text-slate-900">{formatEuro(amount)}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-lg bg-white/70 border border-slate-200 p-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-sky-100 text-sky-700">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-slate-600">Clients</p>
            <p className="text-lg md:text-xl font-bold text-slate-900">{formatNumber(clients)}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-lg bg-white/70 border border-slate-200 p-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-sky-100 text-sky-700">
            <BedDouble className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-slate-600">Nuits</p>
            <p className="text-lg md:text-xl font-bold text-slate-900">{formatNumber(nights)}</p>
            {nightsEquivalence && (
              <p className="text-xs text-slate-500">{nightsEquivalence}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-lg bg-white/70 border border-slate-200 p-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-sky-100 text-sky-700">
            <CalendarDays className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs text-slate-600">Total réservations</p>
            <p className="text-lg md:text-xl font-bold text-slate-900">{formatNumber(reservations)}</p>
          </div>
        </div>
      </div>

      <p className="mt-6 text-slate-700 text-sm md:text-base text-center max-w-2xl mx-auto">
        Merci pour votre confiance. En route pour 2026 !
      </p>
    </div>
  );
};

export default NY2025Stats;