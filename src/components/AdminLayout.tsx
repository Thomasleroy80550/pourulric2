import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
  Newspaper,
  HelpCircle,
  GitMerge,
  Lightbulb,
  Menu,
  Puzzle,
  FolderLock,
  LayoutDashboard,
  FilePlus2,
  GitBranch,
  ShieldCheck,
  Banknote,
  CreditCard,
  BarChart3, // New icon for stats
  Link2,
  ArrowRightLeft, // New icon for transfers
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
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface AdminLayoutProps {
  children: React.ReactNode;
}

const adminNavigationCategories = [
  {
    categoryName: 'Général',
    items: [
      { name: 'Tableau de Bord', href: '/admin', icon: Home, description: "Vue d'ensemble de l'activité." },
      { name: 'Stats Hello Keys', href: '/admin/hello-keys-stats', icon: BarChart3, description: 'Statistiques de facturation de Hello Keys.' }, // New item
    ]
  },
  {
    categoryName: 'Gestion',
    items: [
      { name: 'Clients', href: '/admin/users', icon: Users, description: 'Gérer les comptes et profils clients.' },
      { name: 'Logements', href: '/admin/user-rooms', icon: BedDouble, description: 'Consulter les logements des utilisateurs.' },
      { name: 'Stratégies', href: '/admin/strategies', icon: Target, description: 'Définir les stratégies de prix.' },
      { name: 'Demandes Modules', href: '/admin/module-requests', icon: Puzzle, description: 'Gérer les demandes d\'activation de modules.' },
    ]
  },
  {
    categoryName: 'Contenu',
    items: [
      { name: 'Pages', href: '/admin/pages', icon: FileText, description: 'Créer et modifier les pages de contenu.' },
      { name: 'Blog', href: '/admin/blog', icon: FileText, description: 'Gérer les articles du blog.' },
      { name: 'FAQ', href: '/admin/faq', icon: HelpCircle, description: 'Gérer la foire aux questions.' },
      { name: 'Changelog', href: '/admin/changelog', icon: GitMerge, description: 'Publier les nouveautés de l\'application.' },
      { name: 'Idées', href: '/admin/ideas', icon: Lightbulb, description: 'Consulter les suggestions des utilisateurs.' },
      { name: 'Documents', href: '/admin/documents', icon: FolderLock, description: 'Gérer les documents.' },
    ]
  },
  {
    categoryName: 'Finances',
    items: [
      { name: 'Générer Relevé', href: '/admin/invoice-generation', icon: FilePlus2, description: 'Créer de nouveaux relevés mensuels.' },
      { name: 'Relevés Sauvegardés', href: '/admin/statements', icon: FileText, description: 'Consulter les relevés existants.' },
      { name: 'Créer Facture (Pennylane)', href: '/admin/create-pennylane-invoice', icon: FilePlus, description: 'Créer une facture client via Pennylane.' },
      { name: 'Synthèse des Virements', href: '/admin/transfer-summary', icon: Banknote, description: 'Voir le total des virements à effectuer par client.' },
      { name: 'Transactions Stripe', href: '/admin/stripe-transactions', icon: CreditCard, description: 'Consulter les transactions Stripe.' },
      { name: 'Transferts Stripe', href: '/admin/stripe-transfers', icon: ArrowRightLeft, description: 'Consulter les transferts Stripe.' }, // New item
      { name: 'Rapprochement Stripe', href: '/admin/stripe-match', icon: Link2, description: 'Lier les comptes Stripe aux utilisateurs.' },
    ]
  },
  {
    categoryName: 'Support',
    items: [
      { name: 'Rapports Techniques', href: '/admin/technical-reports', icon: Wrench, description: 'Suivre les problèmes techniques signalés.' },
    ]
  },
];

const ListItem = React.forwardRef<
  React.ElementRef<"a">,
  React.ComponentPropsWithoutRef<"a">
>(({ className, title, children, ...props }, ref) => {
  return (
    <li>
      <NavigationMenuLink asChild>
        <a
          ref={ref}
          className={cn(
            "block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
            className
          )}
          {...props}
        >
          <div className="text-sm font-medium leading-none">{title}</div>
          <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
            {children}
          </p>
        </a>
      </NavigationMenuLink>
    </li>
  );
});
ListItem.displayName = "ListItem";

const DesktopNav = () => {
  return (
    <NavigationMenu>
      <NavigationMenuList>
        {adminNavigationCategories.map((category) => (
          <NavigationMenuItem key={category.categoryName}>
            <NavigationMenuTrigger>{category.categoryName}</NavigationMenuTrigger>
            <NavigationMenuContent>
              <ul className="grid w-[400px] gap-3 p-4 md:w-[500px] lg:grid-cols-2">
                {category.items.map((item) => (
                  <ListItem
                    key={item.name}
                    title={item.name}
                    href={item.href}
                  >
                    {item.description}
                  </ListItem>
                ))}
              </ul>
            </NavigationMenuContent>
          </NavigationMenuItem>
        ))}
        <NavigationMenuItem>
          <Link to="/admin/settings" legacyBehavior passHref>
            <NavigationMenuLink className="group inline-flex h-10 w-max items-center justify-center rounded-md bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none disabled:pointer-events-none disabled:opacity-50 data-[active]:bg-accent/50 data-[state=open]:bg-accent/50">
              Paramètres
            </NavigationMenuLink>
          </Link>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  )
}

const AdminLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
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
    return null;
  }

  const MobileNav = () => (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" className="shrink-0 md:hidden">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Ouvrir le menu de navigation</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="flex flex-col">
        <nav className="grid gap-2 text-lg font-medium">
          <Link to="/admin" className="flex items-center gap-2 text-lg font-semibold mb-4">
            <Shield className="h-6 w-6 text-primary" />
            <span>Admin Hello Keys</span>
          </Link>
          <Accordion type="multiple" className="w-full">
            {adminNavigationCategories.map((category, index) => (
              <AccordionItem value={`item-${index}`} key={category.categoryName}>
                <AccordionTrigger className="py-2 text-base hover:no-underline">
                  {category.categoryName}
                </AccordionTrigger>
                <AccordionContent className="pb-0">
                  <div className="grid gap-1 pl-4">
                    {category.items.map((item) => (
                      <Link
                        key={item.name}
                        to={item.href}
                        className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary text-sm"
                      >
                        <item.icon className="h-4 w-4" />
                        {item.name}
                      </Link>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </nav>
      </SheetContent>
    </Sheet>
  );

  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/40">
      <header className="sticky top-0 flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6 z-50">
        <nav className="flex-1 flex items-center gap-6 text-lg font-medium">
          <Link to="/admin" className="flex items-center gap-2 text-lg font-semibold md:text-base mr-4">
            <Shield className="h-6 w-6 text-primary" />
            <span className="sr-only">Admin Hello Keys</span>
          </Link>
          <div className="flex-1">
            <DesktopNav />
          </div>
        </nav>
        <div className="md:hidden">
          <MobileNav />
        </div>
        <div className="flex items-center gap-4 md:ml-auto">
          <Button variant="outline" size="sm" asChild>
            <Link to="/">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour au site
            </Link>
          </Button>
          <NotificationBell />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary" size="icon" className="rounded-full">
                <CircleUser className="h-5 w-5" />
                <span className="sr-only">Toggle user menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <User className="h-4 w-4 mr-2" />
                {profile?.first_name} {profile?.last_name}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/admin/settings')}>
                <Settings className="h-4 w-4 mr-2" />
                Paramètres
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
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        {children}
      </main>
    </div>
  );
};

export default AdminLayout;