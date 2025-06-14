import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { create, getNumericDate } from "https://deno.land/x/djwt@v2.8/mod.ts"; // Using djwt for JWT creation

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Function to get Google Sheets API access token using JWT
async function getGoogleAccessToken(): Promise<string> {
  const GOOGLE_SERVICE_ACCOUNT_EMAIL = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_EMAIL');
  const rawPrivateKey = Deno.env.get('GOOGLE_PRIVATE_KEY');
  
  if (!GOOGLE_SERVICE_ACCOUNT_EMAIL || !rawPrivateKey) {
    throw new Error("Missing Google Sheets API credentials in environment variables. Please ensure GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_PRIVATE_KEY are set as Supabase secrets.");
  }

  // Step 1: Replace escaped newlines with actual newlines (if Supabase stores them escaped)
  const privateKeyWithCorrectNewlines = rawPrivateKey.replace(/\\n/g, '\n');

  // Step 2 & 3: Remove headers/footers and all remaining whitespace (including actual newlines)
  const GOOGLE_PRIVATE_KEY_CLEAN = privateKeyWithCorrectNewlines
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s/g, ''); // This will remove all newlines and other whitespace

  console.log("DEBUG: GOOGLE_SERVICE_ACCOUNT_EMAIL:", GOOGLE_SERVICE_ACCOUNT_EMAIL);
  console.log("DEBUG: Cleaned GOOGLE_PRIVATE_KEY (first 50 chars):", GOOGLE_PRIVATE_KEY_CLEAN.substring(0, 50) + '...');
  console.log("DEBUG: Cleaned GOOGLE_PRIVATE_KEY length:", GOOGLE_PRIVATE_KEY_CLEAN.length);
  console.log("DEBUG: Cleaned GOOGLE_PRIVATE_KEY contains newlines (should be false):", GOOGLE_PRIVATE_KEY_CLEAN.includes('\n'));

  const header = {
    alg: "RS256",
    typ: "JWT",
  };

  const payload = {
    iss: GOOGLE_SERVICE_ACCOUNT_EMAIL,
    scope: "https://www.googleapis.com/auth/spreadsheets.readonly",
    aud: "https://oauth2.googleapis.com/token",
    exp: getNumericDate(60 * 60), // 1 hour expiration
    iat: getNumericDate(new Date()),
  };

  try {
    // Decode the Base64 string to a Uint8Array (binary DER format)
    const binaryDer = Uint8Array.from(atob(GOOGLE_PRIVATE_KEY_CLEAN), c => c.charCodeAt(0));

    // Import the private key as a CryptoKey
    const privateKey = await crypto.subtle.importKey(
      "pkcs8", // Format for PEM private keys (after stripping headers/footers)
      binaryDer, // Key data as Uint8Array
      {
        name: "RSASSA-PKCS1-v1_5", // Algorithm name for RS256
        hash: "SHA-256",
      },
      false, // Not extractable
      ["sign"] // Usage for signing
    );
    console.log("DEBUG: Private key imported successfully as CryptoKey.");

    const jwt = await create(header, payload, privateKey); // Pass the CryptoKey
    console.log("DEBUG: JWT created successfully.");

    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion: jwt,
      }).toString(),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error("Google OAuth Token API Error:", response.status, errorBody);
      throw new Error(`Failed to get Google Access Token: ${response.statusText} - ${errorBody}`);
    }

    const data = await response.json();
    if (!data.access_token) {
      throw new Error("Access token not found in Google response.");
    }
    console.log("DEBUG: Google Access Token obtained successfully.");
    return data.access_token;
  } catch (e: any) {
    console.error("DEBUG: Error during JWT creation or token fetching:", e.message);
    throw e; // Re-throw to be caught by the main serve block
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate with Supabase to get the user's session
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

    // Fetch the user's profile to get their specific Google Sheet ID and tab
    const { data: userProfile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('google_sheet_id, google_sheet_tab')
      .eq('id', user.id)
      .single();

    if (profileError || !userProfile || !userProfile.google_sheet_id) {
      console.warn(`User ${user.id} does not have a Google Sheet ID configured or profile error:`, profileError?.message);
      return new Response(JSON.stringify({ error: "Google Sheet ID not configured for this user. Please configure it in your profile." }), {
        status: 403, // Forbidden
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    const GOOGLE_SHEET_ID = userProfile.google_sheet_id;
    const GOOGLE_SHEET_TAB = userProfile.google_sheet_tab || 'COUNTER'; // Default to 'COUNTER' if not set

    const googleAccessToken = await getGoogleAccessToken();

    const requestBody = await req.json();
    const { action, ...params } = requestBody;

    let responseData: any;

    switch (action) {
      case 'read_sheet':
        // Ensure the range is always scoped to the user's configured tab
        const requestedRange = params.range && typeof params.range === 'string' ? params.range : 'A:Z';
        const finalRange = `${GOOGLE_SHEET_TAB}!${requestedRange.startsWith(GOOGLE_SHEET_TAB + '!') ? requestedRange.substring(GOOGLE_SHEET_TAB.length + 1) : requestedRange}`;
        
        console.log(`DEBUG (Edge Function): Tentative de lecture de Google Sheet ID: ${GOOGLE_SHEET_ID}, Plage: ${finalRange}`);

        const readUrl = `https://sheets.googleapis.com/v4/spreadsheets/${GOOGLE_SHEET_ID}/values/${finalRange}`;
        const readResponse = await fetch(readUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${googleAccessToken}`,
            'Content-Type': 'application/json',
          },
        });

        if (!readResponse.ok) {
          const errorBody = await readResponse.text();
          console.error("Google Sheets Read API Error:", readResponse.status, errorBody);
          throw new Error(`Failed to read sheet: ${readResponse.statusText} - ${errorBody}`);
        }
        const readData = await readResponse.json();
        console.log("DEBUG (Edge Function): Données reçues de Google Sheets API:", readData.values); // Added log
        responseData = readData.values;
        break;

      case 'write_sheet':
        // For security, writing is only allowed if the user is an "admin".
        const { data: adminProfile, error: adminProfileError } = await supabaseClient
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        if (adminProfileError || adminProfile?.role !== 'admin') {
          console.warn(`Write access denied for user ${user.id}. Role: ${adminProfile?.role}`);
          return new Response(JSON.stringify({ error: "Forbidden: Write access requires admin role." }), {
            status: 403,
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
          });
        }

        const updateRange = params.range || 'Sheet1!A1'; // Default for admin writes
        const values = params.values;
        if (!values || !Array.isArray(values)) {
          throw new Error("Invalid 'values' provided for write_sheet action.");
        }
        const writeUrl = `https://sheets.googleapis.com/v4/spreadsheets/${GOOGLE_SHEET_ID}/values/${updateRange}?valueInputOption=RAW`;
        const writeResponse = await fetch(writeUrl, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${googleAccessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ values }),
        });

        if (!writeResponse.ok) {
          const errorBody = await writeResponse.text();
          console.error("Google Sheets Write API Error:", writeResponse.status, errorBody);
          throw new Error(`Failed to write sheet: ${writeResponse.statusText} - ${errorBody}`);
        }
        responseData = await writeResponse.json();
        break;

      default:
        throw new Error(`Unsupported action: ${action}`);
    }

    return new Response(JSON.stringify({ data: responseData }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });

  } catch (error: any) {
    console.error("Error in gsheet-proxy function:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
});