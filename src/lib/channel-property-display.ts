import { ChannelProperty, ChannelPropertyPhoto, channelPropertyName } from "./owner-channel-api";

function localizedText(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (!value || typeof value !== "object" || Array.isArray(value)) return "";
  const record = value as Record<string, unknown>;
  const text = [record.fr, record.en, record.value, record.text, record.description, record.label, record.name, record.title]
    .find(item => typeof item === "string" && item.trim());
  return typeof text === "string" ? text.trim() : "";
}

export function channelPropertyDescription(property: ChannelProperty): string {
  const values = [property.description, property.long_description, property.summary, property.short_description, property.details];
  return values.map(localizedText).find(Boolean) || "";
}

function photoUrl(item: string | ChannelPropertyPhoto | Record<string, unknown>): string | undefined {
  if (typeof item === "string") return item;
  const record = item as Record<string, unknown>;
  const direct = [record.url, record.photo_url, record.image_url, record.src, record.original_url]
    .find(value => typeof value === "string" && value.startsWith("https://"));
  if (typeof direct === "string") return direct;
  const nestedSources = [record.url, record.image, record.urls];
  for (const source of nestedSources) {
    if (!source || typeof source !== "object" || Array.isArray(source)) continue;
    const nested = Object.values(source as Record<string, unknown>).find(value => typeof value === "string" && value.startsWith("https://"));
    if (typeof nested === "string") return nested;
  }
  return undefined;
}

function photoId(item: string | ChannelPropertyPhoto | Record<string, unknown>, fallback: string): string {
  if (typeof item === "string") return fallback;
  const record = item as Record<string, unknown>;
  const id = [record.id, record.photo_id, record.image_id, record.uuid]
    .find(value => typeof value === "string" && value.trim());
  return typeof id === "string" ? id.trim() : fallback;
}

function photoPosition(item: string | ChannelPropertyPhoto | Record<string, unknown>): number | undefined {
  if (typeof item === "string") return undefined;
  const record = item as Record<string, unknown>;
  const value = [record.position, record.order, record.sort_order, record.rank]
    .find(itemValue => typeof itemValue === "number" && Number.isFinite(itemValue));
  return typeof value === "number" ? value : undefined;
}

export function channelPropertyPhotos(property: ChannelProperty): ChannelPropertyPhoto[] {
  const sources = [property.photos, property.images, property.pictures, property.media];
  const photos: ChannelPropertyPhoto[] = [];
  const seen = new Set<string>();

  for (const source of sources) {
    if (!Array.isArray(source)) continue;
    for (const item of source) {
      const url = photoUrl(item);
      if (!url || seen.has(url)) continue;
      const record = typeof item === "object" && item ? item as unknown as Record<string, unknown> : {};
      const caption = [record.caption, record.alt, record.title, record.description].map(localizedText).find(Boolean);
      seen.add(url);
      photos.push({ id: photoId(item, url), url, caption: caption || undefined, position: photoPosition(item) });
    }
  }

  return photos.map((photo, index) => ({ photo, index }))
    .sort((a, b) => (a.photo.position ?? Number.MAX_SAFE_INTEGER / 2 + a.index) - (b.photo.position ?? Number.MAX_SAFE_INTEGER / 2 + b.index))
    .map(item => item.photo);
}

export function channelPhotoKey(photo: ChannelPropertyPhoto): string {
  return photo.id || photo.url;
}

export function applyChannelPhotoOrder(photos: ChannelPropertyPhoto[], savedOrder: string[] | null | undefined): ChannelPropertyPhoto[] {
  if (!savedOrder?.length) return photos;
  const rank = new Map(savedOrder.map((key, index) => [key, index]));
  return photos
    .map((photo, index) => ({ photo, index, order: rank.get(channelPhotoKey(photo)) ?? rank.get(photo.url) }))
    .sort((a, b) => (a.order ?? savedOrder.length + a.index) - (b.order ?? savedOrder.length + b.index))
    .map(item => item.photo);
}

function humanizeEquipmentLabel(value: string): string {
  const label = value.replace(/[_-]+/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2").trim();
  return label ? label.charAt(0).toUpperCase() + label.slice(1) : "";
}

function collectEquipment(value: unknown, output: string[]): void {
  if (typeof value === "string") {
    const label = humanizeEquipmentLabel(value);
    if (label) output.push(label);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach(item => collectEquipment(item, output));
    return;
  }
  if (!value || typeof value !== "object") return;
  const record = value as Record<string, unknown>;
  const direct = localizedText(record);
  const enabled = record.enabled !== false && record.available !== false && record.present !== false && record.value !== false;
  if (direct && enabled) {
    output.push(humanizeEquipmentLabel(direct));
    return;
  }
  Object.entries(record).forEach(([key, item]) => {
    if (item === true) output.push(humanizeEquipmentLabel(key));
    else if (Array.isArray(item)) collectEquipment(item, output);
  });
}

export function channelPropertyEquipments(property: ChannelProperty): string[] {
  const output: string[] = [];
  [property.amenities, property.equipment, property.equipments, property.features, property.facilities]
    .forEach(value => collectEquipment(value, output));
  const seen = new Set<string>();
  return output.filter(label => {
    const key = label.toLowerCase();
    if (!label || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function channelPropertyTitle(property: ChannelProperty): string {
  return channelPropertyName(property);
}
