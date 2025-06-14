import { supabase } from "@/integrations/supabase/client";

const PAGE_MANAGER_PROXY_URL = "https://dkjaejzwmmwwzhokpbgs.supabase.co/functions/v1/page-manager-proxy";

export interface Page {
  id: string;
  slug: string;
  title: string;
  content: string;
  is_published: boolean;
  created_at: string;
  updated_at: string;
  author_id: string;
}

interface CreatePagePayload {
  slug: string;
  title: string;
  content: string;
  is_published?: boolean;
}

interface UpdatePagePayload {
  id: string;
  slug?: string;
  title?: string;
  content?: string;
  is_published?: boolean;
}

/**
 * Calls the Supabase Edge Function proxy for page management.
 * @param action The action to perform (e.g., 'create_page', 'read_page', 'update_page', 'delete_page').
 * @param payload The data payload for the action.
 * @returns A promise that resolves to the response data from the Edge Function.
 */
async function callPageManagerProxy(action: string, payload?: any): Promise<any> {
  try {
    console.log(`Calling Page Manager proxy with action: ${action}`);

    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError) {
      console.error("Error getting Supabase session for Page Manager proxy:", sessionError);
      throw new Error("Could not retrieve Supabase session for authorization.");
    }

    if (!session) {
      console.warn("No active Supabase session found. Cannot authorize Page Manager proxy call.");
      throw new Error("User not authenticated. Please log in.");
    }

    const response = await fetch(PAGE_MANAGER_PROXY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ action, payload }),
    });

    console.log(`Response status from Page Manager proxy: ${response.status}`);
    const responseData = await response.json();
    console.log(`Raw response from Page Manager proxy:`, responseData);

    if (!response.ok) {
      console.error("Error from Page Manager proxy:", responseData.error);
      throw new Error(`Failed to perform page action: ${responseData.error || 'Unknown error'}`);
    }

    return responseData.data;

  } catch (error: any) {
    console.error("Error calling Page Manager proxy:", error.message);
    throw error;
  }
}

export const createPage = async (pageData: CreatePagePayload): Promise<Page> => {
  return callPageManagerProxy('create_page', pageData);
};

export const getPages = async (): Promise<Page[]> => {
  return callPageManagerProxy('read_page');
};

export const getPageBySlug = async (slug: string): Promise<Page | null> => {
  const result = await callPageManagerProxy('read_page', { slug });
  return result || null;
};

export const getPageById = async (id: string): Promise<Page | null> => {
  const result = await callPageManagerProxy('read_page', { id });
  return result || null;
};

export const updatePage = async (pageData: UpdatePagePayload): Promise<Page> => {
  return callPageManagerProxy('update_page', pageData);
};

export const deletePage = async (id: string): Promise<{ message: string }> => {
  return callPageManagerProxy('delete_page', { id });
};