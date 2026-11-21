import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Loader2, MessageSquareQuote, RefreshCw, Star } from "lucide-react";
import { toast } from "sonner";
import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface KeynoteFeedback {
  id: string;
  rating: number;
  message: string;
  name: string | null;
  email: string | null;
  created_at: string;
}

function Stars({ value, className }: { value: number; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-0.5", className)} aria-label={`${value} étoile${value > 1 ? "s" : ""} sur 5`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={cn("h-4 w-4", star <= value ? "fill-amber-400 text-amber-400" : "text-neutral-300")}
        />
      ))}
    </span>
  );
}

export default function AdminKeynoteFeedbackPage() {
  const [feedback, setFeedback] = useState<KeynoteFeedback[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFeedback = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("keynote_feedback")
      .select("id, rating, message, name, email, created_at")
      .order("created_at", { ascending: false });
    if (error) {
      toast.error(`Erreur lors du chargement des avis : ${error.message}`);
    } else {
      setFeedback(data ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void fetchFeedback();
  }, [fetchFeedback]);

  const average = feedback.length
    ? Math.round((feedback.reduce((sum, item) => sum + item.rating, 0) / feedback.length) * 10) / 10
    : 0;

  return (
    <AdminLayout>
      <div className="mx-auto w-full max-w-4xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
              <MessageSquareQuote className="h-6 w-6 text-hk-600" />
              Avis sur la keynote
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Retours des propriétaires envoyés depuis la présentation Cadence.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => void fetchFeedback()} disabled={loading}>
            <RefreshCw className={cn("mr-2 h-4 w-4", loading && "animate-spin")} />
            Actualiser
          </Button>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Avis reçus</p>
              <p className="mt-1 text-3xl font-bold">{feedback.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Note moyenne</p>
              <p className="mt-1 flex items-baseline gap-2 text-3xl font-bold">
                {feedback.length ? average.toLocaleString("fr-FR") : "—"}
                {feedback.length > 0 && <Stars value={Math.round(average)} className="align-middle" />}
              </p>
            </CardContent>
          </Card>
          <Card className="col-span-2 sm:col-span-1">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Dernier avis</p>
              <p className="mt-1 text-lg font-semibold">
                {feedback.length
                  ? format(new Date(feedback[0].created_at), "d MMM yyyy 'à' HH'h'mm", { locale: fr })
                  : "—"}
              </p>
            </CardContent>
          </Card>
        </div>

        {loading && feedback.length === 0 ? (
          <div className="mt-10 flex items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            Chargement des avis…
          </div>
        ) : feedback.length === 0 ? (
          <Card className="mt-6">
            <CardContent className="p-10 text-center text-muted-foreground">
              Aucun avis pour le moment. Partagez le lien <span className="font-mono text-hk-700">/keynote</span> pour recueillir les premiers retours.
            </CardContent>
          </Card>
        ) : (
          <ul className="mt-6 space-y-3">
            {feedback.map((item) => (
              <li key={item.id}>
                <Card>
                  <CardContent className="p-4 sm:p-5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <Stars value={item.rating} />
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(item.created_at), "d MMMM yyyy 'à' HH'h'mm", { locale: fr })}
                      </span>
                    </div>
                    <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-neutral-800">
                      {item.message}
                    </p>
                    <p className="mt-3 text-xs text-muted-foreground">
                      {item.name || "Anonyme"}
                      {item.email && (
                        <>
                          {" · "}
                          <a href={`mailto:${item.email}`} className="font-medium text-hk-700 hover:underline">
                            {item.email}
                          </a>
                        </>
                      )}
                    </p>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </div>
    </AdminLayout>
  );
}
