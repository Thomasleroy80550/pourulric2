import type { UserRoom } from "./user-room-api";

function splitTextList(value?: string): string[] {
  return (value || "")
    .split(/[\n;•]+/)
    .flatMap(part => part.includes(":") ? [part] : part.split(","))
    .map(part => part.trim())
    .filter(Boolean);
}

export function roomEquipmentItems(room: UserRoom): string[] {
  const items = [
    ...splitTextList(room.appliances_list),
    ...splitTextList(room.specific_appliances),
    ...splitTextList(room.bedding_description),
    ...splitTextList(room.outdoor_equipment),
  ];
  if (room.has_baby_cot) items.push("Lit bébé");
  if (room.has_high_chair) items.push("Chaise haute");
  if (room.has_cleaning_equipment) items.push("Matériel de ménage");
  const seen = new Set<string>();
  return items.filter(item => {
    const key = item.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
