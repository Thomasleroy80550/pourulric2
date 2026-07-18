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

    if (!roomId) {
      return jsonResponse({ error: "Identifiant du logement manquant." }, 400);
    }

    // Fetch the room (bypass RLS via service role) but only expose safe fields.
    const { data: room, error: roomError } = await supabaseAdmin
      .from("user_rooms")
      .select("id, user_id, room_name")
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
      return jsonResponse({ ok: true, room: { id: room.id, room_name: room.room_name } });
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
