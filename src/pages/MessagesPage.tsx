import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

type Conversation = {
  id: string;
  subject: string;
  status: string;
  updated_at: string;
};

type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
};

const MessagesPage: React.FC = () => {
  const [userId, setUserId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [q, setQ] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id ?? null);
    });
  }, []);

  useEffect(() => {
    if (!userId) return;
    supabase
      .from('conversations')
      .select('id, subject, status, updated_at')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .then(({ data, error }) => {
        if (!error && data) {
          setConversations(data);
          if (data.length && !selectedId) setSelectedId(data[0].id);
        }
      });
  }, [userId]);

  useEffect(() => {
    if (!selectedId) return;
    supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', selectedId)
      .order('created_at', { ascending: true })
      .then(({ data }) => setMessages(data || []));
  }, [selectedId]);

  const filtered = useMemo(() => {
    const needle = q.toLowerCase().trim();
    if (!needle) return conversations;
    return conversations.filter(c => (c.subject || '').toLowerCase().includes(needle));
  }, [q, conversations]);

  return (
    <div className="container mx-auto p-4 md:p-6">
      <h1 className="text-2xl md:text-3xl font-bold mb-4">Mes messages</h1>
      <p className="text-muted-foreground mb-6">Retrouvez ici l’historique de vos échanges par email avec l’équipe Hello Keys.</p>

      <div className="grid md:grid-cols-[320px_minmax(0,1fr)] gap-4">
        <Card className="h-[70vh] flex flex-col">
          <CardHeader>
            <CardTitle>Conversations</CardTitle>
            <CardDescription>Sujets récents</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col gap-3">
            <Input placeholder="Rechercher un sujet..." value={q} onChange={(e) => setQ(e.target.value)} />
            <ScrollArea className="flex-1">
              <div className="space-y-1">
                {filtered.map(c => (
                  <button
                    key={c.id}
                    onClick={() => setSelectedId(c.id)}
                    className={cn(
                      "w-full text-left rounded-md px-3 py-2 hover:bg-muted transition",
                      selectedId === c.id ? "bg-muted" : ""
                    )}
                  >
                    <div className="font-medium line-clamp-1">{c.subject || "(sans sujet)"}</div>
                    <div className="text-xs text-muted-foreground">{new Date(c.updated_at).toLocaleString()}</div>
                  </button>
                ))}
                {filtered.length === 0 && (
                  <div className="text-sm text-muted-foreground px-2 py-4">Aucune conversation</div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <Card className="h-[70vh] flex flex-col">
          <CardHeader>
            <CardTitle>Détails</CardTitle>
            <CardDescription>Messages du fil sélectionné</CardDescription>
          </CardHeader>
          <CardContent className="flex-1">
            {selectedId ? (
              <ScrollArea className="h-full pr-3">
                <div className="space-y-4">
                  {messages.map(m => {
                    const mine = m.sender_id === userId;
                    return (
                      <div key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
                        <div className={cn(
                          "max-w-[80%] rounded-lg px-3 py-2 text-sm",
                          mine ? "bg-orange-600 text-white" : "bg-muted"
                        )}>
                          <div className="whitespace-pre-wrap break-words">{m.content}</div>
                          <div className={cn("mt-1 text-[11px]", mine ? "text-white/80" : "text-muted-foreground")}>
                            {new Date(m.created_at).toLocaleString()} • {mine ? "Vous" : "Hello Keys"}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {messages.length === 0 && (
                    <div className="text-sm text-muted-foreground">Aucun message pour ce fil.</div>
                  )}
                </div>
              </ScrollArea>
            ) : (
              <div className="text-sm text-muted-foreground">Sélectionnez une conversation pour afficher les messages.</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default MessagesPage;