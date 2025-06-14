import React, { useEffect } from 'react';
import MainLayout from '@/components/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useSession } from '@/components/SessionContextProvider';
import { useNavigate, Link } from 'react-router-dom'; // Import Link
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal } from 'lucide-react';
import { Button } from '@/components/ui/button'; // Import Button

const AdminDashboardPage: React.FC = () => {
  const { session, loading } = useSession();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading) {
      // Check if user is logged in and if they have an admin role
      const userRole = session?.user?.user_metadata?.role || 'user'; // Assuming role is in user_metadata
      // For now, we'll fetch the role from the profiles table directly in the gsheet-proxy function
      // but for client-side checks, we might need to fetch it here or store it in session context.
      // For this example, we'll allow access for now and rely on backend for security.
      // If you want to restrict access to this page, we'd need to fetch the user's role from the 'profiles' table.
      // For now, it's accessible, but actions within it will be restricted by the proxy.
      console.log("DEBUG: AdminDashboardPage - Session:", session);
    }
  }, [loading, session, navigate]);

  if (loading) {
    return (
      <MainLayout>
        <div className="container mx-auto py-6">
          <p className="text-gray-500">Chargement du tableau de bord administrateur...</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container mx-auto py-6">
        <h1 className="text-3xl font-bold mb-6">Tableau de Bord Administrateur</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-8">
          Bienvenue sur le tableau de bord administrateur. Ici, vous pouvez gérer les paramètres avancés et les données.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Gestion des Pages</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                Créez, modifiez et supprimez des pages de contenu dynamiques pour votre site.
              </p>
              <Link to="/admin/pages">
                <Button>Accéder au Créateur de Pages</Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="shadow-md">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Gestion des Utilisateurs</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 dark:text-gray-300">
                Accédez et modifiez les informations des utilisateurs, y compris leurs rôles.
              </p>
              {/* Add buttons/links for user management */}
            </CardContent>
          </Card>

          <Card className="shadow-md">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Configuration du Système</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 dark:text-gray-300">
                Ajustez les paramètres globaux de l'application.
              </p>
              {/* Add buttons/links for system configuration */}
            </CardContent>
          </Card>

          <Card className="shadow-md">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Logs et Audits</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 dark:text-gray-300">
                Consultez les journaux d'activité et les audits du système.
              </p>
              {/* Add buttons/links for logs */}
            </CardContent>
          </Card>
        </div>

        <Alert className="mt-8">
          <Terminal className="h-4 w-4" />
          <AlertTitle>Note importante</AlertTitle>
          <AlertDescription>
            Les actions sensibles sur cette page sont protégées par des fonctions Edge Supabase qui vérifient votre rôle d'administrateur.
          </AlertDescription>
        </Alert>
      </div>
    </MainLayout>
  );
};

export default AdminDashboardPage;