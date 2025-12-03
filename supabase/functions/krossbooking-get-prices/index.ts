import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

// Secrets Krossbooking (ne pas logger leurs valeurs)
const KROSSBOOKING_API_KEY = Deno.env.get('KROSSBOOKING_API_KEY')
const KROSSBOOKING_USERNAME = Deno.env.get('KROSSBOOKING_USERNAME')
const KROSSBOOKING_PASSWORD = Deno.env.get('KROSSBOOKING_PASSWORD')
const KROSSBOOKING_HOTEL_ID = Deno.env.get('KROSSBOOKING_HOTEL_ID')

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const supabaseAdmin = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const body = await req.json().catch(() => ({}))
    const {
      id_room_type,
      id_rate,
      cod_channel,
      date_from,
      date_to,
      id_property,
      with_occupancies = false,
    } = body || {}

    // LOG: paramètres d’entrée
    console.log('[krossbooking-get-prices] Input params:', {
      id_room_type,
      id_rate,
      cod_channel,
      date_from,
      date_to,
      id_property,
      with_occupancies,
    })

    // LOG: présence des secrets (ne pas afficher les valeurs)
    console.log('[krossbooking-get-prices] Secrets presence:', {
      API_KEY_present: !!KROSSBOOKING_API_KEY,
      USER_present: !!KROSSBOOKING_USERNAME,
      PASS_present: !!KROSSBOOKING_PASSWORD,
      HOTEL_ID_present: !!KROSSBOOKING_HOTEL_ID,
    })

    // Validation minimale
    if (!id_room_type || !id_rate || !cod_channel || !date_from || !date_to) {
      console.error('[krossbooking-get-prices] Missing required params')
      return new Response(JSON.stringify({ error: 'Missing required params' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Construire la requête Krossbooking
    const url = 'https://api.krossbooking.com/v5/channel/get-prices-and-availability'
    const payload = {
      id_room_type,
      id_rate,
      cod_channel,
      date_from,
      date_to,
      ...(id_property ? { id_property } : {}),
      with_occupancies: !!with_occupancies,
    }

    // LOG: URL et payload (sans secrets)
    console.log('[krossbooking-get-prices] Calling URL:', url)
    console.log('[krossbooking-get-prices] Payload:', payload)

    // Appel API Krossbooking
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Entêtes d’auth (selon vos besoins Krossbooking)
        'x-api-key': KROSSBOOKING_API_KEY || '',
      },
      body: JSON.stringify({
        ...payload,
        // Si l’API demande username/password/hotel id dans le corps (selon votre implémentation)
        username: KROSSBOOKING_USERNAME,
        password: KROSSBOOKING_PASSWORD,
        id_hotel: KROSSBOOKING_HOTEL_ID,
      }),
    })

    // LOG: statut de l’API
    console.log('[krossbooking-get-prices] HTTP status:', response.status, response.statusText)

    if (!response.ok) {
      const errText = await response.text().catch(() => '')
      console.error('[krossbooking-get-prices] API error body:', errText)
      return new Response(JSON.stringify({ error: 'Upstream error', status: response.status, body: errText }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const data = await response.json().catch(() => ({}))

    // Normalisation et LOG nombre d’items
    const items = Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : (Array.isArray(data?.days) ? data.days : []))
    console.log('[krossbooking-get-prices] Items count:', Array.isArray(items) ? items.length : 0)

    // Retour brut de l’API (le client s’occupe de l’unwrapping)
    return new Response(JSON.stringify({ data }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('[krossbooking-get-prices] Uncaught error:', err)
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})