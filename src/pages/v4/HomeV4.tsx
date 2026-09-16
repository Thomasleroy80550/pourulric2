import React from "react";
import { Link } from "react-router-dom";
import {
  Bell,
  ChevronRight,
  Star,
  CalendarCheck,
  LogIn,
  LogOut,
  BedDouble,
  Sparkles,
} from "lucide-react";
import {
  formatDistanceToNow,
  parseISO,
  isValid,
  isSameDay,
  format,
} from "date-fns";
import { fr } from "date-fns/locale";
import V4Layout from "./V4Layout";
import { GuestAvatar } from "./V4Thumb";
import { Skeleton } from "@/components/ui/skeleton";
import { useSession } from "@/components/SessionContextProvider";
import {
  useV4Reservations,
  useV4Reviews,
  useV4Notifications,
  useV4Housekeeping,
  upcomingReservations,
  pastReservations,
  guestReservations,
  nightsInMonth,
  amountOf,
  formatEuro,
  formatRangeShort,
} from "./v4-data";

const HomeV4: React.FC = () => {
  const { profile } = useSession();
  const { reservations, rooms, isLoading } = useV4Reservations();
  const { data: reviews } = useV4Reviews();
  const { data: notifications } = useV4Notifications();
  const { data: cleanings } = useV4Housekeeping();
  const unreadCount = (notifications ?? []).filter((n) => !n.is_read).length;

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const guests = guestReservations(reservations);
  const monthGuests = guests.filter((r) => nightsInMonth(r, year, month) > 0);
  const monthRevenue = guests
    .filter((r) => {
      const d = parseISO(r.check_in_date);
      return isValid(d) && d.getFullYear() === year && d.getMonth() === month;
    })
    .reduce((acc, r) => acc + amountOf(r), 0);
  const monthNights = monthGuests.reduce(
    (acc, r) => acc + nightsInMonth(r, year, month),
    0,
  );
  const occupancy = Math.min(100, Math.round((monthNights / daysInMonth) * 100));

  const upcoming = upcomingReservations(reservations);
  const next = upcoming[0];

  const monthShort = now.toLocaleDateString("fr-FR", {
    month: "short",
    year: "numeric",
  });

  // Statut du jour
  const showRoomName = rooms.length > 1;
  const arrivalToday = guests.find((r) => {
    const d = parseISO(r.check_in_date);
    return isValid(d) && isSameDay(d, now);
  });
  const departureToday = guests.find((r) => {
    const d = parseISO(r.check_out_date);
    return isValid(d) && isSameDay(d, now);
  });
  const currentStay = guests.find((r) => {
    const s = parseISO(r.check_in_date);
    const e = parseISO(r.check_out_date);
    return isValid(s) && isValid(e) && s <= now && now < e;
  });

  let status: {
    icon: React.ReactNode;
    iconBg: string;
    title: string;
    detail: string;
    to?: string;
  } | null = null;
  if (arrivalToday) {
    status = {
      icon: <LogIn className="h-5 w-5 text-emerald-600" />,
      iconBg: "bg-emerald-50",
      title: "Arrivée aujourd'hui",
      detail: `${arrivalToday.guest_name}${showRoomName && arrivalToday.property_name ? ` · ${arrivalToday.property_name}` : ""}`,
      to: `/v4/reservations/${arrivalToday.id}`,
    };
  } else if (departureToday) {
    status = {
      icon: <LogOut className="h-5 w-5 text-amber-600" />,
      iconBg: "bg-amber-50",
      title: "Départ aujourd'hui",
      detail: `${departureToday.guest_name}${showRoomName && departureToday.property_name ? ` · ${departureToday.property_name}` : ""}`,
      to: `/v4/reservations/${departureToday.id}`,
    };
  } else if (currentStay) {
    const out = parseISO(currentStay.check_out_date);
    status = {
      icon: <BedDouble className="h-5 w-5 text-hk-600" />,
      iconBg: "bg-hk-50",
      title: "Voyageur sur place",
      detail: `${currentStay.guest_name} · départ le ${isValid(out) ? format(out, "d MMM", { locale: fr }) : ""}`,
      to: `/v4/reservations/${currentStay.id}`,
    };
  }
  // Évite le doublon avec la carte "Prochaine réservation"
  if (arrivalToday && next && arrivalToday.id === next.id) {
    status = null;
  }

  // Actualités dérivées des vraies données
  const lastPast = pastReservations(reservations)[0];
  const lastReview = reviews?.[0];
  const news: { key: string; icon: React.ReactNode; label: string; when: string; to: string }[] = [];

  // Statut des ménages
  const todayStr = format(now, "yyyy-MM-dd");
  const allCleanings = cleanings ?? [];
  const lastDoneCleaning = [...allCleanings]
    .filter((t) => t.completed && t.dateScheduled && t.dateScheduled <= todayStr)
    .sort((a, b) => b.dateScheduled.localeCompare(a.dateScheduled))[0];
  const nextCleaning = allCleanings.find(
    (t) => !t.completed && t.dateScheduled && t.dateScheduled >= todayStr,
  );
  if (lastDoneCleaning) {
    const roomSuffix =
      showRoomName && lastDoneCleaning.room ? ` · ${lastDoneCleaning.room}` : "";
    news.push({
      key: "cleaning-done",
      icon: <Sparkles className="h-5 w-5 text-teal-500" />,
      label:
        lastDoneCleaning.dateScheduled === todayStr
          ? `Le ménage de votre logement vient d'être terminé${roomSuffix}`
          : `Ménage effectué${roomSuffix}`,
      when: relative(lastDoneCleaning.dateScheduled),
      to: "/v4/menages",
    });
  }
  if (nextCleaning) {
    const roomSuffix =
      showRoomName && nextCleaning.room ? ` · ${nextCleaning.room}` : "";
    news.push({
      key: "cleaning-next",
      icon: <Sparkles className="h-5 w-5 text-hk-500" />,
      label: `Ménage prévu${roomSuffix}`,
      when: relative(nextCleaning.dateScheduled),
      to: "/v4/menages",
    });
  }

  if (lastPast) {
    news.push({
      key: "past",
      icon: <CalendarCheck className="h-5 w-5 text-emerald-500" />,
      label: `Séjour terminé · ${lastPast.guest_name}`,
      when: relative(lastPast.check_out_date),
      to: `/v4/reservations/${lastPast.id}`,
    });
  }
  if (lastReview) {
    news.push({
      key: "review",
      icon: <Star className="h-5 w-5 text-amber-400" />,
      label: `Nouvel avis ${lastReview.rating}★`,
      when: relative(lastReview.rawDate),
      to: "/v4/avis",
    });
  }

  return (
    <V4Layout>
      <div className="space-y-4 px-4 pt-5">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-extrabold tracking-wide text-hk-600 uppercase">
              Hello Keys
            </p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900">
              Bonjour {profile?.first_name ?? ""} 👋
            </h1>
            <p className="mt-0.5 text-sm text-slate-500">
              Votre logement est entre de bonnes mains.
            </p>
          </div>
          <Link
            to="/v4/notifications"
            className="relative rounded-full bg-white p-2.5 text-slate-600 shadow-sm"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </Link>
        </div>

        {/* Statut du jour (uniquement si activité aujourd'hui) */}
        {!isLoading && status && <StatusCard status={status} />}

        {/* KPIs du mois */}
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="font-semibold text-slate-900">Ce mois-ci</p>
            <p className="text-sm text-slate-400 capitalize">{monthShort}</p>
          </div>
          {isLoading ? (
            <Skeleton className="mt-3 h-12 w-full" />
          ) : (
            <div className="mt-3 grid grid-cols-3 divide-x divide-slate-100">
              <div className="pr-2">
                <p className="text-lg font-bold text-slate-900">
                  {formatEuro(monthRevenue)}
                </p>
                <p className="text-xs text-slate-500">Revenus estimés</p>
              </div>
              <div className="px-3">
                <p className="text-lg font-bold text-slate-900">{occupancy} %</p>
                <p className="text-xs text-slate-500">Occupation</p>
              </div>
              <div className="pl-3">
                <p className="text-lg font-bold text-slate-900">{monthNights}</p>
                <p className="text-xs text-slate-500">Nuits réservées</p>
              </div>
            </div>
          )}
        </div>

        {/* Prochaine réservation */}
        {next ? (
          <Link
            to={`/v4/reservations/${next.id}`}
            className="block overflow-hidden rounded-2xl bg-hk-600 p-4 text-white shadow-md"
          >
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <p className="text-xs font-medium text-hk-100">
                  Prochaine réservation
                </p>
                <p className="mt-1 text-xl font-bold">
                  {formatRangeShort(next.check_in_date, next.check_out_date)}
                </p>
                <p className="mt-1 text-sm text-hk-100">{next.guest_name}</p>
                {!!next.n_guests && (
                  <p className="text-sm text-hk-100">
                    {next.n_guests} voyageur{next.n_guests > 1 ? "s" : ""}
                  </p>
                )}
              </div>
              <GuestAvatar
                name={next.guest_name}
                light
                className="h-20 w-24 text-2xl"
              />
            </div>
          </Link>
        ) : (
          !isLoading && (
            <div className="rounded-2xl bg-white p-4 text-center text-sm text-slate-500 shadow-sm">
              Aucune réservation à venir pour le moment.
            </div>
          )
        )}

        {/* Dernières actualités */}
        {news.length > 0 && (
          <div>
            <h2 className="px-1 font-semibold text-slate-900">
              Dernières actualités
            </h2>
            <div className="mt-2 space-y-2">
              {news.map((a) => (
                <Link
                  key={a.key}
                  to={a.to}
                  className="flex items-center gap-3 rounded-2xl bg-white p-3 shadow-sm"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50">
                    {a.icon}
                  </span>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-900">{a.label}</p>
                    <p className="text-xs text-slate-500">{a.when}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-300" />
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </V4Layout>
  );
};

const StatusCard: React.FC<{
  status: {
    icon: React.ReactNode;
    iconBg: string;
    title: string;
    detail: string;
    to?: string;
  };
}> = ({ status }) => {
  const content = (
    <>
      <span
        className={`flex h-11 w-11 items-center justify-center rounded-xl ${status.iconBg}`}
      >
        {status.icon}
      </span>
      <div className="flex-1">
        <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
          Aujourd'hui
        </p>
        <p className="text-sm font-semibold text-slate-900">{status.title}</p>
        <p className="text-xs text-slate-500">{status.detail}</p>
      </div>
      {status.to && <ChevronRight className="h-4 w-4 text-slate-300" />}
    </>
  );
  const className = "flex w-full items-center gap-3 rounded-2xl bg-white p-3 shadow-sm";
  return status.to ? (
    <Link to={status.to} className={className}>
      {content}
    </Link>
  ) : (
    <div className={className}>{content}</div>
  );
};

function relative(iso: string): string {
  const d = parseISO(iso);
  if (!isValid(d)) return "";
  return formatDistanceToNow(d, { addSuffix: true, locale: fr });
}

export default HomeV4;
