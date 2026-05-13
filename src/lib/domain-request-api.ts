import { supabase } from "@/integrations/supabase/client";

export type DomainRequestStatus = "submitted" | "in_progress" | "reserved" | "configured" | "rejected";

export interface DomainRequest {
  id: string;
  mini_site_id: string;
  user_id: string;
  requested_domain: string;
  alternative_domains: string[];
  notes: string | null;
  status: DomainRequestStatus;
  final_domain: string | null;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
  profiles?: {
    first_name: string | null;
    last_name: string | null;
    email: string | null;
  } | null;
  mini_sites?: {
    site_name: string;
    slug: string;
    status: string;
  } | null;
}

export interface CreateDomainRequestPayload {
  mini_site_id: string;
  requested_domain: string;
  alternative_domains?: string[];
  notes?: string | null;
}

export interface UpdateDomainRequestPayload {
  status?: DomainRequestStatus;
  final_domain?: string | null;
  admin_notes?: string | null;
}

function normalizeText(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function normalizeDomain(domain: string) {
  const normalized = domain.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/$/, "");

  if (!normalized) {
    throw new Error("Veuillez saisir un nom de domaine souhaité.");
  }

  if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(normalized)) {
    throw new Error("Le format du domaine semble invalide.");
  }

  return normalized;
}

function mapDomainRequest(row: any): DomainRequest {
  return {
    ...row,
    alternative_domains: Array.isArray(row.alternative_domains) ? row.alternative_domains.filter(Boolean) : [],
  } as DomainRequest;
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

export function getDomainRequestStatusLabel(status: DomainRequestStatus) {
  switch (status) {
    case "submitted":
      return "Demande envoyée";
    case "in_progress":
      return "En cours de traitement";
    case "reserved":
      return "Domaine réservé";
    case "configured":
      return "Domaine configuré";
    case "rejected":
      return "Refusé / indisponible";
    default:
      return status;
  }
}

export async function createDomainRequest(payload: CreateDomainRequestPayload): Promise<DomainRequest> {
  const userId = await getAuthenticatedUserId();

  const { data, error } = await supabase
    .from("domain_requests")
    .insert({
      mini_site_id: payload.mini_site_id,
      user_id: userId,
      requested_domain: normalizeDomain(payload.requested_domain),
      alternative_domains: (payload.alternative_domains || []).map(normalizeDomain).slice(0, 5),
      notes: normalizeText(payload.notes),
      status: "submitted",
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return mapDomainRequest(data);
}

export async function getMyDomainRequests(miniSiteId?: string): Promise<DomainRequest[]> {
  const userId = await getAuthenticatedUserId();

  let query = supabase
    .from("domain_requests")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (miniSiteId) {
    query = query.eq("mini_site_id", miniSiteId);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return (data || []).map(mapDomainRequest);
}

export async function getAdminDomainRequests(): Promise<DomainRequest[]> {
  const { data, error } = await supabase
    .from("domain_requests")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const requests = (data || []).map(mapDomainRequest);
  const userIds = Array.from(new Set(requests.map((request) => request.user_id)));
  const miniSiteIds = Array.from(new Set(requests.map((request) => request.mini_site_id)));

  const [profilesResult, miniSitesResult] = await Promise.all([
    userIds.length
      ? supabase.from("profiles").select("id, first_name, last_name, email").in("id", userIds)
      : Promise.resolve({ data: [], error: null }),
    miniSiteIds.length
      ? supabase.from("mini_sites").select("id, site_name, slug, status").in("id", miniSiteIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (profilesResult.error) {
    throw new Error(profilesResult.error.message);
  }

  if (miniSitesResult.error) {
    throw new Error(miniSitesResult.error.message);
  }

  const profileMap = new Map(
    (profilesResult.data || []).map((profile) => [
      profile.id,
      {
        first_name: profile.first_name ?? null,
        last_name: profile.last_name ?? null,
        email: profile.email ?? null,
      },
    ]),
  );

  const miniSiteMap = new Map(
    (miniSitesResult.data || []).map((site) => [
      site.id,
      {
        site_name: site.site_name,
        slug: site.slug,
        status: site.status,
      },
    ]),
  );

  return requests.map((request) => ({
    ...request,
    profiles: profileMap.get(request.user_id) ?? null,
    mini_sites: miniSiteMap.get(request.mini_site_id) ?? null,
  }));
}

export async function updateDomainRequestStatus(id: string, updates: UpdateDomainRequestPayload): Promise<DomainRequest> {
  const normalizedUpdates = {
    status: updates.status,
    final_domain: updates.final_domain === undefined ? undefined : normalizeText(updates.final_domain),
    admin_notes: updates.admin_notes === undefined ? undefined : normalizeText(updates.admin_notes),
  };

  if (normalizedUpdates.final_domain) {
    normalizedUpdates.final_domain = normalizeDomain(normalizedUpdates.final_domain);
  }

  const { data, error } = await supabase
    .from("domain_requests")
    .update(normalizedUpdates)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  if (data.final_domain) {
    const { error: miniSiteError } = await supabase
      .from("mini_sites")
      .update({ custom_domain: data.final_domain })
      .eq("id", data.mini_site_id);

    if (miniSiteError) {
      throw new Error(miniSiteError.message);
    }
  }

  return mapDomainRequest(data);
}
