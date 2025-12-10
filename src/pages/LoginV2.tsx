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
import { UserCircle2, Settings } from "lucide-react";

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
          <div className="h-9 w-9 rounded-full bg-blue-600 flex items-center justify-center">
            <span className="text-white font-semibold text-xl">f</span>
          </div>
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
              Explorez les sujets que
              <span className="block text-blue-600">vous aimez.</span>
            </h1>
            <p className="mt-6 text-gray-600 text-lg">
              Connectez-vous pour retrouver vos contenus, vos conversations et les services dont vous avez besoin.
            </p>
          </div>

          {/* Composition visuelle simplifiée (cartes et badges) */}
          <div className="mt-10 relative h-80">
            <div className="absolute left-4 top-2 w-40 h-56 bg-white shadow-lg rounded-2xl border border-gray-100 overflow-hidden flex items-center justify-center">
              <div className="w-16 h-16 rounded-xl bg-gray-200" />
            </div>
            <div className="absolute left-40 top-16 w-48 h-64 bg-white shadow-lg rounded-2xl border border-gray-100 overflow-hidden flex items-center justify-center">
              <div className="w-20 h-20 rounded-full bg-gray-200" />
            </div>
            <div className="absolute right-8 top-0 w-56 h-72 bg-white shadow-lg rounded-2xl border border-gray-100 overflow-hidden flex items-center justify-center">
              <div className="w-24 h-24 rounded-xl bg-gray-200" />
            </div>
            <div className="absolute right-24 bottom-[-10px] w-40 h-40 bg-pink-100 rounded-full flex items-center justify-center shadow">
              <span className="text-pink-500 text-2xl">❤</span>
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
              <span>S’inscrire</span>
              <span>Se connecter</span>
              <span>Politique de confidentialité</span>
              <span>Conditions générales</span>
              <span>Aide</span>
            </div>
          </div>
        </div>

        {/* Colonne droite: panneau de profil + actions */}
        <div className="flex items-center justify-center py-8">
          <Card className="w-full max-w-md border-0 shadow-none">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center">
                <div className="relative">
                  {profilePreview?.avatarUrl ? (
                    <img
                      src={profilePreview.avatarUrl}
                      alt="Avatar"
                      className="h-28 w-28 rounded-full object-cover border"
                    />
                  ) : (
                    <div className="h-28 w-28 rounded-full bg-gray-200 flex items-center justify-center border">
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

                <div className="mt-6 w-full space-y-3">
                  <Button
                    className="w-full h-11 rounded-full bg-blue-600 hover:bg-blue-700"
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
                    className="w-full h-11 rounded-full text-blue-600 border-blue-200 hover:border-blue-300"
                    onClick={handleCreateAccount}
                  >
                    Créer un nouveau compte
                  </Button>
                </div>

                <Separator className="my-8" />

                {/* Module Auth Supabase (masqué tant qu’on ne demande pas) */}
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

                <div className="mt-6 text-xs text-gray-500">
                  <span>© Meta style — version personnalisée pour votre application</span>
                </div>

                <div className="mt-2 text-xs text-gray-400">
                  <Link to="/" className="hover:underline">Retour à l’accueil</Link>
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