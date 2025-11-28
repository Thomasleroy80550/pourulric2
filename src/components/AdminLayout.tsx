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
  BarChart3,
  Link2,
  ArrowRightLeft,
  FileSymlink,
  Store,
  PlugZap,
  CalendarDays,
  Snowflake,
  Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { useSession } from './SessionContextProvider';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import NotificationBell from './NotificationBell';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';

interface AdminLayoutProps {
  children: React.ReactNode;
}

const adminNavigationCategories = [
  {
    categoryName: 'Général',
    items: [
      { name: 'Tableau de Bord', href: '/admin', icon: Home, description: "Vue d'ensemble de l'activité." },
      { name: 'Stats Hello Keys', href: '/admin/hello-keys-stats', icon: BarChart3, description: 'Statistiques de facturation de Hello Keys.' },
      { name: 'Revue Client', href: '/admin/client-performance', icon: BarChart3, description: 'Synthèse mensuelle par client.' },
    ]
  },
  {
    categoryName: 'Gestion',
    items: [
      { name: 'Clients', href: '/admin/users', icon: Users, description: 'Gérer les comptes et profils clients.' },
      { name: 'Logements', href: '/admin/user-rooms', icon: BedDouble, description: 'Consulter les logements des utilisateurs.' },
      { name: 'Compteurs coupés', href: '/admin/utility-cuts', icon: PlugZap, description: 'Liste des logements où électricité/eau sont coupées.' },
      { name: 'Stratégies', href: '/admin/strategies', icon: Target, description: 'Définir les stratégies de prix.' },
      { name: 'Demandes Modules', href: '/admin/module-requests', icon: Puzzle, description: 'Gérer les demandes d\'activation de modules.' },
      { name: 'Demandes PowerSense', href: '/admin/module-requests?module=electricity', icon: Zap, description: 'Candidatures PowerSense.' },
      { name: 'Demandes Saison 2026', href: '/admin/season-requests', icon: CalendarDays, description: 'Voir et traiter les demandes de prix saison.' },
      { name: 'Marketplace', href: '/admin/marketplace', icon: Store, description: 'Gérer les prestataires de la marketplace.' },
      { name: 'Demandes Hivernage', href: '/admin/hivernage-requests', icon: Snowflake, description: 'Voir et exporter les demandes d\"hivernage.' },
      { name: 'IDs Revyoos manquants', href: '/admin/revyoos-missing', icon: Link2, description: 'Complétez les IDs Revyoos manquants.' },
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
      { name: 'Ajouter Stats Manuelles', href: '/admin/manual-stats', icon: FilePlus, description: 'Ajouter manuellement les statistiques mensuelles passées.' },
      { name: 'Relevés Sauvegardés', href: '/admin/statements', icon: FileText, description: 'Consulter les relevés existants.' },
      { name: 'Statuts de facturation', href: '/admin/billing-status', icon: FileText, description: 'Dernier relevé par client pour contrôler la facturation.' },
      { name: 'Créer Facture (Pennylane)', href: '/admin/create-pennylane-invoice', icon: FilePlus, description: 'Créer une facture client via Pennylane.' },
      { name: 'Synthèse des Virements', href: '/admin/transfer-summary', icon: Banknote, description: 'Voir le total des virements à effectuer par client.' },
      { name: 'Transactions Stripe', href: '/admin/stripe-transactions', icon: CreditCard, description: 'Consulter les transactions Stripe.' },
      { name: 'Transferts Stripe', href: '/admin/stripe-transfers', icon: ArrowRightLeft, description: 'Consulter les transferts Stripe.' },
      { name: 'Rapprochement Stripe', href: '/admin/stripe-match', icon: Link2, description: 'Lier les comptes Stripe aux utilisateurs.' },
      { name: 'Note de Relogement', href: '/admin/rehousing-note', icon: FileSymlink, description: 'Créer une note de relogement ou compensation.' },
    ]
  },
  {
    categoryName: 'Support',
    items: [
      { name: 'Rapports Techniques', href: '/admin/technical-reports', icon: Wrench, description: 'Suivre les problèmes techniques signalés.' },
    ]
  },
];

type Item = { name: string; href: string; icon: React.ElementType };

const SidebarLink: React.FC<{ item: Item; active: boolean; onClick?: () => void }> = ({ item, active, onClick }) => {
  const Icon = item.icon;
  return (
    <Link
      to={item.href}
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 rounded-md px-3 py-2 transition-colors",
        active
          ? "bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-200"
          : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
      )}
    >
      <Icon className="h-4 w-4" />
      <span className="truncate">{item.name}</span>
    </Link>
  );
};

const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile, loading } = useSession();
  const [mobileOpen, setMobileOpen] = React.useState(false);

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

  const isActive = (href: string) =>
    location.pathname === href || location.pathname.startsWith(href + "/");

  const Sidebar = (
    <aside className="hidden md:flex md:w-64 lg:w-72 shrink-0 border-r bg-background/60 backdrop-blur supports-[backdrop-filter]:bg-background/40">
      <div className="flex h-full w-full flex-col p-4">
        <div className="flex items-center gap-2 mb-6">
          <Shield className="h-6 w-6 text-orange-600" />
          <div className="font-semibold">Admin Hello Keys</div>
        </div>

        <nav className="flex-1 space-y-4 overflow-y-auto pr-1">
          {adminNavigationCategories.map((cat) => (
            <div key={cat.categoryName} className="space-y-1">
              <div className="px-3 text-xs font-semibold uppercase text-muted-foreground tracking-wider">
                {cat.categoryName}
              </div>
              <div className="space-y-1">
                {cat.items.map((item) => (
                  <SidebarLink key={item.name} item={item as Item} active={isActive(item.href)} />
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="mt-4 pt-4 border-t">
          <Link to="/" className="flex items-center gap-3 rounded-md px-3 py-2 text-muted-foreground hover:text-foreground hover:bg-muted/60">
            <ArrowLeft className="h-4 w-4" />
            Retour au site
          </Link>
        </div>
      </div>
    </aside>
  );

  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/40">
      {/* Header */}
      <header className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 md:px-6">
        <div className="md:hidden">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="shrink-0">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Ouvrir le menu de navigation</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-[280px]">
              <div className="h-full flex flex-col">
                <div className="flex items-center gap-2 px-4 py-3">
                  <Shield className="h-6 w-6 text-orange-600" />
                  <div className="font-semibold">Admin Hello Keys</div>
                </div>
                <nav className="flex-1 px-2 overflow-y-auto">
                  {adminNavigationCategories.map((cat) => (
                    <div key={cat.categoryName} className="mb-3">
                      <div className="px-2 py-1 text-xs font-semibold uppercase text-muted-foreground tracking-wider">
                        {cat.categoryName}
                      </div>
                      <div className="space-y-1">
                        {cat.items.map((item) => (
                          <SidebarLink
                            key={item.name}
                            item={item as Item}
                            active={isActive(item.href)}
                            onClick={() => setMobileOpen(false)}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </nav>
                <div className="p-2 border-t">
                  <Link
                    to="/"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-3 rounded-md px-3 py-2 text-muted-foreground hover:text-foreground hover:bg-muted/60"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Retour au site
                  </Link>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>

        {/* Left spacer for desktop sidebar */}
        <div className="hidden md:block w-64 lg:w-72" />

        {/* Search */}
        <div className="flex items-center gap-3 flex-1">
          <div className="relative max-w-md w-full">
            <Input placeholder="Rechercher (clients, relevés…)" className="pl-3 pr-3" />
          </div>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-2 md:gap-4 md:ml-auto">
          <Button variant="outline" size="sm" asChild className="hidden md:flex">
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
                <span className="sr-only">Menu utilisateur</span>
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
              <DropdownMenuItem onClick={async () => { await supabase.auth.signOut(); navigate('/login'); }}>
                <LogOut className="h-4 w-4 mr-2" />
                Déconnexion
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <div className="flex flex-1">
        {/* Desktop sidebar */}
        {Sidebar}

        {/* Main content */}
        <main className="flex-1 flex flex-col gap-4 p-4 md:gap-8 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;