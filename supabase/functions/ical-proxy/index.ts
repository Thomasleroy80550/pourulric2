import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}

function isPrivateIpv4(hostname: string) {
  const match = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!match) {
    return false;
  }

  const [a, b] = [Number(match[1]), Number(match[2])];

  return a === 10
    || a === 127
    || a === 0
    || (a === 169 && b === 254)
    || (a === 172 && b >= 16 && b <= 31)
    || (a === 192 && b === 168);
}

function validateIcalUrl(rawUrl: string) {
  let parsedUrl: URL;

  try {
    parsedUrl = new URL(rawUrl);
  } catch {
    return { valid: false, message: 'URL iCal invalide.' };
  }

  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    return { valid: false, message: 'Le flux iCal doit utiliser http ou https.' };
  }

  const hostname = parsedUrl.hostname.toLowerCase();
  if (hostname === 'localhost' || hostname === '::1' || isPrivateIpv4(hostname)) {
    return { valid: false, message: 'Cette URL iCal n’est pas autorisée.' };
  }

  return { valid: true, parsedUrl };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.warn('[ical-proxy] missing authorization header');
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    });

    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) {
      console.error('[ical-proxy] auth error', authError);
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }

    const body = await req.json();
    const roomId = typeof body?.roomId === 'string' ? body.roomId : '';

    if (!roomId) {
      console.warn('[ical-proxy] missing roomId');
      return jsonResponse({ error: 'roomId is required' }, 400);
    }

    const { data: room, error: roomError } = await supabase
      .from('user_rooms')
      .select('id, room_name, ical_url')
      .eq('id', roomId)
      .single();

    if (roomError || !room) {
      console.error('[ical-proxy] room lookup failed', roomError);
      return jsonResponse({ error: 'Logement introuvable.' }, 404);
    }

    if (!room.ical_url) {
      console.warn('[ical-proxy] room has no ical url', { roomId });
      return jsonResponse({ error: 'Aucun flux iCal configuré pour ce logement.' }, 400);
    }

    const urlValidation = validateIcalUrl(room.ical_url);
    if (!urlValidation.valid) {
      console.warn('[ical-proxy] invalid ical url', { roomId, reason: urlValidation.message });
      return jsonResponse({ error: urlValidation.message }, 400);
    }

    const upstreamResponse = await fetch(urlValidation.parsedUrl, {
      method: 'GET',
      headers: {
        Accept: 'text/calendar,text/plain,*/*',
        'User-Agent': 'Hello Keys iCal Sync',
      },
      redirect: 'follow',
    });

    if (!upstreamResponse.ok) {
      console.error('[ical-proxy] upstream fetch failed', { roomId, status: upstreamResponse.status });
      return jsonResponse({ error: 'Impossible de télécharger le flux iCal.' }, 502);
    }

    const ics = await upstreamResponse.text();
    console.info('[ical-proxy] iCal fetched', { roomId, length: ics.length });

    return jsonResponse({
      room: {
        id: room.id,
        room_name: room.room_name,
      },
      ics,
    });
  } catch (error) {
    console.error('[ical-proxy] unexpected error', error);
    return jsonResponse({ error: 'Erreur serveur lors du chargement du flux iCal.' }, 500);
  }
});
