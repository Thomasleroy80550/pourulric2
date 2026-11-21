import { ChannelProperty, ChannelPropertyPhoto, channelPropertyName } from "./owner-channel-api";

export function channelPropertyDescription(property: ChannelProperty): string {
  const values = [property.description, property.summary];
  return values.find(value => typeof value === "string" && value.trim())?.trim() || "";
}

export function channelPropertyPhotos(property: ChannelProperty): ChannelPropertyPhoto[] {
  const sources = [property.photos, property.images, property.pictures, property.media];
  const photos: ChannelPropertyPhoto[] = [];
  const seen = new Set<string>();

  for (const source of sources) {
    if (!Array.isArray(source)) continue;
    for (const item of source) {
      const url = typeof item === "string" ? item : item?.url;
      const caption = typeof item === "object" && item && "caption" in item && typeof item.caption === "string" ? item.caption : undefined;
      if (typeof url !== "string" || !url.startsWith("https://") || seen.has(url)) continue;
      seen.add(url);
      photos.push({ url, caption });
    }
  }
  return photos;
}

export function channelPropertyTitle(property: ChannelProperty): string {
  return channelPropertyName(property);
}
