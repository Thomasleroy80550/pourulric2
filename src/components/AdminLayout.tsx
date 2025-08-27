import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Home,
  Users,
  FileText,
  Wrench,
  Settings,
  LogOut,
  Shield,
  CircleUser,
  Menu,
  BedDouble,
  HelpCircle,
  GitMerge,
  Lightbulb,
  MessageSquare,
  FilePlus,
  Target,
  ArrowLeft,
  BookOpen, // For Blog Posts
  MessageSquareText, // For Review Replies
  ListChecks, // For FAQs
  ScrollText, // For Changelog
  LightbulbOff // For Ideas (using Lightbulb for ideas, so LightbulbOff for ideas management)
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useSession } from './SessionContextProvider';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import NotificationBell from './NotificationBell';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface AdminLayoutProps {
  children: React.ReactNode;
}

const adminNavItems = [
  { name: 'Dashboard', href: '/admin', icon: Home },
  { name: 'Utilisateurs', href: '/admin/users', icon: Users },
  { name: 'Logements', href: '/admin/user-rooms', icon: BedDouble },
  { name: 'Contenu', href: '/admin/pages', icon: FileText },
  { name: 'Finances', href: '/admin/invoice-generation', icon: FilePlus },
  { name: 'Support', href: '/admin/technical-reports', icon: Wrench },
  { name: 'FAQ', href: '/admin/faq', icon: ListChecks },
  { name: 'Changelog', href: '/admin/changelog', icon: ScrollText },
  { name: 'Idées', href: '/admin/ideas', icon: Lightbulb },
  { name: 'Blog', href: '/admin/blog', icon: BookOpen },
  { name: 'Réponses Avis', href: '/admin/review-replies', icon: MessageSquareText },
  { name: 'Paramètres', href: '/admin/settings', icon: Settings },
];

const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
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
    return <div className="flex items-center justify-center h-screen">Chargement...</div>;
  }

  if (profile?.role !== 'admin') {
    return null;
  }

  const NavLinks: React.FC<{ isMobile?: boolean }> = ({ isMobile = false }) => (
    <nav className={cn(
      isMobile 
        ? "grid gap-6 text-lg font-medium" 
        : "hidden md:flex md:flex-row md:items-center md:gap-5 md:text-sm lg:gap-6"
    )}>
      <Link to="/admin" className="flex items-center gap-2 text-lg font-semibold md:text-base mb-4 md:mb-0">
        <Shield className="h-6 w-6 text-sidebar-primary-foreground" />
        <span className="text-sidebar-primary-foreground">Admin Hello Keys</span>
      </Link>
      {adminNavItems.map(item => (
        <Link
          key={item.name}
          to={item.href}
          className={cn(
            "flex items-center gap-2 transition-colors hover:text-sidebar-primary-foreground",
            location.pathname === item.href || (item.href !== '/admin' && location.pathname.startsWith(item.href))
              ? "text-sidebar-primary-foreground"
              : "text-sidebar-foreground",
            isMobile && "text-lg"
          )}
        >
          <item.icon className="h-5 w-5" />
          {item.name}
        </Link>
      ))}
    </nav>
  );

  return (
    <div className="flex min-h-screen w-full flex-col bg-sidebar">
      <header className="sticky top-0 flex h-16 items-center gap-4 border-b bg-sidebar-primary px-4 md:px-6 z-50">
        {/* Desktop Navigation */}
        <div className="hidden md:flex md:flex-1 md:items-center md:gap-5 lg:gap-6">
          <NavLinks />
        </div>

        {/* Mobile Navigation */}
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="shrink-0 md:hidden">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Ouvrir le menu de navigation</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left">
            <NavLinks isMobile />
          </SheetContent>
        </Sheet>

        {/* Header Right Side */}
        <div className="flex w-full items-center justify-end gap-4 md:w-auto md:ml-auto">
          <NotificationBell />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary" size="icon" className="rounded-full">
                <CircleUser className="h-5 w-5" />
                <span className="sr-only">Ouvrir le menu utilisateur</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>
                {profile.first_name} {profile.last_name}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  <span>Retour au site</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Déconnexion</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8 overflow-auto">
        {children}
      </main>
    </div>
  );
};

export default AdminLayout;