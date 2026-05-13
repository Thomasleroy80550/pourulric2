import { supabase } from "@/integrations/supabase/client";
import { uploadFile } from "@/lib/storage-api";

export type MiniSiteStatus = "draft" | "published";

export interface MiniSite {
  id: string;
  user_id: string;
  site_name: string;
  slug: string;
  status: MiniSiteStatus;
  template_key: string;
  primary_color: string;
  slogan: string | null;
  logo_url: string | null;
  hero_image_url: string | null;
  hero_title: string | null;
  hero_subtitle: string | null;
  about_text: string | null;
  highlights: string[];
  gallery_images: string[];
  contact_email: string | null;
  contact_phone: string | null;
  cta_label: string | null;
  cta_url: string | null;
  seo_title: string | null;
  seo_description: string | null;
  custom_domain: string | null;
  created_at: string;
  updated_at: string;
  profiles?: {
    first_name: string | null;
    last_name: string | null;
    email: string | null;
  } | null;
}

export interface MiniSiteInput {
  site_name: string;
  slug: string;
  status?: MiniSiteStatus;
  template_key?: string;
  primary_color: string;
  slogan?: string | null;
  logo_url?: string | null;
  hero_image_url?: string | null;
  hero_title?: string | null;
  hero_subtitle?: string | null;
  about_text?: string | null;
  highlights?: string[];
  gallery_images?: string[];
  contact_email?: string | null;
  contact_phone?: string | null;
  cta_label?: string | null;
  cta_url?: string | null;
  seo_title?: string | null;
  seo_description?: string | null;
  custom_domain?: string | null;
}

export interface AdminMiniSiteUpdate {
  site_name?: string;
  slug?: string;
  status?: MiniSiteStatus;
  primary_color?: string;
  slogan?: string | null;
  hero_title?: string | null;
  hero_subtitle?: string | null;
  about_text?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  cta_label?: string | null;
  cta_url?: string | null;
  seo_title?: string | null;
  seo_description?: string | null;
  custom_domain?: string | null;
}

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/svg+xml"];

function normalizeText(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function normalizeArray(values?: string[]) {
  return (values || []).map((value) => value.trim()).filter(Boolean);
}

function sanitizeFileName(fileName: string) {
  return fileName.toLowerCase().replace(/[^a-z0-9.-]/g, "-");
}

export function slugifyMiniSiteValue(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

export function validateMiniSiteSlug(slug: string) {
  const normalized = slugifyMiniSiteValue(slug);

  if (!normalized) {
    throw new Error("Veuillez renseigner un slug valide.");
  }

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(normalized)) {
    throw new Error("Le slug doit contenir uniquement des lettres minuscules, chiffres et tirets.");
  }

  return normalized;
}

function normalizeMiniSitePayload(payload: MiniSiteInput) {
  return {
    site_name: payload.site_name.trim(),
    slug: validateMiniSiteSlug(payload.slug),
    status: payload.status ?? "draft",
    template_key: payload.template_key ?? "premium-v1",
    primary_color: payload.primary_color || "#f97316",
    slogan: normalizeText(payload.slogan),
    logo_url: normalizeText(payload.logo_url),
    hero_image_url: normalizeText(payload.hero_image_url),
    hero_title: normalizeText(payload.hero_title),
    hero_subtitle: normalizeText(payload.hero_subtitle),
    about_text: normalizeText(payload.about_text),
    highlights: normalizeArray(payload.highlights).slice(0, 4),
    gallery_images: normalizeArray(payload.gallery_images).slice(0, 3),
    contact_email: normalizeText(payload.contact_email),
    contact_phone: normalizeText(payload.contact_phone),
    cta_label: normalizeText(payload.cta_label),
    cta_url: normalizeText(payload.cta_url),
    seo_title: normalizeText(payload.seo_title),
    seo_description: normalizeText(payload.seo_description),
    custom_domain: normalizeText(payload.custom_domain),
  };
}

async function getAuthenticatedUserId() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    throw new Error(error.message);
  }

  if (!user) {
    throw new Error("Utilisateur non authentifié.");
  }

  return user.id;
}

async function ensureSlugAvailable(slug: string, excludedId?: string) {
  let query = supabase.from("mini_sites").select("id").eq("slug", slug).limit(1);

  if (excludedId) {
    query = query.neq("id", excludedId);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  if ((data || []).length > 0) {
    throw new Error("Ce slug est déjà utilisé. Merci d'en choisir un autre.");
  }
}

function mapMiniSite(row: any): MiniSite {
  return {
    ...row,
    highlights: Array.isArray(row.highlights) ? row.highlights.filter(Boolean) : [],
    gallery_images: Array.isArray(row.gallery_images) ? row.gallery_images.filter(Boolean) : [],
  } as MiniSite;
}

export function buildMiniSitePublicUrl(slug: string) {
  return `/sites/${slug}`;
}

export async function getMyMiniSite(): Promise<MiniSite | null> {
  const userId = await getAuthenticatedUserId();

  const { data, error } = await supabase
    .from("mini_sites")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data ? mapMiniSite(data) : null;
}

export async function createMyMiniSite(payload: MiniSiteInput): Promise<MiniSite> {
  if (!payload.site_name.trim()) {
    throw new Error("Le nom du mini-site est requis.");
  }

  const userId = await getAuthenticatedUserId();
  const normalizedPayload = normalizeMiniSitePayload(payload);
  await ensureSlugAvailable(normalizedPayload.slug);

  const { data, error } = await supabase
    .from("mini_sites")
    .insert({
      ...normalizedPayload,
      user_id: userId,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return mapMiniSite(data);
}

export async function updateMyMiniSite(id: string, payload: MiniSiteInput): Promise<MiniSite> {
  if (!payload.site_name.trim()) {
    throw new Error("Le nom du mini-site est requis.");
  }

  const normalizedPayload = normalizeMiniSitePayload(payload);
  await ensureSlugAvailable(normalizedPayload.slug, id);

  const { data, error } = await supabase
    .from("mini_sites")
    .update(normalizedPayload)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return mapMiniSite(data);
}

export async function publishMyMiniSite(id: string): Promise<MiniSite> {
  const { data, error } = await supabase
    .from("mini_sites")
    .update({ status: "published" })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return mapMiniSite(data);
}

export async function getMiniSiteBySlug(slug: string): Promise<MiniSite | null> {
  const normalizedSlug = validateMiniSiteSlug(slug);

  const { data, error } = await supabase
    .from("mini_sites")
    .select("*")
    .eq("slug", normalizedSlug)
    .eq("status", "published")
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data ? mapMiniSite(data) : null;
}

export async function getAdminMiniSites(): Promise<MiniSite[]> {
  const { data, error } = await supabase
    .from("mini_sites")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const miniSites = (data || []).map(mapMiniSite);
  const userIds = Array.from(new Set(miniSites.map((site) => site.user_id)));

  if (userIds.length === 0) {
    return miniSites;
  }

  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, email")
    .in("id", userIds);

  if (profilesError) {
    throw new Error(profilesError.message);
  }

  const profileMap = new Map(
    (profiles || []).map((profile) => [
      profile.id,
      {
        first_name: profile.first_name ?? null,
        last_name: profile.last_name ?? null,
        email: profile.email ?? null,
      },
    ]),
  );

  return miniSites.map((site) => ({
    ...site,
    profiles: profileMap.get(site.user_id) ?? null,
  }));
}

export async function updateAdminMiniSite(id: string, updates: AdminMiniSiteUpdate): Promise<MiniSite> {
  const normalizedUpdates = {
    ...updates,
    slug: updates.slug ? validateMiniSiteSlug(updates.slug) : undefined,
    site_name: updates.site_name?.trim(),
    slogan: updates.slogan === undefined ? undefined : normalizeText(updates.slogan),
    hero_title: updates.hero_title === undefined ? undefined : normalizeText(updates.hero_title),
    hero_subtitle: updates.hero_subtitle === undefined ? undefined : normalizeText(updates.hero_subtitle),
    about_text: updates.about_text === undefined ? undefined : normalizeText(updates.about_text),
    contact_email: updates.contact_email === undefined ? undefined : normalizeText(updates.contact_email),
    contact_phone: updates.contact_phone === undefined ? undefined : normalizeText(updates.contact_phone),
    cta_label: updates.cta_label === undefined ? undefined : normalizeText(updates.cta_label),
    cta_url: updates.cta_url === undefined ? undefined : normalizeText(updates.cta_url),
    seo_title: updates.seo_title === undefined ? undefined : normalizeText(updates.seo_title),
    seo_description: updates.seo_description === undefined ? undefined : normalizeText(updates.seo_description),
    custom_domain: updates.custom_domain === undefined ? undefined : normalizeText(updates.custom_domain),
  };

  if (normalizedUpdates.slug) {
    await ensureSlugAvailable(normalizedUpdates.slug, id);
  }

  const { data, error } = await supabase
    .from("mini_sites")
    .update(normalizedUpdates)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return mapMiniSite(data);
}

export async function uploadMiniSiteAsset(file: File, assetType: "logo" | "hero" | "gallery") {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    throw new Error("Format non supporté. Utilisez JPG, PNG, WEBP ou SVG.");
  }

  if (file.size > MAX_IMAGE_SIZE) {
    throw new Error("Le fichier dépasse 5 Mo.");
  }

  const userId = await getAuthenticatedUserId();
  const fileExtension = file.name.split(".").pop() || "png";
  const filePath = `${userId}/${assetType}/${Date.now()}-${sanitizeFileName(file.name || `image.${fileExtension}`)}`;

  return uploadFile("mini-site-media", filePath, file);
}
