import React from 'react';
import AdminLayout from '@/components/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Users, FileText, FilePlus } from 'lucide-react';

const AdminDashboardPage: React.FC = () => {
  return (
    <AdminLayout>
      <h1 className="text-3xl font-bold mb-6">Tableau de Bord Administrateur</h1>
      <p className="text-gray-600 dark:text-gray-400 mb-8">
        Bienvenue sur le tableau de bord administrateur. Ici, vous pouvez gérer les paramètres avancés et les données.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="shadow-md">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-semibold">Gestion des Utilisateurs</CardTitle>
            <Users className="h-6 w-6 text-gray-500" />
          </CardHeader>
          <CardContent>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              Créez, consultez et modifiez les comptes utilisateurs et leurs rôles.
            </p>
            <Link to="/admin/users">
              <Button>Gérer les Utilisateurs</Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="shadow-md">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-semibold">Gestion des Pages</CardTitle>
            <FileText className="h-6 w-6 text-gray-500" />
          </CardHeader>
          <CardContent>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              Créez et modifiez des pages de contenu dynamiques pour votre site.
            </p>
            <Link to="/admin/pages">
              <Button>Accéder au Créateur de Pages</Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="shadow-md">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-semibold">Génération de Relevés</CardTitle>
            <FilePlus className="h-6 w-6 text-gray-500" />
          </CardHeader>
          <CardContent>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              Générez manuellement les relevés mensuels pour les clients.
            </p>
            <Link to="/admin/invoice-generation">
              <Button>Générer un Relevé</Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="shadow-md">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-semibold">Gestion des Relevés</CardTitle>
            <FileText className="h-6 w-6 text-gray-500" />
          </CardHeader>
          <CardContent>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              Consultez, commentez et supprimez les relevés de tous les clients.
            </p>
            <Link to="/admin/statements">
              <Button>Gérer les Relevés</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboardPage;