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
    console.error("[conso-proxy] Invalid JSON body");
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { token, prm, start, end, type } = payload || {};
  if (!token || !prm || !start || !end || !type) {
    console.warn("[conso-proxy] Missing fields", { type, prm, start, end });
    return new Response(
      JSON.stringify({ error: "Missing required fields: token, prm, start, end, type" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const url = `https://conso.boris.sh/api/${encodeURIComponent(type)}?prm=${encodeURIComponent(
    prm
  )}&start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`;

  try {
    console.log("[conso-proxy] Request", {
      ts: new Date().toISOString(),
      type,
      prm_masked: String(prm).replace(/^(\d{4})\d+(\d{4})$/, "$1********$2"),
      start,
      end,
      url,
    });

    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        "User-Agent": "hellokeys-app v1",
        From: "contact@hellokeys.fr",
        Accept: "application/json",
      },
    });

    const contentType = res.headers.get("content-type") || "";
    const text = await res.text();

    console.log("[conso-proxy] Response", {
      status: res.status,
      ok: res.ok,
      contentType,
      bodyPreview: text ? text.slice(0, 250) : "",
    });

    const baseHeaders = { ...corsHeaders, "Content-Type": contentType.includes("json") ? "application/json" : "text/plain" };

    if (!res.ok) {
      // Retour d'erreur structuré pour faciliter le debug côté client
      const errorPayload = {
        error: "Upstream error",
        upstream_status: res.status,
        upstream_content_type: contentType,
        url,
        body_preview: text ? text.slice(0, 500) : "",
      };
      return new Response(JSON.stringify(errorPayload), {
        status: res.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    try {
      const data = JSON.parse(text);
      return new Response(JSON.stringify(data), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch {
      // Body vide ou non-JSON: renvoyer tel quel (ex: 204 with empty body)
      return new Response(text || "", { status: 200, headers: baseHeaders });
    }
  } catch (e) {
    console.error("[conso-proxy] Fetch failed", {
      ts: new Date().toISOString(),
      type,
      prm_masked: String(prm).replace(/^(\d{4})\d+(\d{4})$/, "$1********$2"),
      start,
      end,
      error: String(e),
    });
    return new Response(
      JSON.stringify({ error: "Fetch to Conso API failed", details: String(e) }),
      {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});