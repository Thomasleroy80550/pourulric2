import React from "react";
import { Link } from "react-router-dom";
import { Bell, ChevronDown, ChevronRight, Sparkles, CalendarPlus, Star } from "lucide-react";
import V4Layout from "./V4Layout";
import {
  PROPERTY_IMG,
  owner,
  property,
  monthFinance,
  bookings,
  activities,
  formatEuro,
} from "./mockData";

const activityIcons: Record<string, React.ReactNode> = {
  cleaning: <Sparkles className="h-5 w-5 text-emerald-500" />,
  booking: <CalendarPlus className="h-5 w-5 text-blue-500" />,
  review: <Star className="h-5 w-5 text-amber-400" />,
};

const HomeV4: React.FC = () => {
  const next = bookings[0];

  return (
    <V4Layout>
      <div className="space-y-4 px-4 pt-5">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-extrabold tracking-wide text-blue-600 uppercase">
              Hello Keys
            </p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900">
              Bonjour {owner.firstName} 👋
            </h1>
            <p className="mt-0.5 text-sm text-slate-500">
              Votre logement est entre de bonnes mains.
            </p>
          </div>
          <button className="rounded-full bg-white p-2.5 text-slate-600 shadow-sm">
            <Bell className="h-5 w-5" />
          </button>
        </div>

        {/* Sélecteur de logement */}
        <div className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-sm">
          <img
            src={PROPERTY_IMG}
            alt={property.name}
            className="h-12 w-16 rounded-xl object-cover"
          />
          <div className="flex-1">
            <p className="font-semibold text-slate-900">{property.name}</p>
            <p className="text-sm text-slate-500">{property.city}</p>
          </div>
          <ChevronDown className="h-5 w-5 text-slate-400" />
        </div>

        {/* KPIs du mois */}
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="font-semibold text-slate-900">Ce mois-ci</p>
            <p className="text-sm text-slate-400">Sept. 2026</p>
          </div>
          <div className="mt-3 grid grid-cols-3 divide-x divide-slate-100">
            <div className="pr-2">
              <p className="text-lg font-bold text-slate-900">
                {formatEuro(monthFinance.revenue)}
              </p>
              <p className="text-xs text-slate-500">Revenus estimés</p>
            </div>
            <div className="px-3">
              <p className="text-lg font-bold text-slate-900">
                {monthFinance.occupancy} %
              </p>
              <p className="text-xs text-slate-500">Occupation</p>
            </div>
            <div className="pl-3">
              <p className="text-lg font-bold text-slate-900">
                {monthFinance.nightsBooked}
              </p>
              <p className="text-xs text-slate-500">Nuits réservées</p>
            </div>
          </div>
        </div>

        {/* Prochaine réservation */}
        <Link
          to={`/v4/reservations/${next.id}`}
          className="block overflow-hidden rounded-2xl bg-blue-600 p-4 text-white shadow-md"
        >
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <p className="text-xs font-medium text-blue-100">
                Prochaine réservation
              </p>
              <p className="mt-1 text-xl font-bold">16 → 21 sept. 2026</p>
              <p className="mt-1 text-sm text-blue-100">{next.guestName}</p>
              <p className="text-sm text-blue-100">{next.guests} voyageurs</p>
            </div>
            <img
              src={PROPERTY_IMG}
              alt=""
              className="h-20 w-24 rounded-xl object-cover"
            />
          </div>
        </Link>

        {/* Dernières actualités */}
        <div>
          <div className="flex items-center justify-between px-1">
            <h2 className="font-semibold text-slate-900">Dernières actualités</h2>
            <button className="text-sm font-medium text-blue-600">Voir tout</button>
          </div>
          <div className="mt-2 space-y-2">
            {activities.map((a) => (
              <div
                key={a.label}
                className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-sm"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50">
                  {activityIcons[a.icon]}
                </span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-900">{a.label}</p>
                  <p className="text-xs text-slate-500">{a.when}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-300" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </V4Layout>
  );
};

export default HomeV4;
