import { useQuery } from "@tanstack/react-query";
import { parse, isValid, parseISO, differenceInCalendarDays } from "date-fns";
import { fr } from "date-fns/locale";
import { getUserRooms } from "@/lib/user-room-api";
import {
  fetchKrossbookingReservations,
  KrossbookingReservation,
} from "@/lib/krossbooking";
import { getMyStatements } from "@/lib/statements-api";
import { SavedInvoice } from "@/lib/admin-api";
import { getReviews } from "@/lib/reviews-api";

export const PROPERTY_IMG = "/assets/v4-property.png";

export type V4Channel = "airbnb" | "booking" | "direct" | "other";

// ---------- Hooks ----------

export function useV4Rooms() {
  return useQuery({ queryKey: ["v4-rooms"], queryFn: getUserRooms });
}

export function useV4Reservations() {
  const rooms = useV4Rooms();
  const query = useQuery({
    queryKey: ["v4-reservations", (rooms.data ?? []).map((r) => r.room_id)],
    queryFn: () => fetchKrossbookingReservations(rooms.data ?? []),
    enabled: !!rooms.data && rooms.data.length > 0,
  });
  return {
    reservations: query.data ?? [],
    rooms: rooms.data ?? [],
    isLoading: rooms.isLoading || (rooms.data?.length ? query.isLoading : false),
  };
}

export function useV4Statements() {
  return useQuery({ queryKey: ["v4-statements"], queryFn: getMyStatements });
}

export function useV4Reviews() {
  return useQuery({ queryKey: ["v4-reviews"], queryFn: getReviews });
}

// ---------- Réservations : helpers ----------

export function isCancelled(res: KrossbookingReservation): boolean {
  return (res.status || "").toUpperCase().includes("CANC");
}

export function isOwnerBlock(res: KrossbookingReservation): boolean {
  const status = (res.status || "").toUpperCase();
  const channel = (res.cod_channel || "").toUpperCase();
  return status.startsWith("PROP") || channel.includes("OWNER");
}

export function channelOf(res: KrossbookingReservation): V4Channel {
  const raw = (res.cod_channel || res.channel_identifier || "").toUpperCase();
  if (raw.includes("AIRBNB")) return "airbnb";
  if (raw.includes("BOOKING")) return "booking";
  if (raw.includes("DIRECT") || raw.includes("HELLOKEYS") || raw.includes("PROP"))
    return "direct";
  return "other";
}

export function amountOf(res: KrossbookingReservation): number {
  const n = parseFloat((res.amount || "0").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

export function nightsOf(res: KrossbookingReservation): number {
  const start = parseISO(res.check_in_date);
  const end = parseISO(res.check_out_date);
  if (!isValid(start) || !isValid(end)) return 0;
  return Math.max(0, differenceInCalendarDays(end, start));
}

/** Réservations "voyageurs" valides (ni annulées, ni blocages propriétaire). */
export function guestReservations(
  reservations: KrossbookingReservation[],
): KrossbookingReservation[] {
  return reservations.filter((r) => !isCancelled(r) && !isOwnerBlock(r));
}

export function upcomingReservations(
  reservations: KrossbookingReservation[],
): KrossbookingReservation[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return guestReservations(reservations)
    .filter((r) => {
      const out = parseISO(r.check_out_date);
      return isValid(out) && out >= today;
    })
    .sort((a, b) => a.check_in_date.localeCompare(b.check_in_date));
}

export function pastReservations(
  reservations: KrossbookingReservation[],
): KrossbookingReservation[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return guestReservations(reservations)
    .filter((r) => {
      const out = parseISO(r.check_out_date);
      return isValid(out) && out < today;
    })
    .sort((a, b) => b.check_in_date.localeCompare(a.check_in_date));
}

/** Nuits d'une réservation comprises dans un mois donné. */
export function nightsInMonth(
  res: KrossbookingReservation,
  year: number,
  month: number,
): number {
  const start = parseISO(res.check_in_date);
  const end = parseISO(res.check_out_date);
  if (!isValid(start) || !isValid(end)) return 0;
  const monthStart = new Date(year, month, 1);
  const monthEnd = new Date(year, month + 1, 1);
  const from = start > monthStart ? start : monthStart;
  const to = end < monthEnd ? end : monthEnd;
  return Math.max(0, differenceInCalendarDays(to, from));
}

// ---------- Relevés : helpers ----------

const MONTH_FALLBACK: Record<string, number> = {
  janvier: 0, février: 1, fevrier: 1, mars: 2, avril: 3, mai: 4,
  juin: 5, juillet: 6, août: 7, aout: 7, septembre: 8, octobre: 9,
  novembre: 10, décembre: 11, decembre: 11,
};

export function statementDate(s: SavedInvoice): Date | null {
  let parsed = parse(s.period, "MMMM yyyy", new Date(), { locale: fr });
  if (!isValid(parsed)) parsed = parse(s.period, "MMM yyyy", new Date(), { locale: fr });
  if (isValid(parsed)) return parsed;
  const yearMatch = s.period.match(/(20\d{2})/);
  const monthIndex =
    MONTH_FALLBACK[s.period.toLowerCase().split(" ")[0].replace(".", "")];
  if (yearMatch && monthIndex !== undefined) {
    return new Date(parseInt(yearMatch[1], 10), monthIndex, 1);
  }
  return null;
}

/** Chiffre d'affaires (logement) du relevé. */
export function statementCA(s: SavedInvoice): number {
  if (s.totals?.totalCA != null) return s.totals.totalCA;
  const rows = Array.isArray(s.invoice_data) ? s.invoice_data : [];
  return rows.reduce(
    (acc: number, item: any) =>
      acc + (item.prixSejour || 0) + (item.fraisMenage || 0) + (item.taxeDeSejour || 0),
    0,
  );
}

/** Revenus nets pour le propriétaire. */
export function statementNet(s: SavedInvoice): number {
  const moneyIn = s.totals?.totalMontantVerse || 0;
  const frais = s.totals?.totalFacture || 0;
  return moneyIn - frais;
}

/** Relevés triés du plus récent au plus ancien. */
export function sortStatements(statements: SavedInvoice[]): SavedInvoice[] {
  return [...statements].sort((a, b) => {
    const da = statementDate(a)?.getTime() ?? 0;
    const db = statementDate(b)?.getTime() ?? 0;
    return db - da;
  });
}

// ---------- Format ----------

export function formatEuro(n: number): string {
  return (
    Math.round(n).toLocaleString("fr-FR") + " €"
  );
}

const MONTHS_SHORT = [
  "janv.", "févr.", "mars", "avr.", "mai", "juin",
  "juil.", "août", "sept.", "oct.", "nov.", "déc.",
];

const MONTHS_LONG = [
  "janvier", "février", "mars", "avril", "mai", "juin",
  "juillet", "août", "septembre", "octobre", "novembre", "décembre",
];

export function formatRangeShort(startIso: string, endIso: string): string {
  const s = parseISO(startIso);
  const e = parseISO(endIso);
  if (!isValid(s) || !isValid(e)) return "";
  return `${s.getDate()} → ${e.getDate()} ${MONTHS_SHORT[e.getMonth()]} ${e.getFullYear()}`;
}

export function formatRangeLong(startIso: string, endIso: string): string {
  const s = parseISO(startIso);
  const e = parseISO(endIso);
  if (!isValid(s) || !isValid(e)) return "";
  return `${s.getDate()} → ${e.getDate()} ${MONTHS_LONG[e.getMonth()]} ${e.getFullYear()}`;
}

export function monthLabel(date: Date): string {
  return `${MONTHS_LONG[date.getMonth()].charAt(0).toUpperCase()}${MONTHS_LONG[date.getMonth()].slice(1)} ${date.getFullYear()}`;
}
