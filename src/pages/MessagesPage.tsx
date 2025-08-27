import MainLayout from "@/components/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { getMyConversations, Conversation } from "@/lib/messaging-api";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import NewConversationDialog from "@/components/messaging/NewConversationDialog";
import { useState } from "react";
import { Plus } from "lucide-react";

const MessagesPage = () => {
  const [isNewConversationOpen, setIsNewConversationOpen] = useState(false);
  const { data: conversations, isLoading, error } = useQuery<Conversation[]>({
    queryKey: ['myConversations'],
    queryFn: getMyConversations,
  });

  return (
    <MainLayout>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Mes Messages</h1>
        <Button onClick={() => setIsNewConversationOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Nouveau Message
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Mes conversations</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && <p>Chargement...</p>}
          {error && <p className="text-red-500">Erreur de chargement des conversations.</p>}
          <div className="space-y-4">
            {conversations?.map((convo) => (
              <Link to={`/messages/${convo.id}`} key={convo.id} className="block">
                <Card className="hover:bg-accent cursor-pointer">
                  <CardContent className="p-4 grid grid-cols-3 items-center">
                    <p className="font-semibold col-span-2">{convo.subject}</p>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(convo.updated_at), "d MMM yyyy 'à' HH:mm", { locale: fr })}
                      </p>
                      <p className="text-sm text-muted-foreground capitalize">
                        {convo.status === 'open' ? 'Ouvert' : 'Fermé'}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
            {!isLoading && conversations?.length === 0 && <p className="text-center text-muted-foreground py-8">Vous n'avez aucune conversation.</p>}
          </div>
        </CardContent>
      </Card>
      <NewConversationDialog isOpen={isNewConversationOpen} onOpenChange={setIsNewConversationOpen} />
    </MainLayout>
  );
};

export default MessagesPage;