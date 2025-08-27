import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Home,
  Users,
  FileText,
  Wrench,
  BedDouble,
  Settings,
  LogOut,
  Shield,
  ArrowLeft,
  CircleUser,
  User,
  Target,
  FilePlus,
  MessageSquare,
  Lightbulb,
  HelpCircle,
  GitMerge,
  Menu // Added for mobile menu trigger
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useSession } from './SessionContextProvider';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import NotificationBell from './NotificationBell';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";

interface AdminLayoutProps {
  children: React.ReactNode;
}

const adminNavigationCategories = [
  {
    categoryName: 'Général',
    items: [
      { name: 'Tableau de Bord', href: '/admin', icon: Home },
    ]
  },
  {
    categoryName: 'Gestion des Utilisateurs',
    items: [
      { name: 'Utilisateurs', href: '/admin/users', icon: Users },
      { name: 'Logements Utilisateurs', href: '/admin/user-rooms', icon: BedDouble },
    ]
  },
  {
    categoryName: 'Contenu & Communication',
    items: [
      { name: 'Pages', href: '/admin/pages', icon: FileText },
      { name: 'Blog', href: '/admin/blog', icon: FileText },
      { name: 'FAQ', href: '/admin/faq', icon: HelpCircle },
      { name: 'Changelog', href: '/admin/changelog', icon: GitMerge },
      { name: 'Idées', href: '/admin/ideas', icon: Lightbulb },
      { name: 'Réponses Avis', href: '/admin/review-replies', icon: MessageSquare },
    ]
  },
  {
    categoryName: 'Finances',
    items: [
      { name: 'Générer Relevé', href: '/admin/invoice-generation', icon: FilePlus },
      { name: 'Relevés Sauvegardés', href: '/admin/statements', icon: FileText },
    ]
  },
  {
    categoryName: 'Opérations & Support',
    items: [
      { name: 'Rapports Tech.', href: '/admin/technical-reports', icon: Wrench },
      { name: 'Stratégies', href: '/admin/strategies', icon: Target },
    ]
  },
  {
    categoryName: 'Paramètres',
    items: [
      { name: 'Paramètres', href: '/admin/settings', icon: Settings },
    ]
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
    return <div className="flex items-center justify-center h-screen">Chargement de la session admin...</div>;
  }

  if (profile?.role !== 'admin') {
    return null; // Or a dedicated "Access Denied" component
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-100 dark:bg-gray-900">
      <header className="sticky top-0 z-40 w-full border-b bg-background px-4 lg:px-6 flex items-center h-16">
        <div className="flex items-center mr-4">
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
                <Accordion type="multiple" className="w-full">
                  {adminNavigationCategories.map((category, index) => (
                    <AccordionItem value={`item-${index}`} key={category.categoryName}>
                      <AccordionTrigger className="py-2 text-base hover:no-underline">
                        {category.categoryName}
                      </AccordionTrigger>
                      <AccordionContent className="pb-0">
                        <div className="grid gap-2 pl-4">
                          {category.items.map((item) => (
                            <Link
                              key={item.name}
                              to={item.href}
                              className="flex items-center gap-2 text-sm"
                            >
                              <item.icon className="h-5 w-5" />
                              {item.name}
                            </Link>
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </nav>
              <div className="mt-auto pt-4 border-t">
                <Button variant="ghost" className="w-full justify-start text-left mb-2" asChild>
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
            </SheetContent>
          </Sheet>
          <Link to="/admin" className="flex items-center gap-2 text-lg font-semibold md:text-base">
            <Shield className="h-6 w-6 text-yellow-500" />
            <span className="sr-only md:not-sr-only">Admin Hello Keys</span>
          </Link>
        </div>

        <NavigationMenu className="hidden md:flex flex-1 justify-start">
          <NavigationMenuList>
            {adminNavigationCategories.map((category) => (
              <NavigationMenuItem key={category.categoryName}>
                {category.items.length === 1 ? (
                  <NavigationMenuLink asChild>
                    <Link
                      to={category.items[0].href}
                      className={cn(
                        navigationMenuTriggerStyle(),
                        location.pathname === category.items[0].href && "bg-accent text-accent-foreground"
                      )}
                    >
                      <category.items[0].icon className="h-4 w-4 mr-2" />
                      {category.items[0].name}
                    </Link>
                  </NavigationMenuLink>
                ) : (
                  <>
                    <NavigationMenuTrigger>
                      {category.categoryName}
                    </NavigationMenuTrigger>
                    <NavigationMenuContent>
                      <ul className="grid w-[400px] gap-3 p-4 md:w-[500px] md:grid-cols-2 lg:w-[600px] ">
                        {category.items.map((item) => (
                          <li key={item.name}>
                            <NavigationMenuLink asChild>
                              <Link
                                to={item.href}
                                className={cn(
                                  "block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
                                  location.pathname === item.href && "bg-accent text-accent-foreground"
                                )}
                              >
                                <div className="text-sm font-medium leading-none flex items-center">
                                  <item.icon className="h-4 w-4 mr-2" />
                                  {item.name}
                                </div>
                                <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
                                  {/* Optional: Add a description for each item if needed */}
                                </p>
                              </Link>
                            </NavigationMenuLink>
                          </li>
                        ))}
                      </ul>
                    </NavigationMenuContent>
                  </>
                )}
              </NavigationMenuItem>
            ))}
          </NavigationMenuList>
        </NavigationMenu>

        <div className="flex items-center gap-2 ml-auto">
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
                {profile?.first_name} {profile?.last_name}
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
  );
};

export default AdminLayout;