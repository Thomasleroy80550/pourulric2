import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, Users, FileText, FilePlus, Settings, LogOut, Shield, ArrowLeft, Wrench, Target, CircleUser, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useSession } from './SessionContextProvider';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import NotificationBell from './NotificationBell';
import { Menu } from 'lucide-react';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';

const adminNavigationItems = [
  { name: 'Tableau de Bord', href: '/admin', icon: Shield },
  { name: 'Utilisateurs', href: '/admin/users', icon: Users },
  { name: 'Logements Utilisateurs', href: '/admin/user-rooms', icon: Home },
  { name: 'Stratégies', href: '/admin/strategies', icon: Target },
  { name: 'Pages', href: '/admin/pages', icon: FileText },
  { name: 'Blog', href: '/admin/blog', icon: FileText },
  { name: 'Rapports Tech.', href: '/admin/technical-reports', icon: Wrench },
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
        <header className="flex h-14 items-center gap-4 border-b bg-muted/40 px-4 lg:h-[60px] lg:px-6">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="shrink-0 md:hidden">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle navigation menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="flex flex-col">
              <nav className="grid gap-2 text-lg font-medium">
                <Link
                  to="#"
                  className="flex items-center gap-2 text-lg font-semibold"
                >
                  <img src="/logo.png" alt="Logo" className="h-6 w-auto" />
                  <span className="">Hello Keys</span>
                </Link>
                <Link
                  to="/admin/dashboard"
                  className="flex items-center gap-2"
                >
                  <Shield className="h-5 w-5" />
                  <span className="text-sm">Tableau de Bord</span>
                </Link>
                <Link
                  to="/admin/users"
                  className="flex items-center gap-2"
                >
                  <Users className="h-5 w-5" />
                  <span className="text-sm">Utilisateurs</span>
                </Link>
                <Link
                  to="/admin/user-rooms"
                  className="flex items-center gap-2"
                >
                  <Home className="h-5 w-5" />
                  <span className="text-sm">Logements Utilisateurs</span>
                </Link>
                <Link
                  to="/admin/strategies"
                  className="flex items-center gap-2"
                >
                  <Target className="h-5 w-5" />
                  <span className="text-sm">Stratégies</span>
                </Link>
                <Link
                  to="/admin/pages"
                  className="flex items-center gap-2"
                >
                  <FileText className="h-5 w-5" />
                  <span className="text-sm">Pages</span>
                </Link>
                <Link
                  to="/admin/blog"
                  className="flex items-center gap-2"
                >
                  <FileText className="h-5 w-5" />
                  <span className="text-sm">Blog</span>
                </Link>
                <Link
                  to="/admin/technical-reports"
                  className="flex items-center gap-2"
                >
                  <Wrench className="h-5 w-5" />
                  <span className="text-sm">Rapports Tech.</span>
                </Link>
                <Link
                  to="/admin/invoice-generation"
                  className="flex items-center gap-2"
                >
                  <FilePlus className="h-5 w-5" />
                  <span className="text-sm">Générer Relevé</span>
                </Link>
                <Link
                  to="/admin/statements"
                  className="flex items-center gap-2"
                >
                  <FileText className="h-5 w-5" />
                  <span className="text-sm">Relevés Sauvegardés</span>
                </Link>
              </nav>
            </SheetContent>
          </Sheet>
          <div className="w-full flex-1">
            {/* Breadcrumb can be dynamically generated here */}
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="secondary" size="icon" className="rounded-full">
                  <CircleUser className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>
                  <User className="h-4 w-4 mr-2" />
                  {profile?.name}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Déconnexion
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <main className="flex-1 p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;