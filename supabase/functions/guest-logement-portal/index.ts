import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PROBLEM_LABELS: Record<string, string> = {
  equipment: "Équipement en panne",
  cleanliness: "Problème de propreté",
  plumbing: "Plomberie / eau",
  heating: "Chauffage / climatisation",
  electricity: "Électricité",
  wifi: "Internet / Wi-Fi",
  access: "Accès / clés / serrure",
  noise: "Nuisance / bruit",
  other: "Autre",
};

const PRIORITY_BY_TYPE: Record<string, "low" | "medium" | "high"> = {
  plumbing: "high",
  electricity: "high",
  heating: "high",
  access: "high",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const body = await req.json().catch(() => ({}));
    const action = body.action as string | undefined;
    const roomId = body.room_id as string | undefined;

    // Action: return the public status of a report so the guest can track it.
    // This action does NOT require a room_id, so it is handled first.
    // Accepts a full UUID or the short 8-char reference shown to the guest.
    if (action === "status") {
      const ref = ((body.report_id ?? body.reference) as string | undefined)?.trim() ?? "";
      const clean = ref.replace(/-/g, "").toLowerCase();

      if (!/^[0-9a-f]{6,32}$/.test(clean)) {
        return jsonResponse({ error: "Référence invalide." }, 400);
      }

      const columns = "id, title, status, created_at, property_name, owner_response, resolved_at";
      const toUuid = (hex: string) =>
        `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;

      let report: unknown = null;

      if (clean.length === 32) {
        // Identifiant complet : correspondance exacte.
        const { data: exact, error } = await supabaseAdmin
          .from("technical_reports")
          .select(columns)
          .eq("id", toUuid(clean))
          .maybeSingle();
        if (error) {
          console.error("[guest-logement-portal] status exact error", { error: error.message });
        }
        report = exact;
      } else {
        // Référence courte : intervalle d'UUID couvrant tous les identifiants
        // commençant par ce préfixe hexadécimal.
        const low = toUuid((clean + "0".repeat(32)).slice(0, 32));
        const high = toUuid((clean + "f".repeat(32)).slice(0, 32));
        const { data: range, error } = await supabaseAdmin
          .from("technical_reports")
          .select(columns)
          .gte("id", low)
          .lte("id", high)
          .order("created_at", { ascending: false })
          .limit(1);
        if (error) {
          console.error("[guest-logement-portal] status range error", { error: error.message });
        }
        report = Array.isArray(range) ? range[0] : null;
      }

      if (!report) {
        return jsonResponse({ error: "Signalement introuvable." }, 404);
      }

      return jsonResponse({ ok: true, report });
    }

    // The remaining actions (info / report) require a valid room_id.
    if (!roomId) {
      return jsonResponse({ error: "Identifiant du logement manquant." }, 400);
    }

    // Fetch the room (bypass RLS via service role) but only expose safe fields.
    const { data: room, error: roomError } = await supabaseAdmin
      .from("user_rooms")
      .select("id, user_id, room_name, wifi_ssid, wifi_code, wifi_box_location")
      .eq("id", roomId)
      .maybeSingle();

    if (roomError) {
      console.error("[guest-logement-portal] room lookup error", { error: roomError.message });
      return jsonResponse({ error: "Impossible de récupérer le logement." }, 500);
    }

    if (!room) {
      return jsonResponse({ error: "Logement introuvable." }, 404);
    }

    // Action: return only the public-safe information about the room.
    if (action === "info") {
      return jsonResponse({
        ok: true,
        room: {
          id: room.id,
          room_name: room.room_name,
          wifi_ssid: room.wifi_ssid ?? null,
          wifi_code: room.wifi_code ?? null,
          wifi_box_location: room.wifi_box_location ?? null,
        },
      });
    }

    // Action: create an incident (technical report) for the owner.
    if (action === "report") {
      const guestName = (body.guest_name as string | undefined)?.trim() || "Voyageur";
      const problemType = (body.problem_type as string | undefined)?.trim() || "other";
      const description = (body.description as string | undefined)?.trim() || "";
      const contact = (body.contact as string | undefined)?.trim() || "";
      const phone = (body.phone as string | undefined)?.trim() || "";
      const rawMedia = Array.isArray(body.media_urls) ? (body.media_urls as unknown[]) : [];
      const mediaUrls = rawMedia
        .filter((u): u is string => typeof u === "string" && u.startsWith("http"))
        .slice(0, 5);

      if (description.length < 5) {
        return jsonResponse({ error: "Merci de décrire le problème (au moins 5 caractères)." }, 400);
      }

      if (phone.length < 5) {
        return jsonResponse({ error: "Le numéro de téléphone est obligatoire." }, 400);
      }

      const problemLabel = PROBLEM_LABELS[problemType] || PROBLEM_LABELS.other;
      const priority = PRIORITY_BY_TYPE[problemType] || "medium";

      const fullDescription = [
        description,
        "",
        "—",
        `Signalé par : ${guestName}`,
        `Téléphone : ${phone}`,
        contact ? `Contact : ${contact}` : null,
        "Source : QR code du logement (voyageur sur place)",
      ]
        .filter((line) => line !== null)
        .join("\n");

      const { data: report, error: insertError } = await supabaseAdmin
        .from("technical_reports")
        .insert({
          user_id: room.user_id,
          property_name: room.room_name,
          title: `Signalement voyageur : ${problemLabel}`,
          description: fullDescription,
          status: "pending_owner_action",
          priority,
          category: "guest_qr_report",
          media_urls: mediaUrls.length > 0 ? mediaUrls : null,
          is_archived: false,
        })
        .select("id")
        .single();

      if (insertError) {
        console.error("[guest-logement-portal] insert report error", { error: insertError.message });
        return jsonResponse({ error: "Impossible d'enregistrer le signalement." }, 500);
      }

      // Notify the owner in-app (best effort).
      const { error: notifError } = await supabaseAdmin.from("notifications").insert({
        user_id: room.user_id,
        message: `Nouveau signalement voyageur pour ${room.room_name} : ${problemLabel}`,
        link: `/reports/${report.id}`,
      });

      if (notifError) {
        console.error("[guest-logement-portal] notification error", { error: notifError.message });
      }

      return jsonResponse({ ok: true, report_id: report.id });
    }

    return jsonResponse({ error: "Action inconnue." }, 400);
  } catch (error) {
    console.error("[guest-logement-portal] unexpected error", { error: (error as Error).message });
    return jsonResponse({ error: (error as Error).message }, 500);
  }
});
