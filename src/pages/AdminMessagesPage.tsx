import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { getAllConversations, Conversation } from "@/lib/messaging-api";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";

const AdminMessagesPage = () => {
  const { data: conversations, isLoading, error } = useQuery<Conversation[]>({
    queryKey: ['allConversations'],
    queryFn: getAllConversations,
  });

  return (
    <AdminLayout>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Messagerie</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Toutes les conversations</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && <p>Chargement...</p>}
          {error && <p className="text-red-500">Erreur de chargement des conversations.</p>}
          <div className="space-y-4">
            {conversations?.map((convo) => (
              <Link to={`/admin/messages/${convo.id}`} key={convo.id} className="block">
                <Card className="hover:bg-accent cursor-pointer">
                  <CardContent className="p-4 grid md:grid-cols-3 gap-4 items-center">
                    <div className="md:col-span-2">
                      <p className="font-semibold">{convo.subject}</p>
                      <p className="text-sm text-muted-foreground">
                        {convo.profiles?.first_name} {convo.profiles?.last_name} ({convo.profiles?.email})
                      </p>
                    </div>
                    <div className="text-left md:text-right">
                       <p className="text-sm text-muted-foreground">
                        Dernière MAJ: {format(new Date(convo.updated_at), "d MMM yyyy", { locale: fr })}
                      </p>
                      <Badge variant={convo.status === 'open' ? 'default' : 'secondary'} className="capitalize">
                        {convo.status === 'open' ? 'Ouvert' : 'Fermé'}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
            {!isLoading && conversations?.length === 0 && <p className="text-center text-muted-foreground py-8">Aucune conversation n'a été trouvée.</p>}
          </div>
        </CardContent>
      </Card>
    </AdminLayout>
  );
};

export default AdminMessagesPage;