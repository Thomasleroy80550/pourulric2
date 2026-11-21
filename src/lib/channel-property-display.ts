import { ChannelProperty, ChannelPropertyPhoto, channelPropertyName } from "./owner-channel-api";

function localizedText(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (!value || typeof value !== "object" || Array.isArray(value)) return "";
  const record = value as Record<string, unknown>;
  const text = [record.fr, record.en, record.value, record.text, record.description]
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
  const urls = record.urls;
  if (urls && typeof urls === "object" && !Array.isArray(urls)) {
    const nested = Object.values(urls as Record<string, unknown>).find(value => typeof value === "string" && value.startsWith("https://"));
    if (typeof nested === "string") return nested;
  }
  return undefined;
}

export function channelPropertyPhotos(property: ChannelProperty): ChannelPropertyPhoto[] {
  const sources = [property.photos, property.images, property.pictures, property.media];
  const photos: ChannelPropertyPhoto[] = [];
  const seen = new Set<string>();

  for (const source of sources) {
    if (!Array.isArray(source)) continue;
    for (const item of source) {
      const url = photoUrl(item);
      const caption = typeof item === "object" && item && "caption" in item && typeof item.caption === "string" ? item.caption : undefined;
      if (!url || seen.has(url)) continue;
      seen.add(url);
      photos.push({ url, caption });
    }
  }
  return photos;
}

export function channelPropertyTitle(property: ChannelProperty): string {
  return channelPropertyName(property);
}
