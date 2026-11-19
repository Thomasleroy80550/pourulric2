export function reservationReference(booking: { id: string; ota_id?: string }): string {
  const reference = booking.ota_id?.trim();
  if (reference && !reference.startsWith("channel:") && !/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(reference)) return reference;
  const channelId = booking.id.match(/(?:^|:)(?:np_|hist_|direct_)([^:]+)$/)?.[1];
  if (channelId) return `RÉSA-${channelId.slice(0, 8).toUpperCase()}`;
  return booking.id.startsWith("channel:") ? "Référence non communiquée" : booking.id;
}
