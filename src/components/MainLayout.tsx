import React from 'react';
import { Link, useNavigate } from 'react-router-dom'; // Import useNavigate
import { Bell, ChevronDown, Search, Settings, Home, CalendarDays, Bookmark, TrendingUp, MessageSquare, Banknote, FileText, LifeBuoy, Puzzle, Map, User, Menu, Plus, FileSpreadsheet } from 'lucide-react'; // Added FileSpreadsheet icon
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { supabase } from '@/integrations/supabase/client'; // Import supabase client
import { toast } from 'sonner'; // Import toast for notifications

interface MainLayoutProps {
  children: React.ReactNode;
}

const navigationItems = [
  { name: 'Aperçu', href: '/', icon: Home },
  { name: 'Calendrier', href: '/calendar', icon: CalendarDays },
  { name: 'Réservations', href: '/bookings', icon: Bookmark },
  { name: 'Performances', href: '/performance', icon: TrendingUp },
  { name: 'Mes Avis', href: '/reviews', icon: MessageSquare },
  { name: 'Comptabilité', href: '/accounting', icon: Banknote },
  { name: 'Bilans', href: '/balances', icon: FileText },
  { name: 'Rapports', href: '/reports', icon: FileText },
  { name: 'Mes Données GSheet', href: '/my-google-sheet-data', icon: FileSpreadsheet }, // New item for Google Sheet Data
  { name: 'Aides', href: '/help', icon: LifeBuoy },
];

const bottomNavigationItems = [
  { name: 'Modules', href: '/modules', icon: Puzzle },
  { name: 'Road Map', href: '/roadmap', icon: Map },
  { name: 'Paramètres', href: '/settings', icon: Settings },
  { name: 'Mon Profil', href: '/profile', icon: User },
];

// Reusable Sidebar content
const SidebarContent: React.FC<{ onLinkClick?: () => void }> = ({ onLinkClick }) => (
  <>
    <div className="flex items-center mb-8">
      <img src="/logo.svg" alt="Hello Keys Logo" className="h-8 w-auto mr-2" />
      <span className="text-lg font-bold text-sidebar-primary">HELLO KEYS</span>
      <span className="text-xs ml-1 text-sidebar-foreground">GESTION LOCATIVE 2.0</span>
    </div>

    <div className="mb-6">
      <Button variant="secondary" className="w-full justify-start mb-2 bg-sidebar-accent text-sidebar-accent-foreground hover:bg-sidebar-accent/80">Gestion</Button>
      <Button variant="ghost" className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">Découvrir</Button>
    </div>

    <nav className="flex-grow">
      <ul className="space-y-2">
        {navigationItems.map((item) => (
          <li key={item.name}>
            <Link
              to={item.href}
              className={cn(
                "flex items-center p-2 rounded-md text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors",
                item.href === '/' ? 'bg-sidebar-accent text-sidebar-accent-foreground' : '' // Active state for Dashboard
              )}
              onClick={onLinkClick}
            >
              <item.icon className="h-5 w-5 mr-3" />
              {item.name}
            </Link>
          </li>
        ))}
      </ul>
    </nav>

    <nav className="mt-auto pt-4 border-t border-sidebar-border">
      <ul className="space-y-2">
        {bottomNavigationItems.map((item) => (
          <li key={item.name}>
            <Link
              to={item.href}
              className="flex items-center p-2 rounded-md text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
              onClick={onLinkClick}
            >
              <item.icon className="h-5 w-5 mr-3" />
              {item.name}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  </>
);

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const isMobile = useIsMobile();
  const [isSheetOpen, setIsSheetOpen] = React.useState(false);
  const navigate = useNavigate(); // Initialize useNavigate

  const handleLinkClick = () => {
    if (isMobile) {
      setIsSheetOpen(false); // Close the sheet on link click in mobile
    }
  };

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        throw error;
      }
      toast.success("Déconnexion réussie !");
      navigate('/login'); // Redirect to login page after successful logout
    } catch (error: any) {
      toast.error(`Erreur lors de la déconnexion : ${error.message}`);
      console.error("Logout error:", error);
    }
  };

  console.log("MainLayout is rendering!");
  return (
    <div className="flex min-h-screen bg-gray-50 text-gray-900 dark:bg-gray-950 dark:text-gray-50">
      {/* Sidebar for Desktop */}
      {!isMobile && (
        <aside className="w-64 bg-sidebar text-sidebar-foreground p-4 flex flex-col border-r border-sidebar-border shadow-lg">
          <SidebarContent />
        </aside>
      )}

      {/* Main content area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
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
            <span className="text-lg font-semibold">0°C</span> {/* Placeholder for temperature */}
          </div>

          <div className="flex items-center space-x-2 sm:space-x-4">
            <Button variant="outline" className="flex items-center px-2 md:px-4">
              <Plus className="h-4 w-4" />
              <span className="ml-2 hidden xl:inline-block">Actions rapides</span> {/* Hidden below xl */}
            </Button>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              <span className="absolute top-0 right-0 h-2 w-2 rounded-full bg-red-500" /> {/* Notification indicator */}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full flex items-center justify-center md:w-auto md:px-2"> {/* Adjust width/padding for md */}
                  <Avatar className="h-8 w-8">
                    <AvatarImage src="/avatars/01.png" alt="Thomas" />
                    <AvatarFallback>TH</AvatarFallback>
                  </Avatar>
                  <div className="hidden xl:flex flex-col items-start ml-2"> {/* Only show text on xl */}
                    <span className="text-sm font-medium">Thomas</span>
                    <span className="text-xs leading-none text-gray-500 dark:text-gray-400">Compte admin</span>
                  </div>
                  <ChevronDown className="h-4 w-4 ml-2 hidden md:inline-block" /> {/* Show chevron from md up */}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">Thomas</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      m@example.com
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem>
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}> {/* Added onClick handler */}
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Main content area for pages */}
        <main className="flex-1 p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

export default MainLayout;