import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      console.error("Authentication error:", authError?.message);
      return new Response(JSON.stringify({ error: "Unauthorized: User not authenticated." }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // Check if the user is an admin for write operations
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const isAdmin = !profileError && profile?.role === 'admin';

    const requestBody = await req.json();
    const { action, payload } = requestBody;

    let responseData: any;
    let status = 200;

    switch (action) {
      case 'create_blog_post':
        if (!isAdmin) throw new Error("Forbidden: Admin access required to create blog posts.");
        const { data: newBlogPost, error: createError } = await supabaseClient
          .from('blog_posts')
          .insert({ ...payload, author_id: user.id })
          .select()
          .single();
        if (createError) throw createError;
        responseData = newBlogPost;
        status = 201;
        break;

      case 'read_blog_post':
        const { slug, id } = payload || {};
        let query = supabaseClient.from('blog_posts').select('*');
        
        if (isAdmin) {
          // Admins can see all posts (published or not)
          if (slug) query = query.eq('slug', slug).single();
          else if (id) query = query.eq('id', id).single();
          else query = query.order('created_at', { ascending: false });
        } else {
          // Non-admins can only see published posts
          query = query.eq('is_published', true);
          if (slug) query = query.eq('slug', slug).single();
          else if (id) query = query.eq('id', id).single();
          else query = query.order('created_at', { ascending: false });
        }

        const { data: blogPosts, error: readError } = await query;
        if (readError) throw readError;
        responseData = blogPosts;
        break;

      case 'update_blog_post':
        if (!isAdmin) throw new Error("Forbidden: Admin access required to update blog posts.");
        const { id: blogPostId, ...updates } = payload;
        const { data: updatedBlogPost, error: updateError } = await supabaseClient
          .from('blog_posts')
          .update({ ...updates, updated_at: new Date().toISOString() })
          .eq('id', blogPostId)
          .select()
          .single();
        if (updateError) throw updateError;
        responseData = updatedBlogPost;
        break;

      case 'delete_blog_post':
        if (!isAdmin) throw new Error("Forbidden: Admin access required to delete blog posts.");
        const { id: deleteId } = payload;
        const { error: deleteError } = await supabaseClient
          .from('blog_posts')
          .delete()
          .eq('id', deleteId);
        if (deleteError) throw deleteError;
        responseData = { message: 'Blog post deleted successfully' };
        break;

      default:
        throw new Error(`Unsupported action: ${action}`);
    }

    return new Response(JSON.stringify({ data: responseData }), {
      status: status,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });

  } catch (error: any) {
    console.error("Error in blog-manager-proxy function:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
});