import React from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Star, Clock } from "lucide-react";
import V4Layout from "./V4Layout";
import ChannelBadge from "./ChannelBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { useV4Reviews, V4Channel } from "./v4-data";

function channelFromSource(source: string): V4Channel {
  const raw = (source || "").toUpperCase();
  if (raw.includes("AIRBNB")) return "airbnb";
  if (raw.includes("BOOKING")) return "booking";
  return "other";
}

const ReviewsV4: React.FC = () => {
  const navigate = useNavigate();
  const { data: reviews, isLoading } = useV4Reviews();

  const rated = (reviews ?? []).filter((r) => r.rating > 0);
  const average =
    rated.length > 0
      ? Math.round((rated.reduce((a, r) => a + r.rating, 0) / rated.length) * 10) / 10
      : 0;

  return (
    <V4Layout hideNav>
      <div className="space-y-4 px-4 pt-5 pb-8">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="rounded-full bg-white p-2 text-slate-600 shadow-sm"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h1 className="text-2xl font-bold text-slate-900">Mes avis</h1>
        </div>

        {isLoading && (
          <>
            <Skeleton className="h-24 w-full rounded-2xl" />
            <Skeleton className="h-24 w-full rounded-2xl" />
          </>
        )}

        {!isLoading && (reviews ?? []).length === 0 && (
          <p className="rounded-2xl bg-white p-6 text-center text-sm text-slate-500 shadow-sm">
            Aucun avis pour le moment.
          </p>
        )}

        {!isLoading && (reviews ?? []).length > 0 && (
          <>
            {/* Note moyenne */}
            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2">
                <Star className="h-6 w-6 fill-amber-400 text-amber-400" />
                <p className="text-2xl font-bold text-slate-900">
                  {average.toLocaleString("fr-FR")}/5
                </p>
                <p className="text-sm text-slate-400">
                  {(reviews ?? []).length} avis
                </p>
              </div>
            </div>

            {/* Liste des avis */}
            <div className="space-y-2">
              {(reviews ?? []).slice(0, 50).map((r) => (
                <div key={r.id} className="rounded-2xl bg-white p-4 shadow-sm">
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-500">
                      {(r.author || "C").charAt(0)}
                    </span>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-slate-900">
                        {r.author}
                      </p>
                      <p className="flex items-center gap-1 text-xs text-slate-400">
                        <Clock className="h-3 w-3" />
                        {r.date}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <ChannelBadge channel={channelFromSource(r.source)} />
                      <span className="text-sm font-bold text-slate-900">
                        {r.rating.toLocaleString("fr-FR")}/5
                      </span>
                    </div>
                  </div>
                  {r.comment && (
                    <p className="mt-2 text-sm text-slate-600">{r.comment}</p>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </V4Layout>
  );
};

export default ReviewsV4;
