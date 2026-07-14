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
      console.error("[announcements-proxy] Authentication error:", authError?.message);
      return new Response(JSON.stringify({ error: "Unauthorized: User not authenticated." }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const isAdmin = !profileError && profile?.role === 'admin';

    const requestBody = await req.json();
    const { action, payload } = requestBody;
    console.log(`[announcements-proxy] action=${action} isAdmin=${isAdmin}`);

    let responseData: any;
    let status = 200;

    switch (action) {
      case 'create_announcement': {
        if (!isAdmin) throw new Error("Forbidden: Admin access required to create announcements.");
        const { data: created, error: createError } = await supabaseClient
          .from('announcements')
          .insert({
            title: payload.title,
            content: payload.content,
            level: payload.level ?? 'info',
            is_pinned: payload.is_pinned ?? false,
            is_published: payload.is_published ?? false,
            link_url: payload.link_url ?? null,
            sort_order: payload.sort_order ?? 0,
            author_id: user.id,
          })
          .select()
          .single();
        if (createError) throw createError;
        responseData = created;
        status = 201;
        break;
      }

      case 'read_announcements': {
        let query = supabaseClient.from('announcements').select('*');
        if (!isAdmin) {
          query = query.eq('is_published', true);
        }
        query = query
          .order('is_pinned', { ascending: false })
          .order('sort_order', { ascending: true })
          .order('created_at', { ascending: false });

        const { data: announcements, error: readError } = await query;
        if (readError) throw readError;

        // Attach read state for the current user
        const { data: reads, error: readsError } = await supabaseClient
          .from('announcement_reads')
          .select('announcement_id')
          .eq('user_id', user.id);
        if (readsError) throw readsError;

        const readSet = new Set((reads ?? []).map((r: any) => r.announcement_id));

        // Likes: count per announcement + whether current user liked
        const announcementIds = (announcements ?? []).map((a: any) => a.id);
        const likeCounts: Record<string, number> = {};
        const likedSet = new Set<string>();
        if (announcementIds.length > 0) {
          const { data: likes, error: likesError } = await supabaseClient
            .from('announcement_likes')
            .select('announcement_id, user_id')
            .in('announcement_id', announcementIds);
          if (likesError) throw likesError;
          for (const like of likes ?? []) {
            likeCounts[like.announcement_id] = (likeCounts[like.announcement_id] || 0) + 1;
            if (like.user_id === user.id) likedSet.add(like.announcement_id);
          }
        }

        responseData = (announcements ?? []).map((a: any) => ({
          ...a,
          is_read: readSet.has(a.id),
          like_count: likeCounts[a.id] || 0,
          is_liked: likedSet.has(a.id),
        }));
        break;
      }

      case 'toggle_like': {
        const { id } = payload;
        const { data: existing, error: existingError } = await supabaseClient
          .from('announcement_likes')
          .select('announcement_id')
          .eq('announcement_id', id)
          .eq('user_id', user.id)
          .maybeSingle();
        if (existingError) throw existingError;

        if (existing) {
          const { error: delError } = await supabaseClient
            .from('announcement_likes')
            .delete()
            .eq('announcement_id', id)
            .eq('user_id', user.id);
          if (delError) throw delError;
        } else {
          const { error: insError } = await supabaseClient
            .from('announcement_likes')
            .insert({ announcement_id: id, user_id: user.id });
          if (insError) throw insError;
        }

        const { count, error: countError } = await supabaseClient
          .from('announcement_likes')
          .select('*', { count: 'exact', head: true })
          .eq('announcement_id', id);
        if (countError) throw countError;

        responseData = { is_liked: !existing, like_count: count ?? 0 };
        break;
      }

      case 'update_announcement': {
        if (!isAdmin) throw new Error("Forbidden: Admin access required to update announcements.");
        const { id, ...updates } = payload;
        const { data: updated, error: updateError } = await supabaseClient
          .from('announcements')
          .update({ ...updates, updated_at: new Date().toISOString() })
          .eq('id', id)
          .select()
          .single();
        if (updateError) throw updateError;
        responseData = updated;
        break;
      }

      case 'delete_announcement': {
        if (!isAdmin) throw new Error("Forbidden: Admin access required to delete announcements.");
        const { id } = payload;
        const { error: deleteError } = await supabaseClient
          .from('announcements')
          .delete()
          .eq('id', id);
        if (deleteError) throw deleteError;
        responseData = { message: 'Announcement deleted successfully' };
        break;
      }

      case 'mark_read': {
        const { id } = payload;
        const { error: markError } = await supabaseClient
          .from('announcement_reads')
          .upsert({ announcement_id: id, user_id: user.id, read_at: new Date().toISOString() });
        if (markError) throw markError;
        responseData = { message: 'Marked as read' };
        break;
      }

      case 'mark_all_read': {
        let listQuery = supabaseClient.from('announcements').select('id');
        if (!isAdmin) listQuery = listQuery.eq('is_published', true);
        const { data: allAnnouncements, error: listError } = await listQuery;
        if (listError) throw listError;

        const rows = (allAnnouncements ?? []).map((a: any) => ({
          announcement_id: a.id,
          user_id: user.id,
          read_at: new Date().toISOString(),
        }));
        if (rows.length > 0) {
          const { error: upsertError } = await supabaseClient
            .from('announcement_reads')
            .upsert(rows);
          if (upsertError) throw upsertError;
        }
        responseData = { message: 'All marked as read' };
        break;
      }

      default:
        throw new Error(`Unsupported action: ${action}`);
    }

    return new Response(JSON.stringify({ data: responseData }), {
      status,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });

  } catch (error: any) {
    console.error("[announcements-proxy] Error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
});
