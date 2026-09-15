import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronLeft, MoreHorizontal, CalendarDays, Users, Info } from "lucide-react";
import V4Layout from "./V4Layout";
import ChannelBadge from "./ChannelBadge";
import { PROPERTY_IMG, bookings, formatEuro } from "./mockData";

function formatRangeLong(start: string, end: string): { range: string; nights: number } {
  const s = new Date(start);
  const e = new Date(end);
  const months = [
    "janvier", "février", "mars", "avril", "mai", "juin",
    "juillet", "août", "septembre", "octobre", "novembre", "décembre",
  ];
  const nights = Math.round((e.getTime() - s.getTime()) / 86400000);
  return {
    range: `${s.getDate()} → ${e.getDate()} ${months[e.getMonth()]} ${e.getFullYear()}`,
    nights,
  };
}

const BookingDetailV4: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const booking = bookings.find((b) => b.id === id) ?? bookings[0];
  const { range, nights } = formatRangeLong(booking.startDate, booking.endDate);

  return (
    <V4Layout hideNav>
      <div className="pb-8">
        {/* Photo + header */}
        <div className="relative">
          <img src={PROPERTY_IMG} alt="" className="h-52 w-full object-cover" />
          <div className="absolute inset-x-0 top-0 flex items-center justify-between p-4">
            <button
              onClick={() => navigate(-1)}
              className="rounded-full bg-white/90 p-2 text-slate-700 shadow-sm"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button className="rounded-full bg-white/90 p-2 text-slate-700 shadow-sm">
              <MoreHorizontal className="h-5 w-5" />
            </button>
          </div>
          {!booking.past && (
            <span className="absolute bottom-3 right-3 rounded-full bg-blue-600 px-3 py-1 text-xs font-semibold text-white">
              À venir
            </span>
          )}
        </div>

        <div className="space-y-4 px-4 pt-4">
          <div className="flex items-start justify-between">
            <h1 className="text-2xl font-bold text-slate-900">
              {booking.guestName}
            </h1>
            <ChannelBadge channel={booking.channel} />
          </div>

          <div className="space-y-3 rounded-2xl bg-white p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <CalendarDays className="h-5 w-5 text-slate-400" />
              <div>
                <p className="text-sm font-semibold text-slate-900">{range}</p>
                <p className="text-xs text-slate-500">{nights} nuits</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-slate-400" />
              <p className="text-sm font-semibold text-slate-900">
                {booking.guests} voyageurs
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-2xl bg-blue-50 p-4">
            <div>
              <p className="text-sm font-semibold text-slate-900">
                Montant du séjour
              </p>
              <p className="text-xs text-slate-500">
                (inclus dans le chiffre d'affaires)
              </p>
            </div>
            <p className="text-lg font-bold text-slate-900">
              {formatEuro(booking.amount)}
            </p>
          </div>

          <div className="flex gap-3 rounded-2xl bg-slate-100 p-4">
            <Info className="mt-0.5 h-5 w-5 shrink-0 text-blue-500" />
            <p className="text-sm text-slate-600">
              La gestion de cette réservation est assurée par Hello Keys. Vous
              n'avez aucune action à effectuer.
            </p>
          </div>
        </div>
      </div>
    </V4Layout>
  );
};

export default BookingDetailV4;
