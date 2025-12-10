"use client";

import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { UserCircle2, Settings, Calendar, Sparkles, BarChart3, Bell } from "lucide-react";

type ProfilePreview = {
  email?: string | null;
  fullName?: string | null;
  avatarUrl?: string | null;
};

const LoginV2: React.FC = () => {
  const { toast } = useToast();

  // On essaie de récupérer des infos minimales depuis localStorage ou session (si déjà connecté)
  // Note: Cette page reste entièrement fonctionnelle même sans session existante.
  const [session] = React.useState(() => supabase.auth.getSession());
  const [profilePreview, setProfilePreview] = React.useState<ProfilePreview | null>(null);
  const [showAuth, setShowAuth] = React.useState(false);
  const [showSignup, setShowSignup] = React.useState(false);

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
    // Si déjà authentifié, on redirige vers le tableau de bord
    const { data } = await supabase.auth.getSession();
    if (data.session) {
      toast({ title: "Connexion", description: "Vous êtes déjà connecté.", duration: 2500 });
      window.location.href = "/"; // redirection simple vers la page principale
      return;
    }
    // Sinon on affiche le module Auth
    setShowAuth(true);
    toast({ title: "Connexion requise", description: "Veuillez vous connecter pour continuer." });
  };

  const handleUseAnotherProfile = () => {
    setShowAuth(true);
  };

  const handleCreateAccount = () => {
    setShowSignup(true);
    setShowAuth(true);
  };

  return (
    <div className="min-h-screen w-full bg-white">
      {/* Barre fine avec logo et menu */}
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="Hello Keys" className="h-9 w-auto" />
          <span className="font-semibold text-[#0A2540]">Hello Keys</span>
        </div>
        <button
          className="p-2 rounded-full hover:bg-gray-100 transition"
          aria-label="Paramètres"
        >
          <Settings className="h-5 w-5 text-gray-600" />
        </button>
      </div>

      {/* Contenu principal en deux colonnes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 px-6 lg:px-12">
        {/* Colonne gauche: slogan et composition visuelle */}
        <div className="flex flex-col justify-center py-8">
          <div className="max-w-xl">
            <h1 className="text-4xl md:text-6xl font-semibold tracking-tight">
              Gérez vos locations
              <span className="block text-[#1E90FF]">avec Hello Keys.</span>
            </h1>
            <p className="mt-6 text-gray-600 text-lg">
              Connectez-vous pour accéder à vos réservations, tâches de ménage, finances et notifications.
            </p>
          </div>

          {/* Composition visuelle simplifiée (cartes et badges) */}
          <div className="mt-10 relative h-80">
            {/* Carte Réservations */}
            <div className="absolute left-4 top-2 w-40 h-56 bg-white shadow-lg rounded-2xl border border-gray-100 overflow-hidden">
              <div className="p-4">
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-[#1E90FF]" />
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
                <div className="mt-4 text-xs text-gray-500">Taux d'occupation hebdo</div>
              </div>
            </div>

            {/* Carte Ménage */}
            <div className="absolute left-40 top-16 w-48 h-64 bg-white shadow-lg rounded-2xl border border-gray-100 overflow-hidden">
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

            {/* Carte Finances */}
            <div className="absolute right-8 top-0 w-56 h-72 bg-white shadow-lg rounded-2xl border border-gray-100 overflow-hidden">
              <div className="p-4">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-[#1E90FF]" />
                  <span className="text-sm font-medium text-gray-800">Finances</span>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2">
                  <div className="col-span-1">
                    <div className="text-[10px] text-gray-500">Revenus</div>
                    <div className="text-xs font-semibold text-gray-800">€3 240</div>
                  </div>
                  <div className="col-span-1">
                    <div className="text-[10px] text-gray-500">Dépenses</div>
                    <div className="text-xs font-semibold text-gray-800">€820</div>
                  </div>
                  <div className="col-span-1">
                    <div className="text-[10px] text-gray-500">Solde</div>
                    <div className="text-xs font-semibold text-green-600">€2 420</div>
                  </div>
                </div>
                {/* Mini sparkline */}
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

            {/* Pastille Notifications (conserver la forme circulaire) */}
            <div className="absolute right-24 bottom-[-10px] w-40 h-40 bg-[#EAF4FF] rounded-full flex items-center justify-center shadow">
              <div className="flex flex-col items-center">
                <Bell className="h-8 w-8 text-[#1E90FF]" />
                <span className="mt-1 text-xs font-medium text-[#0A2540]">Notifications</span>
                <span className="text-[10px] text-gray-600">3 nouvelles</span>
              </div>
            </div>
          </div>

          {/* Footer liens */}
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
              <span>Personnel de ménage</span>
              <span>Centre d'aide</span>
              <span>Conditions</span>
              <span>Confidentialité</span>
            </div>
          </div>
        </div>

        {/* Colonne droite: panneau de profil + actions */}
        <div className="flex items-center justify-center py-8">
          <Card className="w-full max-w-md border-0 shadow-none">
            <CardContent className="pt-6">
              {/* En-tête branding dans la carte */}
              <div className="w-full flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <img src="/logo.png" alt="Hello Keys" className="h-6 w-auto" />
                  <span className="font-semibold text-[#0A2540]">Hello Keys</span>
                </div>
                <span className="text-xs text-gray-500">Connexion</span>
              </div>

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
                    aria-label="Changer les paramètres du profil"
                  >
                    <Settings className="h-5 w-5 text-gray-600" />
                  </button>
                </div>

                <div className="mt-4 text-lg font-medium">{displayName}</div>

                {/* Chips de fonctionnalités (mini-illustrations du dashboard) */}
                <div className="mt-5 grid grid-cols-2 gap-2 w-full">
                  <div className="flex items-center gap-2 rounded-xl border border-gray-100 bg-white px-3 py-2 shadow-sm">
                    <Calendar className="h-4 w-4 text-[#1E90FF]" />
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
                  <Button
                    variant="outline"
                    className="w-full h-11 rounded-full"
                    onClick={handleUseAnotherProfile}
                  >
                    Utiliser un autre profil
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full h-11 rounded-full text-[#1E90FF] border-[#B3D7FF] hover:border-[#91C7FF]"
                    onClick={handleCreateAccount}
                  >
                    Créer un nouveau compte
                  </Button>
                </div>

                <Separator className="my-8" />

                {/* Module Auth Supabase */}
                {showAuth && (
                  <div className="w-full">
                    <Auth
                      supabaseClient={supabase}
                      providers={[]}
                      appearance={{ theme: ThemeSupa }}
                      view={showSignup ? "sign_up" : "sign_in"}
                      theme="light"
                    />
                  </div>
                )}

                {/* Note de sécurité */}
                <div className="mt-4 text-[11px] text-gray-500">
                  Vos informations sont protégées et utilisées uniquement pour vous connecter à Hello Keys.
                </div>

                <div className="mt-2 text-xs text-gray-400">
                  <Link to="/" className="hover:underline">Retour à l'accueil</Link>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default LoginV2;