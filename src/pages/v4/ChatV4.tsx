import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Headset, Send } from "lucide-react";
import { toast } from "sonner";
import { useSession } from "@/components/SessionContextProvider";
import { createExternalOrderTicket } from "@/lib/order-ticket-api";
import { cn } from "@/lib/utils";

interface ChatMessage {
  id: number;
  role: "user" | "team";
  text: string;
}

const ChatV4: React.FC = () => {
  const navigate = useNavigate();
  const { session, profile } = useSession();

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 0,
      role: "team",
      text: "Bonjour 👋 Une question, un souci, une demande ? Décrivez-la en un message complet : elle est transmise directement à notre équipe support.",
    },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [ticketId, setTicketId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending || ticketId) return;

    const email = profile?.email || session?.user?.email || "";
    const name =
      `${profile?.first_name ?? ""} ${profile?.last_name ?? ""}`.trim() ||
      "Propriétaire Hello Keys";

    setSending(true);
    setInput("");
    setMessages((m) => [...m, { id: Date.now(), role: "user", text }]);

    try {
      // Une conversation = un seul ticket sur l'API support
      const newSubject = text.length > 60 ? `${text.slice(0, 57)}…` : text;
      const result = await createExternalOrderTicket({
        customer_email: email,
        customer_name: name,
        subject: `[App mobile] ${newSubject}`,
        message: text,
        source_provider: "app-mobile",
        status: "open",
      });
      setTicketId(result.ticket_id);
      setMessages((m) => [
        ...m,
        {
          id: Date.now() + 1,
          role: "team",
          text: "✅ Votre demande a bien été transmise à notre équipe ! Nous vous répondons au plus vite — vous pourrez poursuivre la conversation dans « Mes messages » dès notre réponse.",
        },
      ]);
    } catch (e: any) {
      toast.error(e.message || "Impossible d'envoyer votre message.");
      setMessages((m) => m.slice(0, -1));
      setInput(text);
    } finally {
      setSending(false);
    }
  };

  const handleNewRequest = () => {
    setTicketId(null);
    setMessages([
      {
        id: Date.now(),
        role: "team",
        text: "Nouvelle demande : je vous écoute 👂 Décrivez votre question ou votre besoin en un message.",
      },
    ]);
  };

  return (
    <div className="h-screen [height:100dvh] overflow-hidden bg-[#ecf3f7]">
      <div className="mx-auto flex h-full w-full max-w-md flex-col">
        {/* Header */}
        <header className="flex shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-4 py-3">
          <button
            onClick={() => navigate(-1)}
            className="rounded-full bg-slate-50 p-2 text-slate-600"
            aria-label="Retour"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-hk-600">
            <Headset className="h-5 w-5 text-white" />
          </span>
          <div className="flex-1">
            <p className="font-semibold text-slate-900">Équipe Hello Keys</p>
            <p className="flex items-center gap-1.5 text-xs text-emerald-600">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Réponse sous 24h ouvrées
            </p>
          </div>
        </header>

        {/* Messages */}
        <main className="flex-1 space-y-3 overflow-y-auto overscroll-contain px-4 py-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                "flex",
                msg.role === "user" ? "justify-end" : "justify-start"
              )}
            >
              <div
                className={cn(
                  "max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                  msg.role === "user"
                    ? "rounded-br-md bg-hk-600 text-white"
                    : "rounded-bl-md bg-white text-slate-700 shadow-sm"
                )}
              >
                {msg.text}
              </div>
            </div>
          ))}
          {sending && (
            <div className="flex justify-start">
              <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-md bg-white px-4 py-3 shadow-sm">
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-300 [animation-delay:0ms]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-300 [animation-delay:150ms]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-300 [animation-delay:300ms]" />
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </main>

        {/* Saisie ou confirmation */}
        <footer className="shrink-0 border-t border-slate-200 bg-white px-3 pb-[calc(env(safe-area-inset-bottom)+10px)] pt-2.5">
          {ticketId ? (
            <div className="flex gap-2">
              <Link
                to="/v4/messages"
                className="flex-1 rounded-2xl bg-hk-600 py-3 text-center text-sm font-semibold text-white shadow-md"
              >
                Voir mes messages
              </Link>
              <button
                onClick={handleNewRequest}
                className="flex-1 rounded-2xl bg-slate-100 py-3 text-sm font-semibold text-slate-600"
              >
                Nouvelle demande
              </button>
            </div>
          ) : (
            <div className="flex items-end gap-2">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Décrivez votre demande en un message…"
                rows={1}
                className="max-h-28 flex-1 resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-hk-400"
              />
              <button
                onClick={handleSend}
                disabled={sending || !input.trim()}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-hk-600 text-white shadow-md transition-transform active:scale-95 disabled:opacity-40"
                aria-label="Envoyer"
              >
                <Send className="h-5 w-5" />
              </button>
            </div>
          )}
        </footer>
      </div>
    </div>
  );
};

export default ChatV4;
