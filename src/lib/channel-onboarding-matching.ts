import { ChannelProperty, channelPropertyName, OnboardingContext, OnboardingOwner } from "./owner-channel-api";

export interface OwnerSuggestion {
  ownerId: string;
  score: number;
  reason: string;
}
export interface PropertyMatch {
  suggestions: OwnerSuggestion[];
  strong: boolean;
}
export function onboardingOwnerName(owner: OnboardingOwner) {
  return [owner.first_name, owner.last_name].filter(Boolean).join(" ") || owner.email || owner.id;
}
function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}
const ignored = new Set(["les", "des", "une", "pour", "avec", "dans", "sur", "chez", "maison", "studio", "appartement", "logement", "chambre", "villa", "gite", "residence"]);
function tokens(value: string) {
  return normalize(value).split(" ").filter(word => word.length > 2 && !ignored.has(word));
}

export function proposeChannelOwners(properties: ChannelProperty[], context: OnboardingContext): Record<string, PropertyMatch> {
  const rooms = new Map<string, string[]>();
  context.rooms.forEach(room => {
    const labels = rooms.get(room.user_id) || [];
    labels.push(room.room_name);
    rooms.set(room.user_id, labels);
  });
  const matches: Record<string, PropertyMatch> = {};
  for (const property of properties) {
    const name = channelPropertyName(property);
    const label = name === property.id ? "" : normalize(name);
    const labelTokens = new Set(tokens(label));
    const suggestions: OwnerSuggestion[] = [];
    for (const owner of context.owners) {
      let score = 0;
      let reason = "";
      for (const room of rooms.get(owner.id) || []) {
        const roomLabel = normalize(room);
        const roomTokens = new Set(tokens(room));
        if (label && labelTokens.size && label === roomLabel) {
          score = 100; reason = "Nom identique à un logement déjà lié au profil."; break;
        }
        const overlap = Array.from(labelTokens).filter(word => roomTokens.has(word)).length;
        const unionSize = new Set([...labelTokens, ...roomTokens]).size;
        const similarity = unionSize ? overlap / unionSize : 0;
        if (overlap >= 2 && similarity >= 0.5 && score < 60 + Math.round(similarity * 20)) {
          score = 60 + Math.round(similarity * 20); reason = `Nom proche d’un logement existant : ${room}`;
        }
      }
      const first = normalize(owner.first_name || "");
      const last = normalize(owner.last_name || "");
      if (first && last && first !== last && ` ${label} `.includes(` ${first} `) && ` ${label} `.includes(` ${last} `) && score < 90) {
        score = 90; reason = "Prénom et nom du propriétaire présents dans le nom du logement.";
      }
      if (score) suggestions.push({ ownerId: owner.id, score, reason });
    }
    suggestions.sort((a, b) => b.score - a.score || a.ownerId.localeCompare(b.ownerId));
    const strong = !!suggestions[0] && suggestions[0].score >= 90 && (!suggestions[1] || suggestions[0].score - suggestions[1].score >= 15);
    matches[property.id] = { suggestions: suggestions.slice(0, 3), strong };
  }
  return matches;
}
