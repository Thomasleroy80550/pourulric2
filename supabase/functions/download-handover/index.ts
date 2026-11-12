import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";
import { jsPDF } from "npm:jspdf@3.0.1";
import { handoverDocuments } from "./document.ts";
import { guideDocuments } from "./guide.ts";
import { referenceDocuments } from "./reference.ts";

const authorizedUserId = "0d2816be-1b6f-4e13-a2d4-b7eb3d6daee5";
const authorizedEmail = "thomasleroy80550@gmail.com";
const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Expose-Headers": "Content-Disposition",
  "Cache-Control": "private, no-store, max-age=0",
  "X-Content-Type-Options": "nosniff",
};

type DocumentKind = "technical" | "guide" | "reference";

interface PdfDefinition {
  filename: string;
  header: string;
  title: string;
  subtitle: string;
  intro: string[];
  documents: { title: string; markdown: string }[];
}

const pdfDefinitions: Record<DocumentKind, PdfDefinition> = {
  technical: {
    filename: "Hello-Keys-Passation-Technique.pdf",
    header: "Hello Keys - Passation technique - Confidentiel",
    title: "Passation technique",
    subtitle: "Documentation complète et inventaire du projet",
    intro: [
      "Architecture, données, intégrations, exploitation et points de vigilance.",
      "Ce PDF contient la documentation technique puis son annexe d'inventaire. Il décrit le projet inspecté ; les éléments à confirmer sont indiqués dans le document.",
    ],
    documents: handoverDocuments,
  },
  guide: {
    filename: "Hello-Keys-Guide-Utilisation.pdf",
    header: "Hello Keys - Guide d'utilisation - Confidentiel",
    title: "Guide d'utilisation",
    subtitle: "Espace propriétaire, version mobile et administration",
    intro: [
      "Prise en main de la plateforme écran par écran : connexion, profil, menus propriétaire, espace d'administration, procédures de l'équipe Hello Keys et précautions.",
      "Les libellés cités sont ceux affichés dans l'application au moment de la rédaction.",
    ],
    documents: guideDocuments,
  },
  reference: {
    filename: "Hello-Keys-Reference-Ingenierie.pdf",
    header: "Hello Keys - Référence d'ingénierie - Confidentiel",
    title: "Référence d'ingénierie",
    subtitle: "Architecture interne, code source, schémas SQL et invariants",
    intro: [
      "Document de niveau code destiné à un ingénieur logiciel senior : métriques du dépôt, chaîne de build, machine d'états de session, pipeline KrossBooking, formules des relevés, DDL et politiques RLS, fonctions PL/pgSQL, fonctions Edge, jobs cron, matrice de sécurité, invariants, dette technique et runbook.",
      "Chaque extrait de code et chaque définition SQL a été relevé dans le dépôt ou dans le catalogue PostgreSQL du projet. Les valeurs des secrets ne figurent jamais dans ce document.",
    ],
    documents: referenceDocuments,
  },
};

const cachedPdfs: Partial<Record<DocumentKind, ArrayBuffer>> = {};

function readableText(value: string, code = false): string {
  // Dans un bloc de code, `*` et les accents graves font partie du code (SELECT *, a * b, template literals).
  const text = code ? value : value.replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1 ($2)").replace(/[*`]/g, "");
  return text
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[—–]/g, "-")
    .replace(/→/g, " -> ")
    .replace(/−/g, "-")
    .replace(/×/g, " x ")
    .replace(/…/g, "...")
    .replace(/€/g, " EUR")
    .replace(/⋯/g, "...")
    .replace(/[^\x20-\x7E\u00A0-\u00FF\n\t]/g, "");
}

function buildPdf(definition: PdfDefinition): ArrayBuffer {
  const pdf = new jsPDF({ unit: "mm", format: "a4", compress: true });
  const margin = 18;
  const width = 174;
  let y = 24;
  const newPage = () => {
    pdf.addPage();
    y = 24;
  };
  const write = (text: string, size = 10, bold = false, mono = false) => {
    pdf.setFont(mono ? "courier" : "helvetica", bold ? "bold" : "normal");
    pdf.setFontSize(size);
    pdf.setTextColor(35, 45, 55);
    // Espaces insécables en tête de ligne : splitTextToSize ne les replie pas, l'indentation du code est conservée.
    const content = mono ? readableText(text, true).replace(/^ +/, (s) => "\u00A0".repeat(s.length)) : readableText(text);
    const lines = pdf.splitTextToSize(content, width) as string[];
    const lineHeight = size * 0.45;
    for (const line of lines) {
      if (y + lineHeight > 276) newPage();
      pdf.text(line, margin, y);
      y += lineHeight;
    }
    y += 1.6;
  };

  pdf.setProperties({
    title: `Hello Keys - ${definition.title}`,
    author: "Hello Keys",
    subject: definition.subtitle,
  });
  write("HELLO KEYS", 24, true);
  y += 6;
  write(definition.title, 20, true);
  write(definition.subtitle, 13);
  y += 10;
  write("DOCUMENT INTERNE CONFIDENTIEL", 11, true);
  write(`Téléchargement réservé à ${authorizedEmail}`, 10);
  for (const paragraph of definition.intro) write(paragraph);

  for (const document of definition.documents) {
    newPage();
    write(document.title, 18, true);
    y += 3;
    let code = false;
    for (const rawLine of document.markdown.split("\n")) {
      const line = rawLine.trimEnd();
      if (line.startsWith("```")) {
        code = !code;
        y += 2;
        continue;
      }
      if (!line.trim()) {
        y += 2;
        continue;
      }
      if (code) {
        // Bloc de code : aucune interprétation Markdown (les schémas ASCII commencent souvent par "|" ou "---").
        write(line, 8, false, true);
        continue;
      }
      if (/^\|[\s:|\-]+\|$/.test(line) || /^---+$/.test(line)) continue;
      const heading = /^(#{1,4})\s+(.+)$/.exec(line);
      if (heading) {
        if (y > 253) newPage();
        y += 3;
        write(heading[2], heading[1].length <= 2 ? 14 : 11, true);
      } else if (line.startsWith("|")) {
        write(line.replace(/^\|\s*|\s*\|$/g, ""), 8);
      } else {
        write(line.replace(/^>\s?/, "").replace(/^- \[[ x]\]\s*/, "- "));
      }
    }
  }
  const pageCount = pdf.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    pdf.setPage(page);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.setTextColor(105, 115, 125);
    pdf.text(definition.header, margin, 12);
    pdf.text(`${authorizedEmail} | ${page} / ${pageCount}`, margin, 287);
  }
  return pdf.output("arraybuffer");
}

function errorResponse(status: number, error: string) {
  return new Response(JSON.stringify({ error }), {
    status,
    headers: { ...headers, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers });
  if (req.method !== "POST") return errorResponse(405, "Méthode non autorisée.");
  const authorization = req.headers.get("Authorization") ?? "";
  const match = /^Bearer\s+(\S+)$/i.exec(authorization);
  if (!match) return errorResponse(401, "Connexion requise.");

  try {
    const authClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    // Auth vérifie le JWT et renvoie l'identité actuelle ; ne jamais utiliser le profil éditable pour autoriser cet accès.
    const { data: { user }, error } = await authClient.auth.getUser(match[1]);
    if (error || !user) return errorResponse(401, "Session invalide ou expirée.");
    if (
      user.id !== authorizedUserId ||
      user.email?.toLowerCase() !== authorizedEmail ||
      !user.email_confirmed_at
    ) {
      console.warn("[download-handover] Access denied", { userId: user.id });
      return errorResponse(403, "Vous n'êtes pas autorisé à télécharger ce document.");
    }

    const body = await req.json().catch(() => ({}));
    const kind: DocumentKind = body?.document === "guide" || body?.document === "reference" ? body.document : "technical";
    const definition = pdfDefinitions[kind];
    if (!cachedPdfs[kind]) cachedPdfs[kind] = buildPdf(definition);
    console.info("[download-handover] Authorized PDF download", { userId: user.id, document: kind });
    // application/octet-stream : seul type binaire converti en Blob par supabase.functions.invoke().
    return new Response(cachedPdfs[kind]!.slice(0), {
      headers: {
        ...headers,
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="${definition.filename}"`,
      },
    });
  } catch (error) {
    console.error("[download-handover] PDF download failed", {
      message: error instanceof Error ? error.message : "Unknown error",
    });
    return errorResponse(500, "Le PDF n'a pas pu être généré. Réessayez dans quelques instants.");
  }
});
