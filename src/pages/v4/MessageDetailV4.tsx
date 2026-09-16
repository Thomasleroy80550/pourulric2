import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, Send } from "lucide-react";
import { format, parseISO, isValid } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import V4Layout from "./V4Layout";
import { Skeleton } from "@/components/ui/skeleton";
import { getTicketDetails, replyToTicket } from "@/lib/tickets-api";
import { ticketStatusBadge } from "./MessagesV4";
import { cn } from "@/lib/utils";

const MessageDetailV4: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const queryClient = useQueryClient();
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);

  const { data: ticket, isLoading } = useQuery({
    queryKey: ["v4-ticket", id],
    queryFn: () => getTicketDetails(id!),
    enabled: !!id,
  });

  const initialText = normalizeText(ticket?.description ?? "");
  const messages = (ticket?.conversations ?? []).filter((c) => {
    if (c.is_private || c.direction === "internal") return false;
    // Évite le doublon avec le message initial du ticket
    if (
      c.direction !== "outgoing" &&
      initialText &&
      normalizeText(messageBody(c)) === initialText
    )
      return false;
    return true;
  });

  const handleSend = async () => {
    if (!ticket || !reply.trim()) return;
    setSending(true);
    try {
      await replyToTicket(ticket.id, ticket.subject, reply.trim());
      toast.success("Votre réponse a été envoyée !");
      setReply("");
      queryClient.invalidateQueries({ queryKey: ["v4-ticket", id] });
      queryClient.invalidateQueries({ queryKey: ["v4-tickets"] });
    } catch (e: any) {
      toast.error(e.message || "Impossible d'envoyer votre réponse.");
    } finally {
      setSending(false);
    }
  };

  const badge = ticket ? ticketStatusBadge(ticket.status) : null;
  const isClosed = (ticket?.status || "").toLowerCase() === "closed";

  return (
    <V4Layout hideNav>
      <div className="flex min-h-screen flex-col space-y-4 px-4 pt-5 pb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="rounded-full bg-white p-2 text-slate-600 shadow-sm"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-bold text-slate-900">
              {ticket?.subject ?? "Message"}
            </h1>
            {badge && (
              <span
                className={cn(
                  "mt-0.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold",
                  badge.className
                )}
              >
                {badge.label}
              </span>
            )}
          </div>
        </div>

        {isLoading && (
          <>
            <Skeleton className="h-24 w-full rounded-2xl" />
            <Skeleton className="h-24 w-full rounded-2xl" />
          </>
        )}

        {!isLoading && !ticket && (
          <p className="rounded-2xl bg-white p-6 text-center text-sm text-slate-500 shadow-sm">
            Message introuvable.
          </p>
        )}

        {/* Conversation */}
        <div className="flex-1 space-y-3">
          {ticket?.description && (
            <div className="max-w-[85%] rounded-2xl rounded-tl-md bg-white p-3 shadow-sm">
              <p className="whitespace-pre-wrap text-sm text-slate-700">
                {ticket.description}
              </p>
              <p className="mt-1 text-[10px] text-slate-400">
                {formatDate(ticket.created_at)}
              </p>
            </div>
          )}
          {messages.map((m) => {
            const isMine = m.direction === "incoming";
            return (
              <div
                key={m.id}
                className={cn(
                  "max-w-[85%] rounded-2xl p-3 shadow-sm",
                  isMine
                    ? "ml-auto rounded-tr-md bg-blue-600 text-white"
                    : "rounded-tl-md bg-white text-slate-700"
                )}
              >
                {!isMine && m.author_name && (
                  <p className="mb-0.5 text-xs font-semibold text-blue-600">
                    {m.author_name}
                  </p>
                )}
                <p className="whitespace-pre-wrap text-sm">{messageBody(m)}</p>
                <p
                  className={cn(
                    "mt-1 text-[10px]",
                    isMine ? "text-blue-100" : "text-slate-400"
                  )}
                >
                  {formatDate(m.created_at)}
                </p>
              </div>
            );
          })}
        </div>

        {/* Réponse */}
        {ticket && !isClosed && (
          <div className="sticky bottom-0 flex items-end gap-2 rounded-2xl bg-white p-2 shadow-md">
            <textarea
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              placeholder="Votre réponse..."
              rows={2}
              className="flex-1 resize-none rounded-xl bg-slate-50 p-3 text-sm text-slate-900 outline-none placeholder:text-slate-400"
            />
            <button
              onClick={handleSend}
              disabled={sending || !reply.trim()}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white disabled:opacity-40"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        )}
        {ticket && isClosed && (
          <p className="rounded-2xl bg-slate-100 p-3 text-center text-xs text-slate-500">
            Cette conversation est résolue. Répondre par email la rouvrira.
          </p>
        )}
      </div>
    </V4Layout>
  );
};

function formatDate(iso: string | null): string {
  if (!iso) return "";
  const d = parseISO(iso);
  if (!isValid(d)) return "";
  return format(d, "d MMM yyyy · HH:mm", { locale: fr });
}

function messageBody(m: { body: string | null; body_html: string | null }): string {
  if (m.body?.trim()) return m.body.trim();
  // Repli : texte extrait du HTML (sans injection, on ne rend jamais le HTML)
  const el = document.createElement("div");
  el.innerHTML = m.body_html ?? "";
  return (el.textContent ?? "").trim();
}

function normalizeText(text: string): string {
  return text.replace(/\s+/g, " ").trim().toLowerCase();
}

export default MessageDetailV4;
