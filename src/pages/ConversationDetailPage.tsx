import MainLayout from "@/components/MainLayout";
import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getConversationById, getMessagesForConversation, sendMessage, Message } from "@/lib/messaging-api";
import { useParams, Link } from "react-router-dom";
import { useSession } from "@/components/SessionContextProvider";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { ArrowLeft, Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

interface ConversationDetailPageProps {
  isAdmin?: boolean;
}

const ConversationDetailPage = ({ isAdmin = false }: ConversationDetailPageProps) => {
  const { id } = useParams<{ id: string }>();
  const { session } = useSession();
  const queryClient = useQueryClient();
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef<null | HTMLDivElement>(null);

  const { data: conversation, isLoading: isLoadingConvo } = useQuery({
    queryKey: ['conversation', id],
    queryFn: () => getConversationById(id!),
    enabled: !!id,
  });

  const { data: messages, isLoading: isLoadingMessages } = useQuery<Message[]>({
    queryKey: ['messages', id],
    queryFn: () => getMessagesForConversation(id!),
    enabled: !!id,
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (!id) return;

    const channel = supabase
      .channel(`messages:${id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${id}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ['messages', id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, queryClient]);

  const mutation = useMutation({
    mutationFn: () => sendMessage(id!, newMessage),
    onSuccess: () => {
      setNewMessage("");
      queryClient.invalidateQueries({ queryKey: ['messages', id] });
      queryClient.invalidateQueries({ queryKey: ['conversation', id] });
      queryClient.invalidateQueries({ queryKey: isAdmin ? ['allConversations'] : ['myConversations'] });
    },
    onError: (error) => {
      toast.error(`Erreur lors de l'envoi du message: ${error.message}`);
    },
  });

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim()) {
      mutation.mutate();
    }
  };

  const Layout = isAdmin ? AdminLayout : MainLayout;
  const backLink = isAdmin ? "/admin/messages" : "/messages";

  return (
    <Layout>
      <Link to={backLink} className="flex items-center gap-2 text-sm mb-4 hover:underline">
        <ArrowLeft className="h-4 w-4" />
        Retour à la liste
      </Link>
      <Card>
        <CardHeader>
          {isLoadingConvo ? (
            <Skeleton className="h-8 w-3/4" />
          ) : (
            <>
              <CardTitle>{conversation?.subject}</CardTitle>
              <p className="text-sm text-muted-foreground">
                Conversation avec {isAdmin ? `${conversation?.profiles?.first_name} ${conversation?.profiles?.last_name}` : 'l\'équipe Hello Keys'}
              </p>
            </>
          )}
        </CardHeader>
        <CardContent className="h-[50vh] overflow-y-auto p-4 space-y-4 bg-muted/20">
          {isLoadingMessages ? (
            <div className="space-y-4">
              <Skeleton className="h-16 w-1/2" />
              <Skeleton className="h-16 w-1/2 ml-auto" />
              <Skeleton className="h-12 w-1/3" />
            </div>
          ) : (
            messages?.map((message) => {
              const isSender = message.sender_id === session?.user.id;
              return (
                <div key={message.id} className={cn("flex", isSender ? "justify-end" : "justify-start")}>
                  <div className={cn(
                    "p-3 rounded-lg max-w-md shadow-sm",
                    isSender ? "bg-primary text-primary-foreground" : "bg-card"
                  )}>
                    <p className="font-bold text-sm">
                      {message.profiles?.first_name || (message.profiles?.role === 'admin' ? 'Admin' : 'Utilisateur')}
                    </p>
                    <p className="whitespace-pre-wrap">{message.content}</p>
                    <p className="text-xs text-right opacity-70 mt-1">
                      {format(new Date(message.created_at), "d MMM, HH:mm", { locale: fr })}
                    </p>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </CardContent>
        <CardFooter className="pt-4">
          <form onSubmit={handleSendMessage} className="w-full flex items-center gap-2">
            <Textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Écrivez votre message..."
              className="flex-1"
              disabled={mutation.isPending}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage(e);
                }
              }}
            />
            <Button type="submit" size="icon" disabled={mutation.isPending || !newMessage.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </CardFooter>
      </Card>
    </Layout>
  );
};

export default ConversationDetailPage;