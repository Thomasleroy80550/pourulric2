import { useState } from "react";
import { BookOpen, Download, FileLock2, Loader2 } from "lucide-react";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useSession } from "@/components/SessionContextProvider";
import { supabase } from "@/integrations/supabase/client";
import { triggerBlobDownload } from "@/lib/download-utils";

type DocumentKind = "technical" | "guide";

const documents: Record<DocumentKind, { filename: string; success: string }> = {
  technical: { filename: "Hello-Keys-Passation-Technique.pdf", success: "Le PDF de passation technique a été téléchargé." },
  guide: { filename: "Hello-Keys-Guide-Utilisation.pdf", success: "Le guide d'utilisation a été téléchargé." },
};

async function isPdf(blob: Blob) {
  const signature = new Uint8Array(await blob.slice(0, 5).arrayBuffer());
  return String.fromCharCode(...signature) === "%PDF-";
}

export default function HandoverPdfDownload() {
  const { session } = useSession();
  const [downloading, setDownloading] = useState<DocumentKind | null>(null);
  const user = session?.user;

  if (
    user?.id !== "0d2816be-1b6f-4e13-a2d4-b7eb3d6daee5" ||
    user.email?.toLowerCase() !== "thomasleroy80550@gmail.com" ||
    !user.email_confirmed_at
  ) return null;

  const download = async (kind: DocumentKind) => {
    setDownloading(kind);
    try {
      const { data, error } = await supabase.functions.invoke("download-handover", {
        body: { document: kind },
      });
      if (error) {
        if (error instanceof FunctionsHttpError) {
          const response = await error.context.json().catch(() => null);
          throw new Error(response?.error || "Le téléchargement a été refusé.");
        }
        throw error;
      }
      if (!(data instanceof Blob) || !(await isPdf(data))) {
        throw new Error("Le serveur n'a pas retourné un PDF valide.");
      }
      triggerBlobDownload(new Blob([data], { type: "application/pdf" }), documents[kind].filename);
      toast.success(documents[kind].success);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible de télécharger le PDF.");
    } finally {
      setDownloading(null);
    }
  };

  return (
    <section className="my-4 flex flex-col gap-3 rounded-xl border border-sky-200 bg-sky-50 p-4 text-sky-950 lg:flex-row lg:items-center lg:justify-between" aria-label="Documentation de passation">
      <div className="flex items-start gap-3">
        <FileLock2 className="mt-0.5 h-5 w-5 shrink-0 text-sky-700" aria-hidden="true" />
        <div>
          <h2 className="text-sm font-semibold">Documentation de passation</h2>
          <p className="mt-1 text-xs text-sky-800">Documents confidentiels · Passation technique et guide d'utilisation · Accès personnel</p>
        </div>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button type="button" variant="outline" onClick={() => download("guide")} disabled={downloading !== null} className="shrink-0 gap-2 border-sky-300 bg-white">
          {downloading === "guide" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <BookOpen className="h-4 w-4" aria-hidden="true" />}
          {downloading === "guide" ? "Préparation…" : "Guide d'utilisation (PDF)"}
        </Button>
        <Button type="button" onClick={() => download("technical")} disabled={downloading !== null} className="shrink-0 gap-2">
          {downloading === "technical" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Download className="h-4 w-4" aria-hidden="true" />}
          {downloading === "technical" ? "Préparation…" : "Passation technique (PDF)"}
        </Button>
      </div>
    </section>
  );
}
