import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  let payload: any = {};
  try {
    payload = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { token, prm, start, end, type } = payload || {};
  if (!token || !prm || !start || !end || !type) {
    return new Response(
      JSON.stringify({ error: "Missing required fields: token, prm, start, end, type" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const url = `https://conso.boris.sh/api/${encodeURIComponent(type)}?prm=${encodeURIComponent(
    prm
  )}&start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`;

  try {
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        "User-Agent": "hellokeys-app v1",
        From: "contact@hellokeys.fr",
      },
    });

    const text = await res.text();
    const contentType = res.headers.get("content-type") || "application/json";
    const baseHeaders = { ...corsHeaders, "Content-Type": contentType.includes("json") ? "application/json" : "text/plain" };

    if (!res.ok) {
      return new Response(text || `HTTP ${res.status}`, {
        status: res.status,
        headers: baseHeaders,
      });
    }

    try {
      const data = JSON.parse(text);
      return new Response(JSON.stringify(data), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch {
      // Non-JSON body fallback
      return new Response(text, { status: 200, headers: baseHeaders });
    }
  } catch (e) {
    console.error("conso-proxy error:", e);
    return new Response(JSON.stringify({ error: "Fetch to Conso API failed", details: String(e) }), {
      status: 502,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});