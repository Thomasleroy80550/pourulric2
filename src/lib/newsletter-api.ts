import { supabase } from "@/integrations/supabase/client";

export type NewsletterCampaign = {
  id: string;
  subject: string;
  html: string;
  content_hash: string;
  status: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export async function hashContent(subject: string, html: string): Promise<string> {
  const data = new TextEncoder().encode(`${subject}::${html}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  const bytes = new Uint8Array(digest);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("");
}

export async function createCampaign(subject: string, html: string, status: string = "draft"): Promise<NewsletterCampaign> {
  const content_hash = await hashContent(subject, html);
  const { data, error } = await supabase
    .from("newsletter_campaigns")
    .insert({ subject, html, content_hash, status })
    .select("*")
    .single();
  if (error) throw error;
  return data as NewsletterCampaign;
}

export async function listCampaigns(limit = 50): Promise<NewsletterCampaign[]> {
  const { data, error } = await supabase
    .from("newsletter_campaigns")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data || []) as NewsletterCampaign[];
}

export async function getDeliveryCount(content_hash: string): Promise<number> {
  const { count, error } = await supabase
    .from("newsletter_deliveries")
    .select("*", { count: "exact", head: true })
    .eq("content_hash", content_hash);
  if (error) throw error;
  return count || 0;
}

export async function duplicateCampaign(campaign: NewsletterCampaign, newSubject?: string): Promise<NewsletterCampaign> {
  const subject = newSubject && newSubject.trim().length > 0 ? newSubject : `${campaign.subject} (copie)`;
  return await createCampaign(subject, campaign.html, "draft");
}