"use client";

import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Bell, ChevronDown, Settings, Home, CalendarDays, Bookmark, TrendingUp, MessageSquare, Banknote, LifeBuoy, User, Menu, Plus, Newspaper, Sparkles, Shield, CheckCheck, Wrench, AlertTriangle, LogOut, Plug } from 'lucide-react';
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
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface MainLayoutProps {
  children: React.ReactNode;
}

const defaultSidebarSections = [
  {
    title: 'Pilotage',
    items: [
      { name: 'Aperçu', href: '/', icon: Home },
      { name: 'Calendrier', href: '/calendar', icon: CalendarDays },
      { name: 'Réservations', href: '/bookings', icon: Bookmark },
      { name: 'Rapports Tech.', href: '/reports', icon: Wrench },
    ],
  },
  {
    title: 'Analyse & Suivi',
    items: [
      { name: 'Performances', href: '/performance', icon: TrendingUp },
      { name: 'Finances', href: '/finances', icon: Banknote },
      { name: 'Taxe de Séjour', href: '/tourist-tax', icon: Banknote },
      { name: 'Mes Avis', href: '/reviews', icon: MessageSquare },
    ],
  },
  {
    title: 'Ressources',
    items: [
      { name: 'Blog', href: '/blog', icon: Newspaper },
      { name: 'Aides', href: '/help', icon: LifeBuoy },
      { name: 'Modules', href: '/modules', icon: Plug },
    ],
  },
];

const accountantSidebarSections = [
  {
    title: 'Analyse & Suivi',
    items: [
      { name: 'Performances', href: '/performance', icon: TrendingUp },
      { name: 'Finances', href: '/finances', icon: Banknote },
      { name: 'Taxe de Séjour', href: '/tourist-tax', icon: Banknote },
    ],
  },
];

const accountNavigationItems = [
  { name: 'Mon Profil', href: '/profile', icon: User },
  { name: 'Paramètres', href: '/settings', icon: Settings },
];

const SidebarContent: React.FC<{ onLinkClick?: () => void }> = ({ onLinkClick }) => {
  const location = useLocation();
  const { profile } = useSession();

  const sidebarSections = profile?.role === 'accountant' ? accountantSidebarSections : defaultSidebarSections;

  return (
    <>
      <div className="flex items-center mb-8">
        <img src="/logo.png" alt="Hello Keys Logo" className="w-40 h-auto mx-auto" />
      </div>

      <nav id="tour-sidebar-nav" className="flex-grow space-y-6">
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
                      "flex items-center px-4 py-2.5 rounded-md text-sm text-sidebar-foreground font-medium tracking-wide transition-all",
                      "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                      (location.pathname === item.href || (item.href !== '/' && location.pathname.startsWith(item.href))) ? 'bg-sidebar-accent text-sidebar-accent-foreground' : ''
                    )}
                    onClick={onLinkClick}
                  >
                    <item.icon className="h-5 w-5 mr-3" />
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <nav className="mt-auto pt-4 border-t border-sidebar-border">
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
    </>
  );
};

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const isMobile = useIsMobile();
  const [isSheetOpen, setIsSheetOpen] = React.useState(false);
  const [isAICopilotDialogOpen, setIsAICopilotDialogOpen] = useState(false);
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const { profile, session } = useSession(); // Destructure session here
  const [isImpersonating, setIsImpersonating] = useState(false);

  useEffect(() => {
    const impersonationSession = localStorage.getItem('admin_impersonation_session');
    setIsImpersonating(!!impersonationSession);
  }, [profile]);

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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, (payload) => {
        console.log('Change received!', payload);
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
      localStorage.removeItem('admin_impersonation_session'); // Clear on logout
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
    <div className="flex min-h-screen bg-gray-50 text-gray-900 dark:bg-gray-950 dark:text-gray-50">
      {!isMobile && (
        <aside className="w-64 bg-sidebar text-sidebar-foreground p-4 flex flex-col border-r border-sidebar-border shadow-lg">
          <SidebarContent />
        </aside>
      )}

      <div className="flex-1 flex flex-col">
        <header className="bg-white dark:bg-gray-800 p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between shadow-sm">
          <div className="flex items-center space-x-4">
            {isMobile && (
              <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="lg:hidden">
                    <Menu className="h-6 w-6" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-64 p-4 bg-sidebar text-sidebar-foreground flex flex-col">
                  <SidebarContent onLinkClick={handleLinkClick} />
                </SheetContent>
              </Sheet>
            )}
            {/* Removed 0°C display */}
          </div>

          <div className="flex items-center space-x-2 sm:space-x-4">
            <Button variant="outline" className="flex items-center px-2 md:px-4">
              <Plus className="h-4 w-4" />
              <span className="ml-2 hidden xl:inline-block">Actions rapides</span>
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setIsAICopilotDialogOpen(true)}>
              <Sparkles className="h-5 w-5 text-blue-500" />
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 h-2.5 w-2.5 rounded-full bg-red-500 flex items-center justify-center text-white text-[10px]">
                    </span>
                  )}
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
                        <div className={cn("flex-1", notif.is_read && "pl-5")}>
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
                    <p className="text-xs leading-none text-muted-foreground">
                      {session?.user?.email} {/* Display user email from session */}
                    </p>
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
                  <LogOut className="h-4 w-4 mr-2" /> {/* Add LogOut icon */}
                  Déconnexion
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {isImpersonating && (
          <Alert variant="default" className="m-4 bg-yellow-100 border-yellow-300 text-yellow-800 dark:bg-yellow-900/30 dark:border-yellow-700 dark:text-yellow-300">
            <AlertTriangle className="h-4 w-4 !text-yellow-800 dark:!text-yellow-300" />
            <AlertTitle>Mode Impersonnalisation</AlertTitle>
            <AlertDescription className="flex items-center justify-between">
              Vous naviguez en tant que {profile?.first_name} {profile?.last_name}.
              <Button variant="outline" size="sm" onClick={handleReturnToAdmin} className="bg-yellow-200 hover:bg-yellow-300 text-yellow-900">
                <LogOut className="h-4 w-4 mr-2" />
                Retourner à mon compte Admin
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <main className="flex-1 p-6 overflow-auto">
          {children}
        </main>
      </div>
      <AICopilotDialog
        isOpen={isAICopilotDialogOpen}
        onOpenChange={setIsAICopilotDialogOpen}
        navigate={navigate}
      />
    </div>
  );
};

export default MainLayout;