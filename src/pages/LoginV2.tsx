"use client";

import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import {
  Building2,
  CalendarRange,
  BarChart3,
  Sparkles,
  Bell,
  MapPin,
  KeyRound,
  ShieldCheck,
  Settings,
  UserCircle2,
} from "lucide-react";

type ProfilePreview = {
  email?: string | null;
  fullName?: string | null;
  avatarUrl?: string | null;
};

const LoginV2: React.FC = () => {
  const { toast } = useToast();
  const [profilePreview, setProfilePreview] = React.useState<ProfilePreview | null>(null);
  const [activeTab, setActiveTab] = React.useState<"sign_in" | "sign_up">("sign_in");
  const [authVisible, setAuthVisible] = React.useState(true);

  React.useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      const currentUser = data.session?.user ?? null;
      setProfilePreview({
        email: currentUser?.email ?? null,
        fullName:
          (currentUser?.user_metadata?.full_name as string | undefined) ??
          (currentUser?.user_metadata?.first_name && currentUser?.user_metadata?.last_name
            ? `${currentUser.user_metadata.first_name} ${currentUser.user_metadata.last_name}`
            : null),
        avatarUrl: (currentUser?.user_metadata?.avatar_url as string | undefined) ?? null,
      });
    });
    return () => {
      mounted = false;
    };
  }, []);

  const displayName = useMemo(() => {
    return profilePreview?.fullName ?? profilePreview?.email ?? "Profil invité";
  }, [profilePreview]);

  const handleContinue = async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session) {
      toast({ title: "Bienvenue", description: "Connexion réussie.", duration: 2500 });
      window.location.href = "/";
      return;
    }
    setActiveTab("sign_in");
    setAuthVisible(true);
    toast({ title: "Connexion requise", description: "Veuillez vous connecter pour continuer." });
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-[#F7FBFF] via-white to-[#F0F7FF]">
      {/* Header brand */}
      <header className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="Hello Keys" className="h-8 w-auto" />
          <span className="hidden sm:block font-semibold text-[#0A2540]">Hello Keys</span>
        </div>
        <nav className="hidden sm:flex items-center gap-6 text-sm text-gray-600">
          <Link to="/marketplace" className="hover:text-[#0A2540]">Solutions</Link>
          <Link to="/help" className="hover:text-[#0A2540]">Aide</Link>
          <Link to="/faq" className="hover:text-[#0A2540]">FAQ</Link>
        </nav>
        <button
          className="p-2 rounded-full hover:bg-gray-100 transition"
          aria-label="Paramètres"
        >
          <Settings className="h-5 w-5 text-gray-600" />
        </button>
      </header>

      {/* Main grid */}
      <main className="grid grid-cols-1 lg:grid-cols-2 gap-8 px-6 lg:px-12 py-6">
        {/* Left: Hero + Feature mosaic */}
        <section className="flex flex-col justify-center">
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-[#EAF4FF] px-3 py-1">
              <Building2 className="h-4 w-4 text-[#1E90FF]" />
              <span className="text-xs font-medium text-[#0A2540]">Plateforme immobilière 2.0</span>
            </div>
            <h1 className="mt-4 text-4xl md:text-6xl font-semibold tracking-tight">
              Gérez vos biens
              <span className="block bg-clip-text text-transparent bg-gradient-to-r from-[#1E90FF] to-[#7C3AED]">
                avec Hello Keys.
              </span>
            </h1>
            <p className="mt-6 text-gray-600 text-lg">
              Centralisez réservations, ménage, finances et check-in dans une interface moderne,
              pensée pour les propriétaires et équipes terrain.
            </p>
            <div className="mt-4 flex items-center gap-3">
              <Badge variant="outline" className="gap-1">
                <ShieldCheck className="h-3.5 w-3.5 text-[#1E90FF]" />
                Sécurisé
              </Badge>
              <Badge variant="outline">RGPD-ready</Badge>
              <Badge variant="outline">Multi-propriétés</Badge>
            </div>
          </div>

          {/* Feature mosaic */}
          <div className="mt-10 relative h-[24rem]">
            {/* Réservations */}
            <div className="absolute left-0 top-0 w-48 h-64 bg-white/80 backdrop-blur-md shadow-lg rounded-2xl border border-gray-100 overflow-hidden">
              <div className="p-4">
                <div className="flex items-center gap-2">
                  <CalendarRange className="h-5 w-5 text-[#1E90FF]" />
                  <span className="text-sm font-medium text-gray-800">Réservations</span>
                </div>
                <div className="mt-3 space-y-2">
                  <div className="h-2 w-full bg-gray-100 rounded">
                    <div className="h-2 w-2/3 bg-[#1E90FF] rounded" />
                  </div>
                  <div className="h-2 w-full bg-gray-100 rounded">
                    <div className="h-2 w-1/2 bg-[#1E90FF] rounded" />
                  </div>
                  <div className="h-2 w-full bg-gray-100 rounded">
                    <div className="h-2 w-3/4 bg-[#1E90FF] rounded" />
                  </div>
                </div>
                <div className="mt-4 text-xs text-gray-500">Taux d’occupation hebdo</div>
              </div>
            </div>

            {/* Ménage */}
            <div className="absolute left-44 top-12 w-56 h-68 bg-white/80 backdrop-blur-md shadow-lg rounded-2xl border border-gray-100 overflow-hidden">
              <div className="p-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-[#1E90FF]" />
                  <span className="text-sm font-medium text-gray-800">Ménage</span>
                </div>
                <div className="mt-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-600">Studio #12</span>
                    <span className="text-xs font-medium text-green-600">Fait</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-600">T2 Rivage</span>
                    <span className="text-xs font-medium text-yellow-600">En cours</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-600">Villa Mer</span>
                    <span className="text-xs font-medium text-red-600">À faire</span>
                  </div>
                </div>
                <div className="mt-4">
                  <div className="h-2 w-full bg-gray-100 rounded">
                    <div className="h-2 w-2/5 bg-[#1E90FF] rounded" />
                  </div>
                  <div className="mt-1 text-[10px] text-gray-500">Progression du jour</div>
                </div>
              </div>
            </div>

            {/* Finances */}
            <div className="absolute right-6 top-0 w-64 h-72 bg-white/80 backdrop-blur-md shadow-lg rounded-2xl border border-gray-100 overflow-hidden">
              <div className="p-4">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-[#1E90FF]" />
                  <span className="text-sm font-medium text-gray-800">Finances</span>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2">
                  <div>
                    <div className="text-[10px] text-gray-500">Revenus</div>
                    <div className="text-xs font-semibold text-gray-800">€3 240</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-gray-500">Dépenses</div>
                    <div className="text-xs font-semibold text-gray-800">€820</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-gray-500">Solde</div>
                    <div className="text-xs font-semibold text-green-600">€2 420</div>
                  </div>
                </div>
                <div className="mt-4 flex items-end gap-1 h-16">
                  <div className="w-2 bg-[#1E90FF] h-6 rounded-sm" />
                  <div className="w-2 bg-[#1E90FF] h-10 rounded-sm" />
                  <div className="w-2 bg-[#1E90FF] h-8 rounded-sm" />
                  <div className="w-2 bg-[#1E90FF] h-14 rounded-sm" />
                  <div className="w-2 bg-[#1E90FF] h-5 rounded-sm" />
                  <div className="w-2 bg-[#1E90FF] h-12 rounded-sm" />
                  <div className="w-2 bg-[#1E90FF] h-9 rounded-sm" />
                </div>
                <div className="mt-1 text-[10px] text-gray-500">Évolution 7 jours</div>
              </div>
            </div>

            {/* Check-in / Accès */}
            <div className="absolute right-20 bottom-[-12px] w-48 h-48 bg-gradient-to-br from-[#EAF4FF] to-white rounded-2xl flex items-center justify-center shadow border border-gray-100">
              <div className="flex flex-col items-center">
                <div className="flex items-center gap-2">
                  <KeyRound className="h-6 w-6 text-[#1E90FF]" />
                  <MapPin className="h-6 w-6 text-[#1E90FF]" />
                </div>
                <span className="mt-2 text-xs font-medium text-[#0A2540]">Check-in & accès</span>
                <span className="text-[10px] text-gray-600">Codes, badges, consignes</span>
              </div>
            </div>
          </div>

          {/* Footer links */}
          <div className="mt-8 text-sm text-gray-500">
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              <span>Français (France)</span>
              <span>English (US)</span>
              <span>Español</span>
              <span>Italiano</span>
              <span>Autres langues…</span>
            </div>
            <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2">
              <span>Propriétaires</span>
              <span>Équipes ménage</span>
              <span>Centre d’aide</span>
              <span>Conditions</span>
              <span>Confidentialité</span>
            </div>
          </div>
        </section>

        {/* Right: Auth panel */}
        <section className="flex items-center justify-center">
          <Card className="w-full max-w-md border border-gray-100 bg-white/80 backdrop-blur-md shadow-lg">
            <CardContent className="pt-6">
              {/* Branding header */}
              <div className="w-full flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <img src="/logo.png" alt="Hello Keys" className="h-6 w-auto" />
                  <span className="font-semibold text-[#0A2540]">Hello Keys</span>
                </div>
                <Badge variant="outline" className="text-xs">Connexion</Badge>
              </div>

              {/* Profile preview */}
              <div className="mt-6 flex flex-col items-center">
                <div className="relative">
                  {profilePreview?.avatarUrl ? (
                    <img
                      src={profilePreview.avatarUrl}
                      alt="Avatar"
                      className="h-28 w-28 rounded-full object-cover border"
                    />
                  ) : (
                    <div className="h-28 w-28 rounded-full bg-gray-200 flex items-center justify-center border ring-4 ring-[#EAF4FF]">
                      <UserCircle2 className="h-16 w-16 text-gray-500" />
                    </div>
                  )}
                  <button
                    className="absolute right-0 bottom-0 h-9 w-9 rounded-full bg-gray-100 border flex items-center justify-center hover:bg-gray-200"
                    aria-label="Paramètres du profil"
                  >
                    <Settings className="h-5 w-5 text-gray-600" />
                  </button>
                </div>
                <div className="mt-4 text-lg font-medium">{displayName}</div>

                {/* Feature chips */}
                <div className="mt-5 grid grid-cols-2 gap-2 w-full">
                  <div className="flex items-center gap-2 rounded-xl border border-gray-100 bg-white px-3 py-2 shadow-sm">
                    <CalendarRange className="h-4 w-4 text-[#1E90FF]" />
                    <span className="text-xs font-medium text-gray-800">Réservations</span>
                  </div>
                  <div className="flex items-center gap-2 rounded-xl border border-gray-100 bg-white px-3 py-2 shadow-sm">
                    <Sparkles className="h-4 w-4 text-[#1E90FF]" />
                    <span className="text-xs font-medium text-gray-800">Ménage</span>
                  </div>
                  <div className="flex items-center gap-2 rounded-xl border border-gray-100 bg-white px-3 py-2 shadow-sm">
                    <BarChart3 className="h-4 w-4 text-[#1E90FF]" />
                    <span className="text-xs font-medium text-gray-800">Finances</span>
                  </div>
                  <div className="flex items-center gap-2 rounded-xl border border-gray-100 bg-white px-3 py-2 shadow-sm">
                    <Bell className="h-4 w-4 text-[#1E90FF]" />
                    <span className="text-xs font-medium text-gray-800">Notifications</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-6 w-full space-y-3">
                  <Button
                    className="w-full h-11 rounded-full bg-[#1E90FF] hover:bg-[#1572D8]"
                    onClick={handleContinue}
                  >
                    Continuer
                  </Button>
                </div>

                <Separator className="my-6" />

                {/* Auth Tabs */}
                <Tabs
                  value={activeTab}
                  onValueChange={(v) => setActiveTab(v as "sign_in" | "sign_up")}
                  className="w-full"
                >
                  <TabsList className="grid grid-cols-2 w-full">
                    <TabsTrigger value="sign_in">Se connecter</TabsTrigger>
                    <TabsTrigger value="sign_up">Créer un compte</TabsTrigger>
                  </TabsList>
                  <TabsContent value="sign_in" className="mt-4">
                    {authVisible && (
                      <Auth
                        supabaseClient={supabase}
                        providers={[]}
                        appearance={{ theme: ThemeSupa }}
                        view="sign_in"
                        theme="light"
                      />
                    )}
                  </TabsContent>
                  <TabsContent value="sign_up" className="mt-4">
                    {authVisible && (
                      <Auth
                        supabaseClient={supabase}
                        providers={[]}
                        appearance={{ theme: ThemeSupa }}
                        view="sign_up"
                        theme="light"
                      />
                    )}
                  </TabsContent>
                </Tabs>

                <div className="mt-4 text-[11px] text-gray-500">
                  Vos informations sont protégées et utilisées uniquement pour vous connecter à Hello Keys.
                </div>

                <div className="mt-2 text-xs text-gray-400">
                  <Link to="/" className="hover:underline">Retour à l’accueil</Link>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>
      </main>

      {/* Footer brand */}
      <footer className="px-6 lg:px-12 py-6 text-xs text-gray-500">
        © Hello Keys — plateforme de gestion immobilière 2.0
      </footer>
    </div>
  );
};

export default LoginV2;