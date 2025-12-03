import { serve } from "https://deno.land/std@0.190.0/http/server.ts"

const KROSSBOOKING_API_BASE_URL = "https://api.krossbooking.com/v5"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function getAuthToken(): Promise<string> {
  const KROSSBOOKING_API_KEY = Deno.env.get('KROSSBOOKING_API_KEY')
  const KROSSBOOKING_HOTEL_ID = Deno.env.get('KROSSBOOKING_HOTEL_ID')
  const KROSSBOOKING_USERNAME = Deno.env.get('KROSSBOOKING_USERNAME')
  const KROSSBOOKING_PASSWORD = Deno.env.get('KROSSBOOKING_PASSWORD')

  if (!KROSSBOOKING_API_KEY || !KROSSBOOKING_HOTEL_ID || !KROSSBOOKING_USERNAME || !KROSSBOOKING_PASSWORD) {
    throw new Error("Missing Krossbooking API credentials in environment variables.")
  }

  const authPayload = {
    api_key: KROSSBOOKING_API_KEY,
    hotel_id: KROSSBOOKING_HOTEL_ID,
    username: KROSSBOOKING_USERNAME,
    password: KROSSBOOKING_PASSWORD,
  }

  const url = `${KROSSBOOKING_API_BASE_URL}/auth/get-token`
  console.log('[krossbooking-get-prices] Auth URL:', url)

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(authPayload),
  })

  if (!response.ok) {
    const errorText = await response.text().catch(() => '')
    console.error('[krossbooking-get-prices] Auth error:', response.status, errorText)
    throw new Error(`Failed to get Krossbooking token: ${response.status} - ${response.statusText}`)
  }

  const data = await response.json().catch(() => ({}))
  const token = data?.auth_token
  if (!token) {
    console.error('[krossbooking-get-prices] Auth token missing in response:', data)
    throw new Error("Krossbooking token not found in response.")
  }
  return token
}

async function callPrices(token: string, payload: any) {
  const url = `${KROSSBOOKING_API_BASE_URL}/channel/get-prices-and-availability`
  console.log('[krossbooking-get-prices] Calling URL:', url)
  console.log('[krossbooking-get-prices] Payload:', payload)

  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // Auth Bearer via get-token
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      ...payload,
      // Ajout des identifiants dans le corps, comme attendu par certaines API Krossbooking
      username: Deno.env.get('KROSSBOOKING_USERNAME'),
      password: Deno.env.get('KROSSBOOKING_PASSWORD'),
      id_hotel: Deno.env.get('KROSSBOOKING_HOTEL_ID'),
    }),
  })

  console.log('[krossbooking-get-prices] HTTP status:', resp.status, resp.statusText)

  if (!resp.ok) {
    const errText = await resp.text().catch(() => '')
    console.error('[krossbooking-get-prices] API error body:', errText)
  }

  return resp
}

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

    console.log('[krossbooking-get-prices] Input params:', {
      id_room_type, id_rate, cod_channel, date_from, date_to, id_property, with_occupancies
    })

    // Secrets presence (ne pas logger les valeurs)
    console.log('[krossbooking-get-prices] Secrets presence:', {
      API_KEY_present: !!Deno.env.get('KROSSBOOKING_API_KEY'),
      USER_present: !!Deno.env.get('KROSSBOOKING_USERNAME'),
      PASS_present: !!Deno.env.get('KROSSBOOKING_PASSWORD'),
      HOTEL_ID_present: !!Deno.env.get('KROSSBOOKING_HOTEL_ID'),
    })

    if (!id_room_type || !id_rate || !cod_channel || !date_from || !date_to) {
      return new Response(JSON.stringify({ error: 'Missing required params' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Obtenir un token
    let token = await getAuthToken()

    const payload = {
      id_room_type,
      id_rate,
      cod_channel,
      date_from,
      date_to,
      ...(id_property ? { id_property } : {}),
      with_occupancies: !!with_occupancies,
    }

    // Premier appel
    let response = await callPrices(token, payload)

    // Si 401, regénérer le token et réessayer une fois
    if (response.status === 401) {
      console.warn('[krossbooking-get-prices] 401 received, refreshing token and retrying…')
      token = await getAuthToken()
      response = await callPrices(token, payload)
    }

    if (!response.ok) {
      const errText = await response.text().catch(() => '')
      return new Response(JSON.stringify({ error: 'Upstream error', status: response.status, body: errText }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const data = await response.json().catch(() => ({}))
    // Retourner data brut, le client fait l'unwrapping
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