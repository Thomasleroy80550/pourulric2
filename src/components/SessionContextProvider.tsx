import React, { useState, useEffect, createContext, useContext, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Session } from '@supabase/supabase-js';
import { useNavigate, useLocation } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';
import { Skeleton } from '@/components/ui/skeleton';
import CGUVModal from './CGUVModal';
import OnboardingConfettiDialog from './OnboardingConfettiDialog';
import { getProfile, updateProfile, UserProfile, updateUserLastSeen } from '@/lib/profile-api';
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
  const [loading, setLoading] = useState(true);
  const [showCguvModal, setShowCguvModal] = useState(false);
  const [showOnboardingConfetti, setShowOnboardingConfetti] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const hasCompletedInitialSessionCheck = useRef(false);
  const locationPathRef = useRef(location.pathname);

  useEffect(() => {
    locationPathRef.current = location.pathname;
  }, [location.pathname]);

  const fetchUserProfile = useCallback(async (_userSession: Session) => {
    try {
      const userProfile = await getProfile();
      
      // Vérifier si le contrat est résilié
      if (userProfile?.is_contract_terminated) {
        toast.error("⚠️ Votre contrat a été résilié. Veuillez sauvegarder vos données avant la suppression définitive de votre compte.");
      }
      
      setProfile(userProfile);
      return userProfile;
    } catch (error) {
      console.error("Error fetching user profile in SessionContextProvider:", error);
      toast.error("Erreur lors du chargement de votre profil.");
      return null;
    }
  }, []);

  const revalidateSessionAndProfile = useCallback(async (currentSession: Session | null) => {
    const shouldShowInitialLoader = !hasCompletedInitialSessionCheck.current;
    if (shouldShowInitialLoader) {
      setLoading(true);
    }

    const currentPath = locationPathRef.current;
    const isPasswordRecoveryRoute =
      currentPath === '/login' &&
      (window.location.hash.includes('type=recovery') ||
        window.location.search.includes('type=recovery') ||
        window.sessionStorage.getItem('password-recovery-in-progress') === 'true');

    try {
      if (currentSession) {
        setSession(currentSession);

        if (isPasswordRecoveryRoute) {
          window.sessionStorage.setItem('password-recovery-in-progress', 'true');
          return;
        }

        const userProfile = await fetchUserProfile(currentSession);

        if (userProfile) {
          const isAdmin = userProfile.role === 'admin';
          const isOnboardingComplete = userProfile.onboarding_status === 'live';

          // --- Redirection Logic ---
          if (isAdmin) {
            // Admins are redirected to their dashboard from login/onboarding pages
            if (currentPath === '/login' || currentPath === '/onboarding-status') {
              navigate('/admin');
            }
          } else {
            // Regular user logic
            if (!isOnboardingComplete) {
              // Autoriser l'invitation même si l'onboarding n'est pas terminé
              if (currentPath !== '/onboarding-status' && !currentPath.startsWith('/redeem-invite')) {
                navigate('/onboarding-status');
              }
            } else {
              // Si onboarding terminé, ne pas rediriger s'il est sur /redeem-invite
              if ((currentPath === '/onboarding-status' || currentPath === '/login') && !currentPath.startsWith('/redeem-invite')) {
                navigate('/');
              }
            }
          }

          // --- CGUV Check ---
          const cguvAccepted = userProfile.cguv_accepted_at;
          const cguvVersion = userProfile.cguv_version;
          if (!cguvAccepted || cguvVersion !== CURRENT_CGUV_VERSION) {
            setShowCguvModal(true);
          } else {
            setShowCguvModal(false);
          }
        }
      } else {
        // No session, redirect to login if not already there
        setSession(null);
        setProfile(null);
        setShowCguvModal(false);
        setShowOnboardingConfetti(false);
        // Whitelist des pages publiques (pas de redirection)
        const publicPaths = ['/login', '/prospect-signup', '/redeem-invite', '/sites/'];
        const isPublicPath = publicPaths.some((p) => currentPath.startsWith(p));

        if (!isPublicPath) {
          navigate('/login');
        }
      }
    } finally {
      hasCompletedInitialSessionCheck.current = true;
      setLoading(false);
    }
  }, [fetchUserProfile, navigate]);

  // Heartbeat effect to update last_seen_at
  useEffect(() => {
    let intervalId: number | undefined;

    if (session) {
      // Update immediately on session load
      updateUserLastSeen();

      // Then update every 60 seconds
      intervalId = window.setInterval(() => {
        updateUserLastSeen();
      }, 60000);
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [session]);

  useEffect(() => {
    let isMounted = true;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, currentSession) => {
      if (!isMounted) return;
      if (event === 'PASSWORD_RECOVERY') {
        window.sessionStorage.setItem('password-recovery-in-progress', 'true');
      }
      revalidateSessionAndProfile(currentSession);
    });

    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        const { data: { session: refreshedSession } } = await supabase.auth.getSession();
        if (!isMounted) return;
        revalidateSessionAndProfile(refreshedSession);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      isMounted = false;
      subscription.unsubscribe();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [revalidateSessionAndProfile]);

  const handleAcceptCguv = async () => {
    try {
      const wasFirstTimeAccepting = !profile?.cguv_accepted_at;

      const updatedProfile = await updateProfile({
        cguv_accepted_at: new Date().toISOString(),
        cguv_version: CURRENT_CGUV_VERSION,
      });

      setProfile(updatedProfile);
      setShowCguvModal(false);
      toast.success("Merci d'avoir accepté les conditions générales.");

      if (wasFirstTimeAccepting) {
        setShowOnboardingConfetti(true);
      }
    } catch (error: any) {
      console.error("Error accepting CGUV:", error);
      toast.error(`Erreur lors de l'acceptation des CGUV : ${error.message}`);
    }
  };

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
    // Fallback pour éviter le crash si un composant est rendu hors provider
    console.warn('useSession called outside of SessionContextProvider. Returning fallback context.');
    return { session: null, loading: true, profile: null };
  }
  return context;
};