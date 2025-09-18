"use client";

import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { User, LogOut, Settings, Shield, Terminal } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Alert } from '@/components/ui/alert';
import {
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
  AppSidebar,
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
  Search,
  NotificationBell
} from '@/components/ui/sidebar';
import { supabase } from '@/integrations/supabase/client';
import { useSession } from './SessionContextProvider';
import { useToast } from '@/hooks/use-toast';
import { getNotifications, markNotificationAsRead, markAllNotificationsAsRead } from '@/lib/notifications-api';
import BottomNavBar from './BottomNavBar';
import MigrationNotice from './MigrationNotice';
import { useIsMobile } from '@/hooks/use-mobile';

const getPageTitle = () => {
  const location = useLocation();
  const path = location.pathname;
  
  // Map des chemins vers les titres
  const titles: { [key: string]: string } = {
    '/': 'Tableau de bord',
    '/calendar': 'Calendrier',
    '/bookings': 'Réservations',
    '/reports': 'Incidents',
    '/my-rooms': 'Mes logements',
    '/performance': 'Performances',
    '/finances': 'Finances',
    '/tourist-tax': 'Taxe de Séjour',
    '/reviews': 'Avis',
    '/comp-set': 'Analyse Concurrentielle',
    '/blog': 'Blog',
    '/help': 'Aide',
    '/modules': 'Modules',
    '/new-version': 'Nouveautés',
    '/profile': 'Profil',
    '/settings': 'Paramètres',
    '/admin': 'Administration',
  };
  
  // Vérifier les chemins dynamiques
  if (path.startsWith('/admin/')) {
    return 'Administration';
  }
  
  return titles[path] || 'Page';
};

interface MainLayoutProps {
  children: React.ReactNode;
}

const defaultSidebarSections = (isPaymentSuspended: boolean) => [
  {
    title: 'Pilotage',
    items: [
      { name: 'Aperçu', href: '/', icon: Home },
      { name: 'Calendrier', href: '/calendar', icon: Calendar, disabled: isPaymentSuspended },
      { name: 'Réservations', href: '/bookings', icon: Book, disabled: isPaymentSuspended },
      { name: 'Incidents', href: '/reports', icon: Wrench },
      { name: 'Mes logements', href: '/my-rooms', icon: Building, disabled: isPaymentSuspended },
    ],
  },
  {
    title: 'Analyse & Suivi',
    items: [
      { name: 'Performances', href: '/performance', icon: BarChart2 },
      { name: 'Finances', href: '/finances', icon: Banknote, disabled: isPaymentSuspended },
      { name: 'Taxe de Séjour', href: '/tourist-tax', icon: Banknote },
      { name: 'Mes Avis', href: '/reviews', icon: Star },
      { name: 'Analyse Concurrentielle', href: '/comp-set', icon: Copy },
    ],
  },
  {
    title: 'Ressources',
    items: [
      { name: 'Blog', href: '/blog', icon: Newspaper },
      { name: 'Aides', href: '/help', icon: HelpCircle },
      { name: 'Modules', href: '/modules', icon: Plug },
      { name: 'Nouveautés', href: '/new-version', icon: Sparkles },
    ],
  },
];

const accountantSidebarSections = (isPaymentSuspended: boolean) => [
  {
    title: 'Analyse & Suivi',
    items: [
      { name: 'Performances', href: '/performance', icon: TrendingUp },
      { name: 'Finances', href: '/finances', icon: Banknote, disabled: isPaymentSuspended },
      { name: 'Taxe de Séjour', href: '/tourist-tax', icon: Banknote },
    ],
  },
];

const accountNavigationItems = [
  { name: 'Mon Profil', href: '/profile', icon: User },
];

const SidebarContent: React.FC<{ onLinkClick?: () => void; isPaymentSuspended: boolean }> = ({ onLinkClick, isPaymentSuspended }) => {
  const location = useLocation();
  const { profile, session } = useSession();
  const isMobile = useIsMobile();

  const sidebarSections = profile?.role === 'accountant' ? accountantSidebarSections(isPaymentSuspended) : defaultSidebarSections(isPaymentSuspended);

  return (
    <div className="flex flex-col h-full">
      {isMobile && profile && (
        <div className="flex items-center p-4 border-b border-sidebar-border">
          <Avatar className="h-10 w-10">
            <AvatarImage src="/avatars/01.png" alt={profile?.first_name} />
            <AvatarFallback>{profile?.first_name?.[0]}{profile?.last_name?.[0]}</AvatarFallback>
          </Avatar>
          <div className="ml-3">
            <p className="text-sm font-semibold text-sidebar-foreground">{profile.first_name} {profile.last_name}</p>
            <p className="text-xs text-sidebar-foreground/80">{session?.user?.email}</p>
          </div>
        </div>
      )}

      <div className={cn("flex items-center mb-8 p-4", isMobile && "hidden")}>
        <img src="/logo.png" alt="Hello Keys Logo" className="w-40 h-auto mx-auto" />
      </div>

      <nav id="tour-sidebar-nav" className="flex-grow space-y-6 px-4 overflow-y-auto">
        <div className="mb-4">
          <Button
            asChild
            variant="ghost"
            className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            onClick={onLinkClick}
          >
            <a
              href="https://proprietaire.hellokeys.fr"
              target="_blank"
              rel="noopener noreferrer"
            >
              <LogOut className="h-5 w-5 mr-3" />
              Retour à Hello Keys V1
            </a>
          </Button>
        </div>

        {sidebarSections.map((section) => (
          <div key={section.title}>
            <h3 className="px-4 mb-2 text-xs font-semibold uppercase text-sidebar-foreground/70 tracking-wider">
              {section.title}
            </h3>
            <ul>
              {section.items.map((item) => (
                <li key={item.name}>
                  <Link
                    to={item.href}
                    className={cn(
                      "flex items-center px-4 py-2.5 rounded-md text-sm font-medium tracking-wide transition-all",
                      "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground", // Default styles
                      (location.pathname === item.href || (item.href !== '/' && location.pathname.startsWith(item.href))) && 'bg-sidebar-accent text-sidebar-accent-foreground', // Active state styles
                      item.name === 'Nouveautés' && 'bg-primary text-primary-foreground hover:bg-primary/90', // Highlight for "Nouveautés"
                      item.disabled && "opacity-50 cursor-not-allowed pointer-events-none" // Disabled styles
                    )}
                    onClick={item.disabled ? (e) => e.preventDefault() : onLinkClick}
                  >
                    <item.icon className={cn("h-5 w-5 mr-3", item.name === 'Nouveautés' && 'text-primary-foreground')} />
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <nav className="mt-auto p-4 border-t border-sidebar-border">
        {profile?.role === 'admin' && (
          <div className="mb-2">
            <Link to="/admin" onClick={onLinkClick}>
              <Button variant="outline" className="w-full justify-start bg-sidebar-accent text-sidebar-accent-foreground hover:bg-sidebar-accent/90">
                <Shield className="h-5 w-5 mr-3" />
                Administration
              </Button>
            </Link>
          </div>
        )}
        {profile?.role !== 'accountant' && (
          <ul>
            {accountNavigationItems.map((item) => (
              <li key={item.name}>
                <Link
                  to={item.href}
                  className={cn(
                    "flex items-center px-4 py-2.5 rounded-md text-sm text-sidebar-foreground font-medium tracking-wide transition-all",
                    "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                    location.pathname.startsWith(item.href) ? 'bg-sidebar-accent text-sidebar-accent-foreground' : ''
                  )}
                  onClick={onLinkClick}
                >
                  <item.icon className="h-5 w-5 mr-3" />
                  {item.name}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </nav>
    </div>
  );
};

const MainLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { profile, session } = useSession();
  const isMobile = useIsMobile();
  const [isSheetOpen, setIsSheetOpen] = React.useState(false);
  const [isAICopilotDialogOpen, setIsAICopilotDialogOpen] = useState(false);
  const [isWhatsNewOpen, setIsWhatsNewOpen] = useState(false);
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isImpersonating, setIsImpersonating] = useState(false);
  const [migrationNotice, setMigrationNotice] = useState<{ isVisible: boolean; message: string } | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const impersonationSession = localStorage.getItem('admin_impersonation_session');
    setIsImpersonating(!!impersonationSession);
  }, [profile]);

  useEffect(() => {
    const fetchMigrationNotice = async () => {
      try {
        const setting = await getSetting(MIGRATION_NOTICE_KEY);
        if (setting && setting.value) {
          setMigrationNotice(setting.value);
        }
      } catch (error) {
        console.error("Failed to fetch migration notice setting:", error);
      }
    };
    fetchMigrationNotice();
  }, []);

  const fetchNotifications = async () => {
    try {
      const notifs = await getNotifications();
      setNotifications(notifs);
      setUnreadCount(notifs.filter(n => !n.is_read).length);
    } catch (error) {
      console.error("Failed to fetch notifications", error);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const channel = supabase
      .channel('public:notifications')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, () => {
        fetchNotifications();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleLinkClick = () => {
    if (isMobile) {
      setIsSheetOpen(false);
    }
  };

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      localStorage.removeItem('admin_impersonation_session');
      toast.success("Déconnexion réussie !");
      navigate('/login');
    } catch (error: any) {
      toast.error(`Erreur lors de la déconnexion : ${error.message}`);
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.is_read) {
      await markNotificationAsRead(notification.id);
      fetchNotifications();
    }
    if (notification.link) {
      navigate(notification.link);
    }
  };

  const handleMarkAllAsRead = async () => {
    await markAllNotificationsAsRead();
    fetchNotifications();
  };

  const handleReturnToAdmin = async () => {
    const adminSessionString = localStorage.getItem('admin_impersonation_session');
    if (!adminSessionString) {
      toast.error("Session admin non trouvée. Veuillez vous reconnecter.");
      return;
    }
    try {
      const adminSession = JSON.parse(adminSessionString);
      const { error } = await supabase.auth.setSession(adminSession);
      if (error) throw error;

      localStorage.removeItem('admin_impersonation_session');
      toast.success("Retour au compte administrateur réussi.");
      navigate('/admin/users');
      window.location.reload();
    } catch (error: any) {
      toast.error(`Erreur lors du retour au compte admin : ${error.message}`);
    }
  };

  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/40">
      <SidebarProvider>
        <AppSidebar />
        <div className="flex flex-col flex-1 sm:gap-4 sm:py-4 sm:pl-14">
          <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
            <SidebarTrigger className="-ml-1" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link to="/">Accueil</Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>{getPageTitle()}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
            <div className="relative ml-auto flex-1 md:grow-0">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Rechercher..."
                className="w-full rounded-lg bg-background pl-8 md:w-[200px] lg:w-[336px]"
              />
            </div>
            <NotificationBell notifications={notifications} unreadCount={unreadCount} onMarkAsRead={handleMarkAllAsRead} onMarkAllAsRead={handleMarkAllAsRead} />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="overflow-hidden rounded-full"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={profile?.avatar_url || ''} alt={profile?.first_name || ''} />
                    <AvatarFallback>{profile?.first_name?.charAt(0) || ''}{profile?.last_name?.charAt(0) || ''}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Mon Compte</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <Link to="/profile" className="flex items-center w-full">
                    <User className="mr-2 h-4 w-4" />
                    Profil
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Link to="/settings" className="flex items-center w-full">
                    <Settings className="mr-2 h-4 w-4" />
                    Paramètres
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Déconnexion
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </header>
          <main className="grid flex-1 items-start gap-4 p-4 sm:px-6 sm:py-0 md:gap-8 pb-20 md:pb-0">
            {isImpersonating && (
              <Alert className="mb-4">
                <Shield className="h-4 w-4" />
                <AlertTitle>Mode administrateur</AlertTitle>
                <AlertDescription>
                  Vous êtes connecté en tant que {profile?.email}. <Button variant="link" className="p-0 h-auto" onClick={handleReturnToAdmin}>Revenir à votre compte</Button>
                </AlertDescription>
              </Alert>
            )}
            {migrationNotice?.isVisible && (
              <MigrationNotice
                message={migrationNotice.message}
                onDismiss={handleDismissMigrationNotice}
              />
            )}
            {children}
          </main>
        </div>
      </SidebarProvider>
      <BottomNavBar isPaymentSuspended={profile?.is_payment_suspended || false} />
    </div>
  );
};

export default MainLayout;