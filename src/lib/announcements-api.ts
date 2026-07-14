import { supabase } from "@/integrations/supabase/client";

const ANNOUNCEMENTS_PROXY_URL = "https://dkjaejzwmmwwzhokpbgs.supabase.co/functions/v1/announcements-proxy";

export type AnnouncementLevel = "info" | "important" | "urgent" | "feature";

export interface Announcement {
  id: string;
  title: string;
  content: string;
  level: AnnouncementLevel;
  is_pinned: boolean;
  is_published: boolean;
  author_id: string;
  created_at: string;
  updated_at: string;
  is_read?: boolean;
}

interface CreateAnnouncementPayload {
  title: string;
  content: string;
  level?: AnnouncementLevel;
  is_pinned?: boolean;
  is_published?: boolean;
}

interface UpdateAnnouncementPayload {
  id: string;
  title?: string;
  content?: string;
  level?: AnnouncementLevel;
  is_pinned?: boolean;
  is_published?: boolean;
}

async function callAnnouncementsProxy(action: string, payload?: any): Promise<any> {
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();

  if (sessionError) {
    console.error("Error getting Supabase session for Announcements proxy:", sessionError);
    throw new Error("Could not retrieve Supabase session for authorization.");
  }

  if (!session) {
    throw new Error("User not authenticated. Please log in.");
  }

  const response = await fetch(ANNOUNCEMENTS_PROXY_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ action, payload }),
  });

  const responseData = await response.json();

  if (!response.ok) {
    console.error("Error from Announcements proxy:", responseData.error);
    throw new Error(`Failed to perform announcement action: ${responseData.error || "Unknown error"}`);
  }

  return responseData.data;
}

export const getAnnouncements = async (): Promise<Announcement[]> => {
  return callAnnouncementsProxy("read_announcements");
};

export const createAnnouncement = async (data: CreateAnnouncementPayload): Promise<Announcement> => {
  return callAnnouncementsProxy("create_announcement", data);
};

export const updateAnnouncement = async (data: UpdateAnnouncementPayload): Promise<Announcement> => {
  return callAnnouncementsProxy("update_announcement", data);
};

export const deleteAnnouncement = async (id: string): Promise<{ message: string }> => {
  return callAnnouncementsProxy("delete_announcement", { id });
};

export const markAnnouncementAsRead = async (id: string): Promise<{ message: string }> => {
  return callAnnouncementsProxy("mark_read", { id });
};

export const markAllAnnouncementsAsRead = async (): Promise<{ message: string }> => {
  return callAnnouncementsProxy("mark_all_read");
};

const GENERATE_ANNOUNCEMENT_URL = "https://dkjaejzwmmwwzhokpbgs.supabase.co/functions/v1/generate-announcement";

export const generateAnnouncement = async (
  topic: string,
  level: AnnouncementLevel,
): Promise<{ title: string; content: string }> => {
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !session) {
    throw new Error("User not authenticated. Please log in.");
  }

  const response = await fetch(GENERATE_ANNOUNCEMENT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ topic, level }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "Échec de la génération de l'annonce.");
  }
  return { title: data.title || "", content: data.content || "" };
};
