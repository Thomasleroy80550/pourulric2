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

    // Check if the user is an admin
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || profile?.role !== 'admin') {
      console.warn(`Access denied for user ${user.id}. Role: ${profile?.role}`);
      return new Response(JSON.stringify({ error: "Forbidden: Admin access required." }), {
        status: 403,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const requestBody = await req.json();
    const { action, payload } = requestBody;

    let responseData: any;
    let status = 200;

    switch (action) {
      case 'create_page':
        const { data: newPage, error: createError } = await supabaseClient
          .from('pages')
          .insert({ ...payload, author_id: user.id })
          .select()
          .single();
        if (createError) throw createError;
        responseData = newPage;
        status = 201;
        break;

      case 'read_page':
        const { slug, id } = payload;
        let query = supabaseClient.from('pages').select('*');
        if (slug) query = query.eq('slug', slug).single();
        else if (id) query = query.eq('id', id).single();
        else query = query.order('created_at', { ascending: false }); // Get all if no specific ID/slug

        const { data: pages, error: readError } = await query;
        if (readError) throw readError;
        responseData = pages;
        break;

      case 'update_page':
        const { id: pageId, ...updates } = payload;
        const { data: updatedPage, error: updateError } = await supabaseClient
          .from('pages')
          .update({ ...updates, updated_at: new Date().toISOString() })
          .eq('id', pageId)
          .select()
          .single();
        if (updateError) throw updateError;
        responseData = updatedPage;
        break;

      case 'delete_page':
        const { id: deleteId } = payload;
        const { error: deleteError } = await supabaseClient
          .from('pages')
          .delete()
          .eq('id', deleteId);
        if (deleteError) throw deleteError;
        responseData = { message: 'Page deleted successfully' };
        break;

      default:
        throw new Error(`Unsupported action: ${action}`);
    }

    return new Response(JSON.stringify({ data: responseData }), {
      status: status,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });

  } catch (error: any) {
    console.error("Error in page-manager-proxy function:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
});