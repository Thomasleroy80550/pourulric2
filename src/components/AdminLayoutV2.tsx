import React from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useSession } from "@/components/SessionContextProvider";
import { supabase } from "@/integrations/supabase/client";
import NotificationBell from "@/components/NotificationBell";
import {
  Menu,
  LayoutDashboard,
  Users,
  Briefcase,
  FileText,
  ShoppingBag,
  Settings,
  ArrowLeft,
  CircleUser,
} from "lucide-react";

type NavItem = {
  label: string;
  icon: React.ElementType;
  to: string;
  external?: boolean;
};

const navItems: NavItem[] = [
  { label: "Accueil", icon: LayoutDashboard, to: "/admin-v2" },
  { label: "Clients", icon: Users, to: "/admin-v2/users" },
  { label: "CRM", icon: Briefcase, to: "/admin/crm" },
  { label: "Relevés", icon: FileText, to: "/admin/statements" },
  { label: "Marketplace", icon: ShoppingBag, to: "/admin/marketplace" },
  { label: "Paramètres", icon: Settings, to: "/admin/settings" },
];

const SidebarLink: React.FC<{ item: NavItem; active: boolean; onClick?: () => void }> = ({ item, active, onClick }) => {
  const Icon = item.icon;
  const classes = cn(
    "flex items-center gap-3 rounded-md px-3 py-2 transition-colors",
    active ? "bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-200" : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
  );
  return item.external ? (
    <a href={item.to} className={classes} onClick={onClick}>
      <Icon className="h-4 w-4" />
      <span className="truncate">{item.label}</span>
    </a>
  ) : (
    <Link to={item.to} className={classes} onClick={onClick}>
      <Icon className="h-4 w-4" />
      <span className="truncate">{item.label}</span>
    </Link>
  );
};

const AdminLayoutV2: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile, loading } = useSession();

  React.useEffect(() => {
    if (!loading && profile?.role !== "admin") {
      navigate("/");
    }
  }, [loading, profile, navigate]);

  const [mobileOpen, setMobileOpen] = React.useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Chargement de la session admin…</div>;
  }

  if (profile?.role !== "admin") return null;

  const isActive = (href: string) => location.pathname === href;

  const Sidebar = (
    <aside className="hidden md:flex md:w-64 lg:w-72 shrink-0 border-r bg-background/60 backdrop-blur supports-[backdrop-filter]:bg-background/40">
      <div className="flex h-full w-full flex-col p-4">
        <div className="flex items-center gap-2 mb-6">
          <div className="h-7 w-7 rounded-md bg-orange-600" />
          <div className="font-semibold">Admin V2</div>
          <Badge variant="secondary" className="ml-auto">HubSpot-like</Badge>
        </div>
        <nav className="flex-1 space-y-1">
          {navItems.map((item) => (
            <SidebarLink key={item.to} item={item} active={isActive(item.to)} />
          ))}
        </nav>
        <div className="mt-4 pt-4 border-t">
          <Link to="/admin" className="flex items-center gap-3 rounded-md px-3 py-2 text-muted-foreground hover:text-foreground hover:bg-muted/60">
            <ArrowLeft className="h-4 w-4" />
            Admin classique
          </Link>
        </div>
      </div>
    </aside>
  );

  return (
    <div className="min-h-screen w-full bg-muted/40 flex">
      {/* Mobile nav */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetTrigger asChild>
          <Button variant="outline" size="icon" className="md:hidden m-3 fixed top-2 left-2 z-50">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Ouvrir le menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="p-0 w-[260px]">
          <div className="h-full flex flex-col">
            <div className="flex items-center gap-2 px-4 py-3">
              <div className="h-7 w-7 rounded-md bg-orange-600" />
              <div className="font-semibold">Admin V2</div>
            </div>
            <nav className="flex-1 px-2">
              {navItems.map((item) => (
                <SidebarLink key={item.to} item={item} active={isActive(item.to)} onClick={() => setMobileOpen(false)} />
              ))}
            </nav>
            <div className="p-2 border-t">
              <Link to="/admin" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 rounded-md px-3 py-2 text-muted-foreground hover:text-foreground hover:bg-muted/60">
                <ArrowLeft className="h-4 w-4" />
                Admin classique
              </Link>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Desktop sidebar */}
      {Sidebar}

      {/* Main area */}
      <div className="flex-1 flex flex-col">
        <header className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4">
          <div className="hidden md:block w-64 lg:w-72" />
          <div className="flex items-center gap-3 flex-1">
            <div className="relative max-w-md w-full">
              <Input placeholder="Rechercher (clients, relevés…)" className="pl-3 pr-3" />
            </div>
          </div>
          <div className="flex items-center gap-2 md:gap-3">
            <NotificationBell />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="secondary" size="icon" className="rounded-full">
                  <CircleUser className="h-5 w-5" />
                  <span className="sr-only">Menu utilisateur</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem className="cursor-default">
                  {profile?.first_name} {profile?.last_name}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/admin/settings")}>
                  <Settings className="h-4 w-4 mr-2" />
                  Paramètres
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleLogout}>
                  Se déconnecter
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AdminLayoutV2;