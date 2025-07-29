import { supabase } from "@/integrations/supabase/client";

const BLOG_MANAGER_PROXY_URL = "https://dkjaejzwmmwwzhokpbgs.supabase.co/functions/v1/blog-manager-proxy";

export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  content: string;
  is_published: boolean;
  created_at: string;
  updated_at: string;
  author_id: string;
}

interface CreateBlogPostPayload {
  slug: string;
  title: string;
  content: string;
  is_published?: boolean;
}

interface UpdateBlogPostPayload {
  id: string;
  slug?: string;
  title?: string;
  content?: string;
  is_published?: boolean;
}

/**
 * Calls the Supabase Edge Function proxy for blog post management.
 * @param action The action to perform (e.g., 'create_blog_post', 'read_blog_post', 'update_blog_post', 'delete_blog_post').
 * @param payload The data payload for the action.
 * @returns A promise that resolves to the response data from the Edge Function.
 */
async function callBlogManagerProxy(action: string, payload?: any): Promise<any> {
  try {
    console.log(`Calling Blog Manager proxy with action: ${action}`);

    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError) {
      console.error("Error getting Supabase session for Blog Manager proxy:", sessionError);
      throw new Error("Could not retrieve Supabase session for authorization.");
    }

    if (!session) {
      console.warn("No active Supabase session found. Cannot authorize Blog Manager proxy call.");
      throw new Error("User not authenticated. Please log in.");
    }

    const response = await fetch(BLOG_MANAGER_PROXY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ action, payload }),
    });

    console.log(`Response status from Blog Manager proxy: ${response.status}`);
    const responseData = await response.json();
    console.log(`Raw response from Blog Manager proxy:`, responseData);

    if (!response.ok) {
      console.error("Error from Blog Manager proxy:", responseData.error);
      throw new Error(`Failed to perform blog action: ${responseData.error || 'Unknown error'}`);
    }

    return responseData.data;

  } catch (error: any) {
    console.error("Error calling Blog Manager proxy:", error.message);
    throw error;
  }
}

export const createBlogPost = async (blogPostData: CreateBlogPostPayload): Promise<BlogPost> => {
  return callBlogManagerProxy('create_blog_post', blogPostData);
};

export const getBlogPosts = async (): Promise<BlogPost[]> => {
  return callBlogManagerProxy('read_blog_post');
};

export const getBlogPostBySlug = async (slug: string): Promise<BlogPost | null> => {
  const result = await callBlogManagerProxy('read_blog_post', { slug });
  return result || null;
};

export const getBlogPostById = async (id: string): Promise<BlogPost | null> => {
  const result = await callBlogManagerProxy('read_blog_post', { id });
  return result || null;
};

export const updateBlogPost = async (blogPostData: UpdateBlogPostPayload): Promise<BlogPost> => {
  return callBlogManagerProxy('update_blog_post', blogPostData);
};

export const deleteBlogPost = async (id: string): Promise<{ message: string }> => {
  return callBlogManagerProxy('delete_blog_post', { id });
};