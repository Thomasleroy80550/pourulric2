"use client";

import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Home,
  Calendar,
  Book,
  BarChart2,
  Star,
  HelpCircle,
  Settings,
  Grid,
  FileText,
  Building,
  BookOpen,
  Wrench,
  Banknote,
  Newspaper,
  Plug,
  Sparkles,
  User,
  TrendingUp,
  LogOut,
  Shield,
  Bell,
  CheckCheck,
  AlertTriangle,
  ChevronDown,
  Menu,
  Plus,
  Gift,
  Lock,
  Copy, // Add new icon
  LayoutDashboard,
  CalendarDays,
  Ban, // Ajout de l'icône Ban
  MessageSquare, // Ajout de l'icône pour les tickets
  Store, // Ajout de l'icône pour la marketplace
  Wrench, // Ajout de l'icône pour le ménage
  Mail, // icône e-mail
  Zap, // icône éclair pour conso électricité
} from "lucide-react";
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import AICopilotDialog from './AICopilotDialog';
import { useSession } from './SessionContextProvider';
import { getNotifications, markNotificationAsRead, markAllNotificationsAsRead, Notification } from '@/lib/notifications-api';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import BottomNavBar from './BottomNavBar';
import WhatsNewSheet from './WhatsNewSheet';
import MigrationNotice from './MigrationNotice'; // Import the new component
import { getSetting } from '@/lib/admin-api'; // Import getSetting
import { MIGRATION_NOTICE_KEY } from '@/lib/constants'; // Import the new constant
import { useTheme } from 'next-themes';
import { useVersion } from '@/hooks/use-version';
import SnowfallOverlay from './SnowfallOverlay';

interface MainLayoutProps {
  children: React.ReactNode;
}

const housekeepingSidebarSections = [
  {
    title: 'Ménage',
    items: [
      { name: 'Mes rapports', href: '/housekeeping-reports', icon: Wrench },
    ],
  },
];

const defaultSidebarSections = (isPaymentSuspended: boolean) => [
  {
    title: 'Pilotage',
    items: [
      { name: 'Aperçu', href: '/', icon: Home },
      { name: 'Calendrier', href: '/calendar', icon: Calendar, disabled: isPaymentSuspended },
      { name: 'Réservations', href: '/bookings', icon: Book, disabled: isPaymentSuspended },
      { name: 'Incidents', href: '/reports', icon: Wrench },
      { name: 'Mes logements', href: '/my-rooms', icon: Building, disabled: isPaymentSuspended },
      { name: 'Saison 2026', href: '/season-2026', icon: CalendarDays },
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
      { name: 'PowerSense', href: '/electricity-start', icon: Zap },
    ],
  },
  {
    title: 'Ressources',
    items: [
      { name: 'Blog', href: '/blog', icon: Newspaper },
      { name: 'Aides', href: '/help', icon: HelpCircle },
      { name: 'Marketplace', href: '/marketplace', icon: Store },
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

  let sidebarSections;
  if (profile?.role === 'housekeeper') {
    sidebarSections = housekeepingSidebarSections;
  } else if (profile?.role === 'accountant') {
    sidebarSections = accountantSidebarSections(isPaymentSuspended);
  } else {
    sidebarSections = defaultSidebarSections(isPaymentSuspended);
  }

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
        {profile?.role !== 'housekeeper' && (
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
        )}

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
                      "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                      (location.pathname === item.href || (item.href !== '/' && location.pathname.startsWith(item.href))) && 'bg-sidebar-accent text-sidebar-accent-foreground',
                      item.disabled && "opacity-50 cursor-not-allowed pointer-events-none"
                    )}
                    onClick={item.disabled ? (e) => e.preventDefault() : onLinkClick}
                  >
                    <item.icon className="h-5 w-5 mr-3" />
                    <span className="flex-1">{item.name}</span>
                    {item.href === '/season-2026' && (
                      <span
                        className="ml-2 inline-block h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse"
                        aria-label="Nouveau"
                        title="Nouveau"
                      />
                    )}
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
        {profile?.role !== 'accountant' && profile?.role !== 'housekeeper' && (
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
        <div className="mt-4 text-xs text-sidebar-foreground/60 text-center">
          Version {useVersion()}
        </div>
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
  const { theme } = useTheme();

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
    <div className="flex min-h-screen overflow-x-hidden bg-gray-50 text-gray-900 dark:bg-gray-950 dark:text-gray-50">
      {!isMobile && (
        <aside className="w-64 bg-sidebar text-sidebar-foreground flex flex-col border-r border-sidebar-border shadow-lg">
          <SidebarContent isPaymentSuspended={profile?.is_payment_suspended || false} />
        </aside>
      )}

      <div className="flex-1 flex flex-col">
        <div className="flex-1 flex flex-col overflow-hidden">
          <header className="bg-background border-b h-16 flex items-center px-6 justify-between">
            <div className="w-1/3 md:w-auto">
              {isMobile && (
                <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                  <SheetTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <Menu className="h-6 w-6" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="w-72 p-0 bg-sidebar text-sidebar-foreground flex flex-col">
                    <SidebarContent onLinkClick={handleLinkClick} isPaymentSuspended={profile?.is_payment_suspended || false} />
                  </SheetContent>
                </Sheet>
              )}
            </div>

            <div className="w-1/3 flex justify-center md:hidden">
              <Link to="/">
                <img src="/logo.png" alt="Hello Keys Logo" className="h-8 w-auto" />
              </Link>
            </div>

            {/* Info fermetures (visible sur desktop) */}
            <div className="hidden md:flex flex-1 items-center justify-center">
              <div className="inline-flex items-center gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs md:text-sm text-amber-900 shadow-sm dark:bg-amber-900/20 dark:border-amber-700 dark:text-amber-200">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <span className="font-semibold">La conciergerie ferme du 4 janvier au 11 février</span>
              </div>
            </div>

            <div className="w-1/3 md:w-auto flex items-center justify-end space-x-2 sm:space-x-4">
              <Button variant="outline" className="hidden md:flex items-center px-2 md:px-4">
                <Plus className="h-4 w-4" />
                <span className="ml-2 hidden xl:inline-block">Actions rapides</span>
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setIsAICopilotDialogOpen(true)}>
                <Sparkles className="h-5 w-5 text-blue-500" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setIsWhatsNewOpen(true)}>
                <Gift className="h-5 w-5" />
              </Button>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="relative">
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && <span className="absolute top-0 right-0 h-2.5 w-2.5 rounded-full bg-red-500"></span>}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-80" align="end">
                  <DropdownMenuLabel className="flex justify-between items-center">
                    <span>Notifications</span>
                    {unreadCount > 0 && (
                      <Button variant="ghost" size="sm" onClick={handleMarkAllAsRead} className="h-auto p-1">
                        <CheckCheck className="h-4 w-4 mr-1" /> Tout marquer comme lu
                      </Button>
                    )}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {notifications.length > 0 ? (
                    notifications.map(notif => (
                      <DropdownMenuItem key={notif.id} onSelect={() => handleNotificationClick(notif)} className={cn("cursor-pointer", !notif.is_read && "bg-blue-50 dark:bg-blue-900/20")}>
                        <div className="flex items-start space-x-3">
                          {!notif.is_read && <div className="h-2 w-2 rounded-full bg-blue-500 mt-1.5"></div>}
                          <div className="flex-1">
                            <p className="text-sm">{notif.message}</p>
                            <p className="text-xs text-gray-500">{formatDistanceToNow(new Date(notif.created_at), { addSuffix: true, locale: fr })}</p>
                          </div>
                        </div>
                      </DropdownMenuItem>
                    ))
                  ) : (
                    <p className="text-center text-sm text-gray-500 p-4">Vous n'avez aucune notification.</p>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>

              <div className="hidden md:block">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-8 w-8 rounded-full flex items-center justify-center md:w-auto md:px-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src="/avatars/01.png" alt={profile?.first_name} />
                        <AvatarFallback>{profile?.first_name?.[0]}{profile?.last_name?.[0]}</AvatarFallback>
                      </Avatar>
                      <div className="hidden xl:flex flex-col items-start ml-2">
                        <span className="text-sm font-medium">{profile?.first_name} {profile?.last_name}</span>
                        <span className="text-xs leading-none text-gray-500 dark:text-gray-400">
                          {isImpersonating ? 'Mode Impersonnalisation' : (profile?.role === 'admin' ? 'Compte admin' : (profile?.role === 'accountant' ? 'Compte comptable' : 'Compte utilisateur'))}
                        </span>
                      </div>
                      <ChevronDown className="h-4 w-4 ml-2 hidden md:inline-block" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56" align="end" forceMount>
                    <DropdownMenuLabel className="font-normal">
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">{profile?.first_name} {profile?.last_name}</p>
                        <p className="text-xs leading-none text-muted-foreground">{session?.user?.email}</p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {profile?.role !== 'accountant' && accountNavigationItems.map((item) => (
                      <DropdownMenuItem key={item.name} onClick={() => navigate(item.href)}>
                        <item.icon className="h-4 w-4 mr-2" />
                        {item.name}
                      </DropdownMenuItem>
                    ))}
                    {profile?.role !== 'accountant' && <DropdownMenuSeparator />}
                    <DropdownMenuItem onClick={handleLogout}>
                      <LogOut className="h-4 w-4 mr-2" />
                      Déconnexion
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-6 bg-muted/40">
            {profile?.is_payment_suspended && (
              <Alert variant="destructive" className="mb-6 sticky top-0 z-10">
                <Ban className="h-4 w-4" />
                <AlertTitle>Compte suspendu pour non-paiement</AlertTitle>
                <AlertDescription>
                  Votre accès aux fonctionnalités principales est restreint. Veuillez contacter le support pour régulariser votre situation.
                </AlertDescription>
              </Alert>
            )}
            {profile?.is_contract_terminated && (
              <div className="mb-6 sticky top-0 z-10 rounded-lg border border-red-300 bg-red-50 dark:bg-red-900/10 shadow-sm">
                <div className="p-4 md:p-5">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 shrink-0">
                        <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center ring-2 ring-red-200">
                          <Ban className="h-5 w-5 text-red-600" />
                        </div>
                      </div>
                      <div>
                        <h3 className="text-lg md:text-xl font-bold text-red-900 dark:text-red-100">
                          Contrat résilié — sauvegardez vos données
                        </h3>
                        <ul className="mt-2 text-sm text-red-800 dark:text-red-200 space-y-1 list-disc pl-5">
                          <li>Accès aux principales fonctionnalités restreint.</li>
                          <li>Vos relevés, documents et données pourront être supprimés prochainement.</li>
                          <li>Téléchargez vos relevés et sauvegardez vos documents dès maintenant.</li>
                        </ul>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 md:gap-3">
                      <Button
                        variant="outline"
                        className="border-red-300 text-red-700 hover:bg-red-100"
                        onClick={() => navigate('/finances')}
                        title="Accéder à mes relevés et factures"
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        Voir mes relevés
                      </Button>
                      <Button
                        variant="outline"
                        className="border-red-300 text-red-700 hover:bg-red-100"
                        onClick={() => navigate('/profile')}
                        title="Accéder à mes documents"
                      >
                        <Lock className="h-4 w-4 mr-2" />
                        Mes documents
                      </Button>
                      <Button
                        variant="outline"
                        className="border-red-300 text-red-700 hover:bg-red-100"
                        onClick={() => navigate('/help')}
                        title="Centre d'aide"
                      >
                        <HelpCircle className="h-4 w-4 mr-2" />
                        Aide
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={() => {
                          window.location.href = 'mailto:contact@hellokeys.fr?subject=Contrat%20r%C3%A9sili%C3%A9%20-%20Assistance';
                        }}
                        title="Contacter le support"
                      >
                        <Mail className="h-4 w-4 mr-2" />
                        Contacter le support
                      </Button>
                    </div>
                  </div>
                </div>
                <div className="h-1 w-full bg-gradient-to-r from-red-400 via-red-500 to-red-600" />
              </div>
            )}
            {children}
          </main>
        </div>
      </div>

      {isMobile && <BottomNavBar isPaymentSuspended={profile?.is_payment_suspended || false} />}
      
      <AICopilotDialog
        isOpen={isAICopilotDialogOpen}
        onOpenChange={setIsAICopilotDialogOpen}
        navigate={navigate}
      />
      <WhatsNewSheet isOpen={isWhatsNewOpen} onOpenChange={setIsWhatsNewOpen} />
      <SnowfallOverlay />
    </div>
  );
};

export default MainLayout;