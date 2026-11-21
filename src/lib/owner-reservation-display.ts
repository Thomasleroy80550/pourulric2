import { isValid, parseISO } from "date-fns";
import type { KrossbookingReservation } from "./krossbooking";
import type { UserRoom } from "./user-room-api";
import type { ImportedChannelReservation, ReservationSource } from "./channel-reservations-api";
import type { ChannelBlock } from "./channel-features-api";

export function channelRoom(source: ReservationSource): UserRoom {
  if (source.user_rooms) {
    return {
      ...source.user_rooms,
      user_id: source.client_profile_id,
    };
  }
  return {
    id: source.id,
    user_id: source.client_profile_id,
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
    id: `${room.room_id}:${record.reservation_id}`,
    guest_name: typeof payload.guest_name === "string" ? payload.guest_name : "Voyageur",
    property_name: room.room_name,
    krossbooking_room_id: room.room_id,
    check_in_date: payload.check_in,
    check_out_date: payload.check_out,
    status,
    amount: typeof payload.total_amount === "number" || typeof payload.total_amount === "string" ? String(payload.total_amount) : "0",
    cod_channel: payload.owner_stay === true ? "OWNER" : channel,
    channel_identifier: channel,
    ota_id: typeof payload.reference === "string" ? payload.reference : undefined,
    property_id: 0,
    channel_property_id: source.property_id,
    reservation_source: "owner_channel",
    n_adults: adults,
    n_children: children,
    n_guests: adults != null || children != null ? (adults || 0) + (children || 0) : undefined,
    currency: typeof payload.currency === "string" ? payload.currency : undefined,
    channel_assignment_id: source.id,
  };
}

export function displayChannelBlock(block: ChannelBlock, source: ReservationSource): KrossbookingReservation {
  const room = channelRoom(source);
  return {
    id: `channel-block:${block.id}`,
    guest_name: "Blocage propriétaire",
    property_name: room.room_name,
    krossbooking_room_id: room.room_id,
    check_in_date: block.check_in,
    check_out_date: block.check_out,
    status: "PROPRI",
    amount: "0",
    cod_channel: "OWNER",
    channel_identifier: "OWNER",
    property_id: 0,
    channel_property_id: source.property_id,
    reservation_source: "owner_channel",
    channel_assignment_id: source.id,
    channel_block_id: block.id,
  };
}

export function mergeOwnerReservationDisplay(
  legacyRooms: UserRoom[],
  legacyReservations: KrossbookingReservation[],
  channelRooms: UserRoom[],
  channelReservations: KrossbookingReservation[],
) {
  const legacyById = new Map(legacyRooms.map(room => [room.id, room]));
  const importedRoomIds = new Map<string, string>();
  const replacedRoomIds = new Set<string>();
  const extraRooms: UserRoom[] = [];

  for (const room of channelRooms) {
    const linkedRoom = legacyById.get(room.id);
    if (linkedRoom) {
      importedRoomIds.set(room.room_id, linkedRoom.room_id);
      replacedRoomIds.add(linkedRoom.room_id);
    } else {
      extraRooms.push(room);
    }
  }

  const imported = channelReservations.map(reservation => ({
    ...reservation,
    krossbooking_room_id: importedRoomIds.get(reservation.krossbooking_room_id) || reservation.krossbooking_room_id,
  }));

  // Pour un logement explicitement lié à Cadence, les réservations Cadence remplacent Krossbooking.
  const legacy = legacyReservations.filter(reservation => !replacedRoomIds.has(reservation.krossbooking_room_id));

  return {
    rooms: [...legacyRooms, ...extraRooms],
    reservations: [...legacy, ...imported],
    replacedRoomIds,
  };
}
