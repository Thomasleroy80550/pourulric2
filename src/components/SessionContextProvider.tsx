import React, { useState, useEffect, createContext, useContext } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Session } from '@supabase/supabase-js';
import { useNavigate, useLocation } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';
import { Skeleton } from '@/components/ui/skeleton';
import CGUVModal from './CGUVModal';
import OnboardingConfettiDialog from './OnboardingConfettiDialog';
import { getProfile, updateProfile, UserProfile } from '@/lib/profile-api';
import { CURRENT_CGUV_VERSION } from '@/lib/constants';
import { toast } from 'sonner';

interface SessionContextType {
  session: Session | null;
  loading: boolean;
  profile: UserProfile | null;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export const SessionContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true); // Initialement à true
  const [showCguvModal, setShowCguvModal] = useState(false);
  const [showOnboardingConfetti, setShowOnboardingConfetti] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  console.log("SessionContextProvider rendering. Loading:", loading, "Path:", location.pathname);

  const fetchUserProfile = async (userSession: Session) => {
    console.log("Fetching user profile...");
    try {
      const userProfile = await getProfile();
      setProfile(userProfile);
      console.log("User profile fetched:", userProfile);
      return userProfile;
    } catch (error) {
      console.error("Error fetching user profile in SessionContextProvider:", error);
      toast.error("Erreur lors du chargement de votre profil.");
      return null;
    }
  };

  const handleAcceptCguv = async () => {
    if (!session?.user) {
      toast.error("Vous devez être connecté pour accepter les CGUV.");
      return;
    }
    try {
      await updateProfile({
        cguv_accepted_at: new Date().toISOString(),
        cguv_version: CURRENT_CGUV_VERSION,
      });
      setProfile(prev => prev ? { ...prev, cguv_accepted_at: new Date().toISOString(), cguv_version: CURRENT_CGUV_VERSION } : null);
      setShowCguvModal(false);
      toast.success("Conditions Générales d'Utilisation acceptées !");
      setShowOnboardingConfetti(true);
    } catch (error: any) {
      console.error("Error accepting CGUV:", error);
      toast.error(`Erreur lors de l'acceptation des CGUV : ${error.message}`);
    }
  };

  useEffect(() => {
    console.log("SessionContextProvider useEffect running.");
    let isMounted = true; // Flag pour éviter les mises à jour d'état sur un composant démonté

    const handleAuthChange = async (event: string, currentSession: Session | null) => {
      if (!isMounted) return;

      console.log('Auth state changed:', event, currentSession);
      setSession(currentSession);

      if (event === 'SIGNED_OUT') {
        console.log('User signed out, redirecting to /login');
        setProfile(null);
        setShowCguvModal(false);
        setShowOnboardingConfetti(false);
        navigate('/login');
        setLoading(false); // Assurez-vous que loading est false après la déconnexion
      } else if (currentSession) {
        console.log('User signed in or updated. Fetching profile...');
        setLoading(true); // Définir loading à true pendant le chargement du profil
        const userProfile = await fetchUserProfile(currentSession);
        if (!isMounted) return; // Vérifier l'état de montage après l'opération asynchrone
        setLoading(false); // Définir loading à false après le chargement du profil

        if (location.pathname === '/login') {
          console.log('User signed in and on login page, redirecting to /');
          navigate('/');
        }

        if (userProfile && location.pathname !== '/login') {
          const cguvAccepted = userProfile.cguv_accepted_at;
          const cguvVersion = userProfile.cguv_version;

          if (!cguvAccepted || cguvVersion !== CURRENT_CGUV_VERSION) {
            console.log("CGUV not accepted or version mismatch. Showing modal.");
            setShowCguvModal(true);
          } else {
            console.log("CGUV already accepted and up to date.");
            setShowCguvModal(false);
          }
        }
      } else if (!currentSession && location.pathname !== '/login') {
        console.log('No session and not on login page, redirecting to /login');
        setProfile(null);
        setShowCguvModal(false);
        setShowOnboardingConfetti(false);
        navigate('/login');
        setLoading(false); // Assurez-vous que loading est false après la redirection
      } else {
        // Si pas de session et déjà sur la page de connexion, arrêtez simplement le chargement
        setLoading(false);
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(handleAuthChange);

    // Vérification initiale de la session
    supabase.auth.getSession().then(async ({ data: { session: initialSession } }) => {
      if (!isMounted) return;

      console.log("Initial getSession result:", initialSession);
      setSession(initialSession);

      if (initialSession) {
        console.log('Initial session found. Fetching profile...');
        setLoading(true); // Définir loading à true pendant le chargement du profil
        const userProfile = await fetchUserProfile(initialSession);
        if (!isMounted) return; // Vérifier l'état de montage après l'opération asynchrone
        setLoading(false); // Définir loading à false après le chargement du profil

        if (location.pathname === '/login') {
          navigate('/');
        }

        if (userProfile && location.pathname !== '/login') {
          const cguvAccepted = userProfile.cguv_accepted_at;
          const cguvVersion = userProfile.cguv_version;

          if (!cguvAccepted || cguvVersion !== CURRENT_CGUV_VERSION) {
            console.log("Initial check: CGUV not accepted or version mismatch. Showing modal.");
            setShowCguvModal(true);
          } else {
            console.log("Initial check: CGUV already accepted and up to date.");
            setShowCguvModal(false);
          }
        }
      } else if (!initialSession && location.pathname !== '/login') {
        console.log('No initial session and not on login page, redirecting to /login');
        navigate('/login');
        setLoading(false); // Assurez-vous que loading est false après la redirection
      } else {
        // Si pas de session initiale et déjà sur la page de connexion, arrêtez simplement le chargement
        setLoading(false);
      }
    });

    return () => {
      isMounted = false; // Nettoyage du flag
      subscription.unsubscribe();
    };
  }, [navigate, location.pathname]);

  console.log("SessionContextProvider - Before return. Loading:", loading, "showCguvModal:", showCguvModal, "showOnboardingConfetti:", showOnboardingConfetti);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-100 dark:bg-gray-950">
        <div className="bg-white dark:bg-gray-800 p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between shadow-sm">
          <Skeleton className="h-8 w-32" />
          <div className="flex items-center space-x-4">
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-8 w-8 rounded-full" />
          </div>
        </div>
        <div className="flex-1 flex">
          <div className="w-64 bg-sidebar text-sidebar-foreground p-4 flex flex-col border-r border-sidebar-border shadow-lg hidden md:flex">
            <Skeleton className="h-8 w-48 mb-8" />
            <Skeleton className="h-10 w-full mb-2" />
            <Skeleton className="h-10 w-full mb-6" />
            <div className="space-y-2 flex-grow">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
            <div className="space-y-2 mt-auto pt-4 border-t border-sidebar-border">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          </div>
          <div className="flex-1 p-6 overflow-auto">
            <Skeleton className="h-10 w-1/3 mb-6" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Skeleton className="h-48 w-full" />
              <Skeleton className="h-48 w-full" />
              <Skeleton className="h-48 w-full" />
            </div>
            <Skeleton className="h-64 w-full mt-6" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <SessionContext.Provider value={{ session, loading, profile }}>
      {children}
      <Toaster />
      {showCguvModal && (
        <CGUVModal
          isOpen={showCguvModal}
          onOpenChange={(open) => {
            if (!open && (!profile?.cguv_accepted_at || profile?.cguv_version !== CURRENT_CGUV_VERSION)) {
              // Do nothing, keep modal open
            } else {
              setShowCguvModal(open);
            }
          }}
          onAccept={handleAcceptCguv}
        />
      )}
      {showOnboardingConfetti && (
        <OnboardingConfettiDialog
          isOpen={showOnboardingConfetti}
          onClose={() => setShowOnboardingConfetti(false)}
        />
      )}
    </SessionContext.Provider>
  );
};

export const useSession = () => {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error('useSession must be used within a SessionContextProvider');
  }
  return context;
};