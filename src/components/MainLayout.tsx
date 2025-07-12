"use client";

import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Bell, ChevronDown, Search, Settings, Home, CalendarDays, Bookmark, TrendingUp, MessageSquare, Banknote, FileText, LifeBuoy, Puzzle, Map, User, Menu, Plus, FileSpreadsheet, Newspaper, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import AICopilotDialog from './AICopilotDialog';
import NewFeaturesBanner from './NewFeaturesBanner'; // Import the new banner

interface MainLayoutProps {
  children: React.ReactNode;
}

const gestionNavigationItems = [
  { name: 'Aperçu', href: '/', icon: Home },
  { name: 'Calendrier', href: '/calendar', icon: CalendarDays },
  { name: 'Réservations', href: '/bookings', icon: Bookmark },
  { name: 'Performances', href: '/performance', icon: TrendingUp },
  { name: 'Mes Avis', href: '/reviews', icon: MessageSquare },
  { name: 'Comptabilité', href: '/accounting', icon: Banknote },
  { name: 'Bilans', href: '/balances', icon: FileText },
  { name: 'Rapports', href: '/reports', icon: FileText },
  { name: 'Mes Données GSheet', href: '/my-google-sheet-data', icon: FileSpreadsheet },
  { name: 'Aides', href: '/help', icon: LifeBuoy },
];

const decouvrirNavigationItems = [
  { name: 'Blog', href: '/blog', icon: Newspaper },
];

const bottomNavigationItems = [
  { name: 'Paramètres', href: '/settings', icon: Settings },
  { name: 'Mon Profil', href: '/profile', icon: User },
];

// Reusable Sidebar content
const SidebarContent: React.FC<{ onLinkClick?: () => void }> = ({ onLinkClick }) => {
  const [activeSection, setActiveSection] = useState<'gestion' | 'decouvrir'>('gestion');
  const location = useLocation();

  const currentNavigationItems = activeSection === 'gestion' ? gestionNavigationItems : decouvrirNavigationItems;

  return (
    <>
      <div className="flex items-center mb-8">
        <img src="/LOGO-FINAL-BLEU-SANS-MAISON-2048x656.png" alt="Hello Keys Logo" className="w-full h-auto" />
      </div>

      <div className="mb-6 flex justify-center">
        <ToggleGroup
          type="single"
          value={activeSection}
          onValueChange={(value: 'gestion' | 'decouvrir') => {
            if (value) setActiveSection(value);
          }}
          className="w-full grid grid-cols-2 gap-2"
        >
          <ToggleGroupItem
            value="gestion"
            aria-label="Toggle gestion"
            variant="ghost"
            className={cn(
              "flex-1 font-medium text-[15px] tracking-wide rounded-full",
              "hover:bg-transparent hover:opacity-80",
              "data-[state=on]:bg-transparent data-[state=on]:text-sidebar-foreground data-[state=on]:opacity-100"
            )}
          >
            Gestion
          </ToggleGroupItem>
          <ToggleGroupItem
            value="decouvrir"
            aria-label="Toggle découvrir"
            variant="ghost"
            className={cn(
              "flex-1 font-medium text-[15px] tracking-wide rounded-full",
              "hover:bg-transparent hover:opacity-80",
              "data-[state=on]:bg-transparent data-[state=on]:text-sidebar-foreground data-[state=on]:opacity-100"
            )}
          >
            Découvrir
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      <nav className="flex-grow">
        <ul className="">
          {currentNavigationItems.map((item) => (
            <li key={item.name} className="mt-3.5 first:mt-0">
              <Link
                to={item.href}
                className={cn(
                  "flex items-center px-4 py-2.5 rounded-full text-[15px] text-sidebar-foreground font-medium tracking-wide transition-all",
                  "hover:bg-transparent hover:opacity-80",
                  location.pathname === item.href ? 'bg-transparent opacity-100' : ''
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
        <ul className="">
          {bottomNavigationItems.map((item) => (
            <li key={item.name} className="mt-3.5 first:mt-0">
              <Link
                to={item.href}
                className="flex items-center px-4 py-2.5 rounded-full text-[15px] text-sidebar-foreground font-medium tracking-wide hover:bg-transparent hover:opacity-80 transition-all"
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
};

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const isMobile = useIsMobile();
  const [isSheetOpen, setIsSheetOpen] = React.useState(false);
  const [isAICopilotDialogOpen, setIsAICopilotDialogOpen] = useState(false);
  const navigate = useNavigate();

  const handleLinkClick = () => {
    if (isMobile) {
      setIsSheetOpen(false);
    }
  };

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        throw error;
      }
      toast.success("Déconnexion réussie !");
      navigate('/login');
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
            <span className="text-lg font-semibold">0°C</span>
          </div>

          <div className="flex items-center space-x-2 sm:space-x-4">
            <Button variant="outline" className="flex items-center px-2 md:px-4">
              <Plus className="h-4 w-4" />
              <span className="ml-2 hidden xl:inline-block">Actions rapides</span>
            </Button>
            {/* New AI Copilot Button */}
            <Button variant="ghost" size="icon" onClick={() => setIsAICopilotDialogOpen(true)}>
              <Sparkles className="h-5 w-5 text-blue-500" />
            </Button>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              <span className="absolute top-0 right-0 h-2 w-2 rounded-full bg-red-500" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full flex items-center justify-center md:w-auto md:px-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src="/avatars/01.png" alt="Thomas" />
                    <AvatarFallback>TH</AvatarFallback>
                  </Avatar>
                  <div className="hidden xl:flex flex-col items-start ml-2">
                    <span className="text-sm font-medium">Thomas</span>
                    <span className="text-xs leading-none text-gray-500 dark:text-gray-400">Compte admin</span>
                  </div>
                  <ChevronDown className="h-4 w-4 ml-2 hidden md:inline-block" />
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
                <DropdownMenuItem onClick={handleLogout}>
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* New Features Banner */}
        <NewFeaturesBanner />

        {/* Main content area for pages */}
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