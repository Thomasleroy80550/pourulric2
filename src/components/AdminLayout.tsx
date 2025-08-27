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
  BookOpen,
  MessageSquareText,
  ListChecks,
  ScrollText,
  LayoutDashboard, // Icon for general management
  MessageSquareMore, // Icon for general communication
  MessagesSquare,
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
  { name: 'Tableau de bord', href: '/admin', icon: Home },
  {
    name: 'Gestion',
    icon: LayoutDashboard,
    subItems: [
      { name: 'Utilisateurs', href: '/admin/users', icon: Users },
      { name: 'Logements', href: '/admin/user-rooms', icon: BedDouble },
      { name: 'Facturation', href: '/admin/invoice-generation', icon: FilePlus },
      { name: 'Relevés', href: '/admin/statements', icon: FileText },
      { name: 'Rapports Techniques', href: '/admin/technical-reports', icon: Wrench },
    ],
  },
  {
    name: 'Contenu',
    icon: BookOpen,
    subItems: [
      { name: 'Pages', href: '/admin/pages', icon: FileText },
      { name: 'Blog', href: '/admin/blog', icon: BookOpen },
      { name: 'FAQ', href: '/admin/faq', icon: ListChecks },
      { name: 'Changelog', href: '/admin/changelog', icon: ScrollText },
    ],
  },
  {
    name: 'Communication',
    icon: MessageSquareMore,
    subItems: [
      { name: 'Messagerie', href: '/admin/messages', icon: MessagesSquare },
      { name: 'Réponses Avis', href: '/admin/review-replies', icon: MessageSquareText },
      { name: 'Idées', href: '/admin/ideas', icon: Lightbulb },
    ],
  },
  {
    name: 'Paramètres',
    icon: Settings,
    subItems: [
      { name: 'Général', href: '/admin/settings', icon: Settings },
      { name: 'Stratégies', href: '/admin/strategies', icon: Target },
    ],
  },
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
        <Shield className="h-6 w-6 text-admin-panel-primary-foreground" />
        <span className="text-admin-panel-primary-foreground">Admin Hello Keys</span>
      </Link>
      {adminNavItems.map(item => (
        item.subItems ? (
          <DropdownMenu key={item.name}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                asChild={true} // Explicitly set asChild
                className={cn(
                  "flex items-center gap-2 transition-colors hover:bg-transparent",
                  item.subItems.some(subItem => location.pathname.startsWith(subItem.href))
                    ? "text-admin-panel-primary-foreground"
                    : "text-admin-panel-foreground",
                  isMobile && "text-lg w-full justify-start"
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.name}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56">
              {item.subItems.map(subItem => (
                <DropdownMenuItem key={subItem.name} asChild className="data-[highlighted]:bg-transparent">
                  <Link to={subItem.href} className={cn(
                    "flex items-center",
                    location.pathname.startsWith(subItem.href)
                      ? "bg-admin-panel-accent text-admin-panel-accent-foreground"
                      : ""
                  )}>
                    <span className="flex items-center gap-2">
                      <subItem.icon className="mr-2 h-4 w-4" />
                      <span>{subItem.name}</span>
                    </span>
                  </Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Link
            key={item.name}
            to={item.href}
            className={cn(
              "flex items-center gap-2 transition-colors hover:bg-transparent",
              location.pathname === item.href || (item.href !== '/admin' && location.pathname.startsWith(item.href))
                ? "text-admin-panel-primary-foreground"
                : "text-admin-panel-foreground",
              isMobile && "text-lg"
            )}
          >
            <item.icon className="h-5 w-5" />
            {item.name}
          </Link>
        )
      ))}
    </nav>
  );

  return (
    <div className="flex min-h-screen w-full flex-col bg-admin-panel">
      <header className="sticky top-0 flex h-16 items-center gap-4 border-b bg-admin-panel-primary px-4 md:px-6 z-50">
        {/* Desktop Navigation */}
        <div className="hidden md:flex md:flex-1 md:items-center md:gap-5 lg:gap-6">
          <NavLinks />
        </div>

        {/* Mobile Navigation */}
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" asChild={true} className="shrink-0 md:hidden"> {/* Explicitly set asChild */}
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