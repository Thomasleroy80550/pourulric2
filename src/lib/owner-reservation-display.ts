import { isValid, parseISO } from "date-fns";
import type { KrossbookingReservation } from "./krossbooking";
import type { UserRoom } from "./user-room-api";
import type { ImportedChannelReservation, ReservationSource } from "./channel-reservations-api";

export function channelRoom(source: ReservationSource): UserRoom {
  return {
    id: source.id, user_id: source.client_profile_id,
    room_id: `channel:${source.agency_id}:${source.environment}:${source.property_id}`,
    room_name: source.property_name || `Logement ${source.property_id.slice(0, 8)}`,
  };
}
export function displayChannelReservation(record: ImportedChannelReservation, source: ReservationSource): KrossbookingReservation | null {
  const payload = record.channel_reservations.payload;
  if (!record.is_active || typeof payload.check_in !== "string" || typeof payload.check_out !== "string" ||
      !isValid(parseISO(payload.check_in)) || !isValid(parseISO(payload.check_out)) || parseISO(payload.check_out) <= parseISO(payload.check_in)) return null;
  const rawChannel = typeof payload.channel_id === "string" ? payload.channel_id.toUpperCase() : "UNKNOWN";
  const channel = rawChannel.startsWith("AIR") ? "AIRBNB" : rawChannel.startsWith("BOO") ? "BOOKING" : rawChannel.startsWith("HOM") || rawChannel.includes("VRBO") ? "ABRITEL" : rawChannel;
  const rawStatus = typeof payload.status === "string" ? payload.status.toUpperCase() : "UNKNOWN";
  const status = rawStatus.includes("CANC") ? "CANC" : payload.owner_stay === true ? "PROPRI" : rawStatus;
  const adults = typeof payload.adults === "number" ? payload.adults : undefined;
  const children = typeof payload.children === "number" ? payload.children : undefined;
  const room = channelRoom(source);
  return {
    id: `${room.room_id}:${record.reservation_id}`, guest_name: typeof payload.guest_name === "string" ? payload.guest_name : "Voyageur",
    property_name: room.room_name, krossbooking_room_id: room.room_id,
    check_in_date: payload.check_in, check_out_date: payload.check_out, status,
    amount: typeof payload.total_amount === "number" || typeof payload.total_amount === "string" ? String(payload.total_amount) : "0",
    cod_channel: payload.owner_stay === true ? "OWNER" : channel, channel_identifier: channel,
    ota_id: typeof payload.reference === "string" ? payload.reference : undefined,
    property_id: 0, channel_property_id: source.property_id, reservation_source: "owner_channel",
    n_adults: adults, n_children: children, n_guests: adults != null || children != null ? (adults || 0) + (children || 0) : undefined,
    currency: typeof payload.currency === "string" ? payload.currency : undefined,
  };
}

export function mergeOwnerReservationDisplay(legacyRooms: UserRoom[], legacyReservations: KrossbookingReservation[], channelRooms: UserRoom[], channelReservations: KrossbookingReservation[]) {
  const normalize = (name: string) => name.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const roomIds = new Map<string, string>();
  const extraRooms: UserRoom[] = [];
  for (const room of channelRooms) {
    const matches = legacyRooms.filter(old => normalize(old.room_name) === normalize(room.room_name));
    const uniqueChannelName = channelRooms.filter(other => normalize(other.room_name) === normalize(room.room_name)).length === 1;
    if (matches.length === 1 && uniqueChannelName) roomIds.set(room.room_id, matches[0].room_id);
    else extraRooms.push(room);
  }
  const imported = channelReservations.map(reservation => ({ ...reservation, krossbooking_room_id: roomIds.get(reservation.krossbooking_room_id) || reservation.krossbooking_room_id }));
  // Only suppress a legacy duplicate with the same reference, room and stay dates.
  const signatures = new Set(imported.filter(r => r.ota_id).map(r => `${r.krossbooking_room_id}:${r.ota_id}:${r.check_in_date.slice(0, 10)}:${r.check_out_date.slice(0, 10)}`));
  const legacy = legacyReservations.filter(r => !r.ota_id || !signatures.has(`${r.krossbooking_room_id}:${r.ota_id}:${r.check_in_date.slice(0, 10)}:${r.check_out_date.slice(0, 10)}`));
  return { rooms: [...legacyRooms, ...extraRooms], reservations: [...legacy, ...imported] };
}
