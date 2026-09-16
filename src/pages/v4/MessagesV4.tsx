import React from "react";
import { useNavigate, Link } from "react-router-dom";
import { ChevronLeft, ChevronRight, MessageCircle, Phone } from "lucide-react";
import { formatDistanceToNow, parseISO, isValid } from "date-fns";
import { fr } from "date-fns/locale";
import V4Layout from "./V4Layout";
import { Skeleton } from "@/components/ui/skeleton";
import { useV4Tickets } from "./v4-data";
import { cn } from "@/lib/utils";

export function ticketStatusBadge(status: string): { label: string; className: string } {
  const s = (status || "").toLowerCase();
  if (s === "closed" || s === "resolved")
    return { label: "Résolu", className: "bg-emerald-50 text-emerald-600" };
  if (s === "pending")
    return { label: "En attente", className: "bg-amber-50 text-amber-600" };
  return { label: "En cours", className: "bg-blue-50 text-blue-600" };
}

const MessagesV4: React.FC = () => {
  const navigate = useNavigate();
  const { data: tickets, isLoading } = useV4Tickets();

  const visible = (tickets ?? []).filter((t) => !t.spam_at && !t.archived_at);

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
          <h1 className="text-2xl font-bold text-slate-900">Mes messages</h1>
        </div>

        <p className="text-sm text-slate-500">
          Vos échanges avec l'équipe Hello Keys. Réponse sous 24h ouvrées.
        </p>

        {isLoading && (
          <>
            <Skeleton className="h-20 w-full rounded-2xl" />
            <Skeleton className="h-20 w-full rounded-2xl" />
          </>
        )}

        {!isLoading && visible.length === 0 && (
          <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
            <MessageCircle className="mx-auto h-8 w-8 text-slate-300" />
            <p className="mt-2 text-sm text-slate-500">
              Aucun message pour le moment.
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Envoyez-nous un email ou appelez-nous, votre demande apparaîtra ici.
            </p>
          </div>
        )}

        <div className="space-y-2">
          {visible.map((t) => {
            const badge = ticketStatusBadge(t.status);
            return (
              <Link
                key={t.id}
                to={`/v4/messages/${t.id}`}
                className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    {t.unread_count > 0 && (
                      <span className="h-2 w-2 shrink-0 rounded-full bg-blue-600" />
                    )}
                    <p
                      className={cn(
                        "truncate text-sm text-slate-900",
                        t.unread_count > 0 ? "font-bold" : "font-semibold"
                      )}
                    >
                      {t.subject || "Sans objet"}
                    </p>
                  </div>
                  {t.preview && (
                    <p className="mt-0.5 truncate text-xs text-slate-500">
                      {t.preview}
                    </p>
                  )}
                  <div className="mt-1.5 flex items-center gap-2">
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                        badge.className
                      )}
                    >
                      {badge.label}
                    </span>
                    <span className="text-xs text-slate-400">
                      {relative(t.last_activity_at || t.created_at)}
                    </span>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" />
              </Link>
            );
          })}
        </div>

        <a
          href="tel:+33322319270"
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 py-3.5 font-semibold text-white shadow-md"
        >
          <Phone className="h-5 w-5" />
          Besoin d'aide ? Appelez-nous
        </a>
      </div>
    </V4Layout>
  );
};

function relative(iso: string | null): string {
  if (!iso) return "";
  const d = parseISO(iso);
  if (!isValid(d)) return "";
  return formatDistanceToNow(d, { addSuffix: true, locale: fr });
}

export default MessagesV4;
