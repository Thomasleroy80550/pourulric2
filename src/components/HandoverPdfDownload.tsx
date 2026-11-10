import { useState } from "react";
import { Download, FileLock2, Loader2 } from "lucide-react";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useSession } from "@/components/SessionContextProvider";
import { supabase } from "@/integrations/supabase/client";
import { triggerBlobDownload } from "@/lib/download-utils";

export default function HandoverPdfDownload() {
  const { session } = useSession();
  const [downloading, setDownloading] = useState(false);
  const user = session?.user;

  if (
    user?.id !== "0d2816be-1b6f-4e13-a2d4-b7eb3d6daee5" ||
    user.email?.toLowerCase() !== "thomasleroy80550@gmail.com" ||
    !user.email_confirmed_at
  ) return null;

  const download = async () => {
    setDownloading(true);
    try {
      const { data, error } = await supabase.functions.invoke("download-handover", {
        body: {},
      });
      if (error) {
        if (error instanceof FunctionsHttpError) {
          const response = await error.context.json().catch(() => null);
          throw new Error(response?.error || "Le téléchargement a été refusé.");
        }
        throw error;
      }
      if (!(data instanceof Blob) || data.type !== "application/pdf") {
        throw new Error("Le serveur n'a pas retourné un PDF valide.");
      }
      triggerBlobDownload(data, "Hello-Keys-Passation-Technique.pdf");
      toast.success("Le PDF de passation a été téléchargé.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible de télécharger le PDF.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <section className="my-4 flex flex-col gap-3 rounded-xl border border-sky-200 bg-sky-50 p-4 text-sky-950 sm:flex-row sm:items-center sm:justify-between" aria-label="Documentation technique de passation">
      <div className="flex items-start gap-3">
        <FileLock2 className="mt-0.5 h-5 w-5 shrink-0 text-sky-700" aria-hidden="true" />
        <div>
          <h2 className="text-sm font-semibold">Documentation technique de passation</h2>
          <p className="mt-1 text-xs text-sky-800">Document confidentiel · Documentation complète et annexe · Accès personnel</p>
        </div>
      </div>
      <Button type="button" onClick={download} disabled={downloading} className="shrink-0 gap-2">
        {downloading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Download className="h-4 w-4" aria-hidden="true" />}
        {downloading ? "Préparation du PDF…" : "Télécharger le PDF"}
      </Button>
    </section>
  );
}
