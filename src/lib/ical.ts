import { addDays, format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { KrossbookingReservation } from '@/lib/krossbooking';
import { UserRoom } from '@/lib/user-room-api';

interface IcalProxyResponse {
  room: {
    id: string;
    room_name: string;
  };
  ics: string;
}

function unfoldIcsText(icsText: string) {
  return icsText.replace(/\r?\n[ \t]/g, '');
}

function getIcsField(lines: string[], fieldName: string) {
  const upperFieldName = fieldName.toUpperCase();
  const line = lines.find((entry) => entry.toUpperCase().startsWith(upperFieldName));

  if (!line) {
    return undefined;
  }

  const separatorIndex = line.indexOf(':');
  return separatorIndex >= 0 ? line.slice(separatorIndex + 1).trim() : undefined;
}

function decodeIcsText(value: string) {
  return value
    .replace(/\\n/g, '\n')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\\\\/g, '\\');
}

function parseIcsDate(value?: string) {
  if (!value) {
    return null;
  }

  const match = value.trim().match(/^(\d{4})(\d{2})(\d{2})/);
  if (!match) {
    return null;
  }

  return `${match[1]}-${match[2]}-${match[3]}`;
}

function getNextDay(date: string) {
  return format(addDays(new Date(`${date}T00:00:00`), 1), 'yyyy-MM-dd');
}

export function parseIcalReservations(icsText: string, room: UserRoom): KrossbookingReservation[] {
  const unfolded = unfoldIcsText(icsText);
  const eventBlocks = unfolded
    .split(/BEGIN:VEVENT/gi)
    .slice(1)
    .map((block) => block.split(/END:VEVENT/gi)[0]);

  const reservations = eventBlocks.map<KrossbookingReservation | null>((block, index) => {
      const lines = block
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);

      const checkInDate = parseIcsDate(getIcsField(lines, 'DTSTART'));
      const rawCheckOutDate = parseIcsDate(getIcsField(lines, 'DTEND'));
      const checkOutDate = rawCheckOutDate ?? (checkInDate ? getNextDay(checkInDate) : null);
      const status = (getIcsField(lines, 'STATUS') || 'CONFIRMED').toUpperCase();

      if (!checkInDate || !checkOutDate || status === 'CANCELLED') {
        return null;
      }

      const summary = decodeIcsText(getIcsField(lines, 'SUMMARY') || 'Réservation iCal');
      const uid = getIcsField(lines, 'UID') || `${room.id}-${index}`;

      return {
        id: `ical-${room.id}-${uid}`,
        guest_name: summary,
        property_name: room.room_name,
        krossbooking_room_id: room.room_id,
        check_in_date: checkInDate,
        check_out_date: checkOutDate,
        status: 'ICAL',
        amount: '0€',
        cod_channel: 'ICAL',
        channel_identifier: 'ICAL',
        email: '',
        phone: '',
        tourist_tax_amount: 0,
        property_id: 0,
      };
    });

  return reservations.filter((reservation): reservation is KrossbookingReservation => reservation !== null);
}

export async function fetchIcalReservationsForRoom(room: UserRoom): Promise<KrossbookingReservation[]> {
  if (!room.ical_url?.trim()) {
    return [];
  }

  const { data, error } = await supabase.functions.invoke<IcalProxyResponse>('ical-proxy', {
    body: {
      roomId: room.id,
    },
  });

  if (error) {
    throw new Error(error.message || `Impossible de charger le flux iCal pour ${room.room_name}.`);
  }

  if (!data?.ics) {
    return [];
  }

  return parseIcalReservations(data.ics, room);
}
