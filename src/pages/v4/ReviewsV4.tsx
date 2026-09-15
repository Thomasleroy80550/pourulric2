import React from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Star, ArrowRight, Clock } from "lucide-react";
import V4Layout from "./V4Layout";
import ChannelBadge from "./ChannelBadge";
import { reviews } from "./mockData";

const ReviewsV4: React.FC = () => {
  const navigate = useNavigate();

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

        {/* Note moyenne */}
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <Star className="h-6 w-6 fill-amber-400 text-amber-400" />
            <p className="text-2xl font-bold text-slate-900">
              {reviews.average.toLocaleString("fr-FR")}/5
            </p>
            <p className="text-sm text-slate-400">{reviews.count} avis</p>
          </div>
          <button className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-blue-200 py-2.5 text-sm font-semibold text-blue-600">
            Voir sur les plateformes
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>

        {/* Liste des avis */}
        <div className="space-y-2">
          {reviews.items.map((r) => (
            <div key={r.author} className="rounded-2xl bg-white p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-500">
                  {r.author.charAt(0)}
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
                  <ChannelBadge channel={r.channel} />
                  <span className="text-sm font-bold text-slate-900">
                    {r.rating}/5
                  </span>
                </div>
              </div>
              <p className="mt-2 text-sm text-slate-600">{r.text}</p>
            </div>
          ))}
        </div>
      </div>
    </V4Layout>
  );
};

export default ReviewsV4;
