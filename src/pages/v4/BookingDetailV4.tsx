import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronLeft, CalendarDays, Users, Info } from "lucide-react";
import { parseISO, isValid } from "date-fns";
import V4Layout from "./V4Layout";
import ChannelBadge from "./ChannelBadge";
import { GuestAvatar } from "./V4Thumb";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useV4Reservations,
  channelOf,
  amountOf,
  nightsOf,
  formatEuro,
  formatRangeLong,
} from "./v4-data";

const BookingDetailV4: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { reservations, isLoading } = useV4Reservations();
  const booking = reservations.find((b) => b.id === id);

  const isUpcoming =
    booking &&
    isValid(parseISO(booking.check_out_date)) &&
    parseISO(booking.check_out_date) >= new Date();

  return (
    <V4Layout hideNav>
      <div className="pb-8">
        {/* Bandeau + header */}
        <div className="relative">
          <div className="flex h-40 w-full items-center justify-center bg-gradient-to-br from-hk-500 to-hk-700">
            {booking && (
              <GuestAvatar
                name={booking.guest_name}
                light
                className="h-20 w-20 rounded-full text-3xl"
              />
            )}
          </div>
          <div className="absolute inset-x-0 top-0 flex items-center justify-between p-4">
            <button
              onClick={() => navigate(-1)}
              className="rounded-full bg-white/90 p-2 text-slate-700 shadow-sm"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          </div>
          {isUpcoming && (
            <span className="absolute bottom-3 right-3 rounded-full bg-hk-600 px-3 py-1 text-xs font-semibold text-white">
              À venir
            </span>
          )}
        </div>

        <div className="space-y-4 px-4 pt-4">
          {isLoading && !booking && (
            <>
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-24 w-full rounded-2xl" />
            </>
          )}

          {!isLoading && !booking && (
            <p className="rounded-2xl bg-white p-6 text-center text-sm text-slate-500 shadow-sm">
              Réservation introuvable.
            </p>
          )}

          {booking && (
            <>
              <div className="flex items-start justify-between">
                <h1 className="text-2xl font-bold text-slate-900">
                  {booking.guest_name}
                </h1>
                <ChannelBadge channel={channelOf(booking)} />
              </div>

              <div className="space-y-3 rounded-2xl bg-white p-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <CalendarDays className="h-5 w-5 text-slate-400" />
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {formatRangeLong(
                        booking.check_in_date,
                        booking.check_out_date
                      )}
                    </p>
                    <p className="text-xs text-slate-500">
                      {nightsOf(booking)} nuits
                    </p>
                  </div>
                </div>
                {!!booking.n_guests && (
                  <div className="flex items-center gap-3">
                    <Users className="h-5 w-5 text-slate-400" />
                    <p className="text-sm font-semibold text-slate-900">
                      {booking.n_guests} voyageur{booking.n_guests > 1 ? "s" : ""}
                      {booking.n_adults
                        ? ` · ${booking.n_adults} adulte${booking.n_adults > 1 ? "s" : ""}`
                        : ""}
                      {booking.n_children
                        ? ` · ${booking.n_children} enfant${booking.n_children > 1 ? "s" : ""}`
                        : ""}
                    </p>
                  </div>
                )}
              </div>

              {amountOf(booking) > 0 && (
                <div className="flex items-center justify-between rounded-2xl bg-hk-50 p-4">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      Montant du séjour
                    </p>
                    <p className="text-xs text-slate-500">
                      (inclus dans le chiffre d'affaires)
                    </p>
                  </div>
                  <p className="text-lg font-bold text-slate-900">
                    {formatEuro(amountOf(booking))}
                  </p>
                </div>
              )}

              <div className="flex gap-3 rounded-2xl bg-slate-100 p-4">
                <Info className="mt-0.5 h-5 w-5 shrink-0 text-hk-500" />
                <p className="text-sm text-slate-600">
                  La gestion de cette réservation est assurée par Hello Keys.
                  Vous n'avez aucune action à effectuer.
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </V4Layout>
  );
};

export default BookingDetailV4;
