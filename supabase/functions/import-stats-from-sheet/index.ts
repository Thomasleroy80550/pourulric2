import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { jwtVerify, SignJWT } from "https://esm.sh/jose@4.14.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type ImportRequest = {
  sheetUrl: string;
};

type ManualStatementEntry = {
  period: string;
  totalCA: number;
  totalMontantVerse: number;
  totalFacture: number;
  totalNuits: number;
  totalVoyageurs: number;
  totalReservations: number;
};

const MONTHS_2025 = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

function parseSpreadsheetId(url: string): string | null {
  // Common formats:
  // https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit#gid=0
  // https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/
  const match = url.match(/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : null;
}

async function getAccessToken(): Promise<string> {
  const privateKeyRaw = Deno.env.get("GOOGLE_PRIVATE_KEY");
  const clientEmail = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_EMAIL");

  if (!privateKeyRaw || !clientEmail) {
    throw new Error("Google service account secrets not configured.");
  }

  // Replace \n in env var to real newlines
  const privateKey = privateKeyRaw.replace(/\\n/g, "\n");

  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + 3600;

  const jwt = await new SignJWT({
    iss: clientEmail,
    scope: "https://www.googleapis.com/auth/spreadsheets.readonly",
    aud: "https://oauth2.googleapis.com/token",
  })
    .setProtectedHeader({ alg: "RS256", typ: "JWT" })
    .setIssuedAt(iat)
    .setExpirationTime(exp)
    .sign(await crypto.subtle.importKey(
      "pkcs8",
      new TextEncoder().encode(privateKey),
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["sign"]
    ));

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Failed to obtain access token: ${res.status} ${txt}`);
  }

  const data = await res.json();
  return data.access_token as string;
}

async function listSheetTitles(spreadsheetId: string, accessToken: string): Promise<string[]> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties.title`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Failed to fetch spreadsheet info: ${res.status} ${txt}`);
  }
  const json = await res.json();
  const titles: string[] = (json.sheets || []).map((s: any) => s.properties?.title).filter((t: string) => !!t);
  return titles;
}

function is2025Month(title: string): boolean {
  const lower = title.toLowerCase();
  // Must end with "2025" and start with a month name
  const parts = title.split(" ");
  if (parts.length < 2) return false;
  const month = parts[0];
  const year = parts[1];
  const monthIndex = MONTHS_2025.findIndex(m => m.toLowerCase() === month.toLowerCase());
  return monthIndex >= 0 && year === "2025" && monthIndex !== 11; // exclude Décembre (index 11)
}

async function fetchValues(spreadsheetId: string, title: string, accessToken: string): Promise<ManualStatementEntry> {
  // BatchGet for C1,F1,Q1,J1,K1 and L1:P1
  const ranges = [`${title}!C1`, `${title}!F1`, `${title}!Q1`, `${title}!J1`, `${title}!K1`, `${title}!L1:P1`];
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchGet?${ranges.map(r => `ranges=${encodeURIComponent(r)}`).join("&")}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Failed to batchGet values (${title}): ${res.status} ${txt}`);
  }
  const data = await res.json();

  const getNum = (idx: number): number => {
    const range = data.valueRanges[idx];
    const valStr = (range?.values?.[0]?.[0] ?? "0").toString().replace(",", ".").trim();
    const num = parseFloat(valStr);
    return isNaN(num) ? 0 : num;
  };

  const totalCA = getNum(0);
  const totalMontantVerse = getNum(1);
  const totalFacture = getNum(2);
  const totalNuits = getNum(3);
  const totalVoyageurs = getNum(4);

  // L1:P1 sum
  const lToPRange = data.valueRanges[5];
  let totalReservations = 0;
  const row = lToPRange?.values?.[0] ?? [];
  for (let i = 0; i < row.length; i++) {
    const n = parseFloat((row[i] ?? "0").toString().replace(",", ".").trim());
    totalReservations += isNaN(n) ? 0 : n;
  }

  return {
    period: title,
    totalCA,
    totalMontantVerse,
    totalFacture,
    totalNuits,
    totalVoyageurs,
    totalReservations,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const contentType = req.headers.get("Content-Type") || "";
    if (!contentType.includes("application/json")) {
      return new Response(JSON.stringify({ error: "Invalid content type" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = await req.json() as ImportRequest;
    if (!body.sheetUrl) {
      return new Response(JSON.stringify({ error: "sheetUrl is required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const spreadsheetId = parseSpreadsheetId(body.sheetUrl);
    if (!spreadsheetId) {
      return new Response(JSON.stringify({ error: "Invalid Google Sheet URL" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const accessToken = await getAccessToken();
    const titles = await listSheetTitles(spreadsheetId, accessToken);
    const monthTitles2025 = titles.filter(is2025Month);

    const entries: ManualStatementEntry[] = [];
    for (const title of monthTitles2025) {
      const e = await fetchValues(spreadsheetId, title, accessToken);
      entries.push(e);
    }

    return new Response(JSON.stringify({ entries }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});