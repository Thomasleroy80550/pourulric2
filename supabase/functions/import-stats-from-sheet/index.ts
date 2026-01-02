import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { SignJWT, importPKCS8 } from "https://esm.sh/jose@4.14.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const log = (...args: unknown[]) => console.log("[import-stats-from-sheet]", ...args);
const logError = (...args: unknown[]) => console.error("[import-stats-from-sheet][ERROR]", ...args);

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
  const match = url.match(/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : null;
}

async function getAccessToken(): Promise<string> {
  const privateKeyRaw = Deno.env.get("GOOGLE_PRIVATE_KEY");
  const clientEmail = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_EMAIL");

  if (!privateKeyRaw || !clientEmail) {
    logError("Missing Google secrets. GOOGLE_SERVICE_ACCOUNT_EMAIL or GOOGLE_PRIVATE_KEY not set.");
    throw new Error("Google service account secrets not configured.");
  }

  const privateKey = privateKeyRaw.replace(/\\n/g, "\n");
  log("Preparing service account JWT for", clientEmail);

  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + 3600;

  const key = await importPKCS8(privateKey, "RS256");

  const jwt = await new SignJWT({
    iss: clientEmail,
    scope: "https://www.googleapis.com/auth/spreadsheets.readonly",
    aud: "https://oauth2.googleapis.com/token",
  })
    .setProtectedHeader({ alg: "RS256", typ: "JWT" })
    .setIssuedAt(iat)
    .setExpirationTime(exp)
    .sign(key);

  log("Requesting Google OAuth token…");
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
    logError("OAuth token request failed", res.status, txt);
    throw new Error(`Failed to obtain access token: ${res.status} ${txt}`);
  }

  const data = await res.json();
  log("Google OAuth token received.");
  return data.access_token as string;
}

async function listSheetTitles(spreadsheetId: string, accessToken: string): Promise<string[]> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties.title`;
  log("Listing sheet titles for spreadsheet", spreadsheetId);
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const txt = await res.text();
    logError("Failed to fetch spreadsheet info", res.status, txt);
    // Propager le statut pour traitement dans le handler
    const err = new Error(`Failed to fetch spreadsheet info: ${res.status} ${txt}`);
    // @ts-ignore
    err.status = res.status;
    throw err;
  }
  const json = await res.json();
  const titles: string[] = (json.sheets || []).map((s: any) => s.properties?.title).filter((t: string) => !!t);
  log("Found sheet titles:", titles);
  return titles;
}

function is2025Month(title: string): boolean {
  const parts = title.split(" ");
  if (parts.length < 2) return false;
  const month = parts[0];
  const year = parts[1];
  const monthIndex = MONTHS_2025.findIndex(m => m.toLowerCase() === month.toLowerCase());
  return monthIndex >= 0 && year === "2025" && monthIndex !== 11;
}

async function fetchValues(spreadsheetId: string, title: string, accessToken: string): Promise<ManualStatementEntry> {
  log("Fetching values for tab:", title);
  const ranges = [`${title}!C1`, `${title}!F1`, `${title}!Q1`, `${title}!J1`, `${title}!K1`, `${title}!L1:P1`];
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetsId}/values:batchGet?${ranges.map(r => `ranges=${encodeURIComponent(r)}`).join("&")}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    const txt = await res.text();
    logError("batchGet values failed for", title, res.status, txt);
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

  const lToPRange = data.valueRanges[5];
  let totalReservations = 0;
  const row = lToPRange?.values?.[0] ?? [];
  for (let i = 0; i < row.length; i++) {
    const n = parseFloat((row[i] ?? "0").toString().replace(",", ".").trim());
    totalReservations += isNaN(n) ? 0 : n;
  }

  const entry = {
    period: title,
    totalCA,
    totalMontantVerse,
    totalFacture,
    totalNuits,
    totalVoyageurs,
    totalReservations,
  };
  log("Fetched values for", title, entry);
  return entry;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    log("Incoming request");
    const contentType = req.headers.get("Content-Type") || "";
    if (!contentType.includes("application/json")) {
      logError("Invalid content type:", contentType);
      return new Response(JSON.stringify({ error: "Invalid content type. Expected application/json." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = await req.json() as ImportRequest;
    log("Request body:", body);

    if (!body.sheetUrl) {
      logError("Missing sheetUrl in body.");
      return new Response(JSON.stringify({ error: "sheetUrl is required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const spreadsheetId = parseSpreadsheetId(body.sheetUrl);
    log("Parsed spreadsheetId:", spreadsheetId);
    if (!spreadsheetId) {
      logError("Invalid Google Sheet URL:", body.sheetUrl);
      return new Response(JSON.stringify({ error: "Invalid Google Sheet URL" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const clientEmail = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_EMAIL") || "service-account@unknown";
    const accessToken = await getAccessToken();

    let titles: string[] = [];
    try {
      titles = await listSheetTitles(spreadsheetId, accessToken);
    } catch (err) {
      const status = (err as any).status || 500;
      const message = (err as Error).message || "Failed to fetch spreadsheet info";
      // 403 explicite avec hint
      if (status === 403 || message.includes("PERMISSION_DENIED")) {
        const hint = `Donnez l'accès en lecture au Google Sheet à ce compte: ${clientEmail} (ou publiez le fichier en lecture publique).`;
        logError("Permission denied; returning hint to client:", hint);
        return new Response(JSON.stringify({ error: message, hint, serviceAccountEmail: clientEmail }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw err;
    }

    const monthTitles2025 = titles.filter(is2025Month);
    log("Filtered 2025 titles (excl. Dec):", monthTitles2025);

    const entries: ManualStatementEntry[] = [];
    for (const title of monthTitles2025) {
      try {
        const e = await fetchValues(spreadsheetId, title, accessToken);
        entries.push(e);
      } catch (err) {
        logError("Failed fetching values for tab:", title, (err as Error).message);
      }
    }

    log("Returning entries count:", entries.length);
    return new Response(JSON.stringify({ entries }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    const message = (err as Error).message || "Unknown error";
    logError("Unhandled error:", message);
    return new Response(JSON.stringify({ error: message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});