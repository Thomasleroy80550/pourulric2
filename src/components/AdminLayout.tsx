import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, Users, FileText, FilePlus, Settings, LogOut, Shield, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSession } from './SessionContextProvider';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const adminNavigationItems = [
  { name: 'Tableau de Bord', href: '/admin', icon: Shield },
  { name: 'Utilisateurs', href: '/admin/users', icon: Users },
  { name: 'Pages', href: '/admin/pages', icon: FileText },
  { name: 'Générer Relevé', href: '/admin/invoice-generation', icon: FilePlus },
  { name: 'Relevés Sauvegardés', href: '/admin/statements', icon: FileText },
];

const AdminLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, loading } = useSession();

  React.useEffect(() => {
    if (!loading && profile?.role !== 'admin') {
      toast.error("Accès non autorisé.");
      navigate('/');
    }
  }, [profile, loading, navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Chargement de la session admin...</div>;
  }

  if (profile?.role !== 'admin') {
    return null; // Or a dedicated "Access Denied" component
  }

  return (
    <div className="flex min-h-screen bg-gray-100 dark:bg-gray-900">
      <aside className="w-64 bg-gray-800 text-white p-4 flex-col hidden md:flex">
        <div className="flex items-center mb-8">
          <Shield className="h-8 w-8 mr-2 text-yellow-400" />
          <h1 className="text-xl font-bold">Admin Hello Keys</h1>
        </div>
        <nav className="flex-grow">
          <ul>
            {adminNavigationItems.map((item) => (
              <li key={item.name} className="mb-2">
                <Link
                  to={item.href}
                  className={cn(
                    "flex items-center p-2 rounded-md hover:bg-gray-700 transition-colors",
                    location.pathname === item.href && "bg-gray-900"
                  )}
                >
                  <item.icon className="h-5 w-5 mr-3" />
                  {item.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="mt-auto">
          <Button variant="ghost" className="w-full justify-start text-left mb-2 hover:bg-gray-700 hover:text-white" asChild>
            <Link to="/">
              <ArrowLeft className="h-5 w-5 mr-3" />
              Retour au site
            </Link>
          </Button>
          <Button variant="destructive" className="w-full" onClick={handleLogout}>
            <LogOut className="h-5 w-5 mr-3" />
            Déconnexion
          </Button>
        </div>
      </aside>
      <div className="flex-1 flex flex-col">
        <header className="bg-white dark:bg-gray-800 p-4 border-b flex justify-between items-center">
          <h2 className="text-xl font-semibold">Espace Administration</h2>
          {/* You can add more header content here, like a user menu for the admin */}
        </header>
        <main className="flex-1 p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;