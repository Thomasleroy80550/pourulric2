import React, { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Session } from '@supabase/supabase-js';
import { useNavigate, useLocation } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';
import { Skeleton } from '@/components/ui/skeleton';
import CGUVModal from './CGUVModal';
import OnboardingConfettiDialog from './OnboardingConfettiDialog';
import { getProfile, UserProfile } from '@/lib/profile-api';
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

  const fetchUserProfile = useCallback(async (userSession: Session) => {
    try {
      const userProfile = await getProfile();
      setProfile(userProfile);
      return userProfile;
    } catch (error) {
      console.error("Error fetching user profile in SessionContextProvider:", error);
      toast.error("Erreur lors du chargement de votre profil.");
      return null;
    }
  }, []);

  const revalidateSessionAndProfile = useCallback(async (currentSession: Session | null) => {
    setLoading(true);
    if (currentSession) {
      setSession(currentSession);
      const userProfile = await fetchUserProfile(currentSession);

      if (userProfile) {
        // If user is on login page but authenticated, redirect to dashboard or appropriate onboarding page
        if (location.pathname === '/login') {
          navigate('/'); // Default redirect for authenticated users from login
          setLoading(false);
          return;
        }

        // Admins should always have full access, regardless of their onboarding status
        if (userProfile.role !== 'admin') {
          const currentPath = location.pathname;
          // Ensure onboardingStatus is always a string for comparison, defaulting to 'estimation_sent'
          const onboardingStatus = userProfile.onboarding_status || 'estimation_sent';

          let requiredOnboardingPath: string | null = null;

          if (onboardingStatus === 'live') {
            // If user is 'live' but still on an onboarding page, redirect to dashboard
            if (currentPath.startsWith('/onboarding')) {
              requiredOnboardingPath = '/';
            }
          } else { // User is not 'live'
            if (['estimation_sent', 'estimation_validated', 'cguv_accepted', 'keys_pending_reception', 'photoshoot_done'].includes(onboardingStatus)) {
              requiredOnboardingPath = '/onboarding-status';
            } else if (['keys_retrieved', 'info_gathering'].includes(onboardingStatus)) {
              requiredOnboardingPath = '/onboarding/property-info';
            } else {
              // Fallback for any unexpected onboarding status, or if status is null/undefined
              requiredOnboardingPath = '/onboarding-status';
            }
          }

          // Perform redirection if current path is not the required path
          if (requiredOnboardingPath && currentPath !== requiredOnboardingPath) {
            navigate(requiredOnboardingPath);
            setLoading(false);
            return;
          }
        }

        // Banned status takes precedence over CGUV modal
        if (userProfile.is_banned) {
          setShowCguvModal(false);
        } else {
          const cguvAccepted = userProfile.cguv_accepted_at;
          const cguvVersion = userProfile.cguv_version;

          if (!cguvAccepted || cguvVersion !== CURRENT_CGUV_VERSION) {
            // Only show CGUV modal if not already on estimation pages
            if (userProfile.onboarding_status !== 'estimation_sent' && userProfile.onboarding_status !== 'estimation_validated') {
              setShowCguvModal(true);
            }
          } else {
            setShowCguvModal(false);
          }
        }
      } else {
        // User is authenticated but profile not found/loaded, redirect to login
        if (location.pathname !== '/login') {
          navigate('/login');
          setLoading(false);
          return;
        }
      }
    } else {
      // No session (user is not authenticated)
      setSession(null);
      setProfile(null);
      setShowCguvModal(false);
      setShowOnboardingConfetti(false);
      // If there's no session and the user is not on the login page, redirect to login
      if (location.pathname !== '/login') {
        navigate('/login');
      }
    }
    setLoading(false);
  }, [fetchUserProfile, location.pathname, navigate]);


  useEffect(() => {
    let isMounted = true;

    // Listen for auth state changes. This callback is fired immediately on subscription with the current session.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, currentSession) => {
      if (!isMounted) return;
      revalidateSessionAndProfile(currentSession);
    });

    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        const { data: { session: refreshedSession } } = await supabase.auth.getSession();
        if (!isMounted) return;
        // Only revalidate if the session actually changed to avoid unnecessary re-renders
        if (refreshedSession?.user?.id !== session?.user?.id || (refreshedSession && !session) || (!refreshedSession && session)) {
          revalidateSessionAndProfile(refreshedSession);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      isMounted = false;
      subscription.unsubscribe();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [revalidateSessionAndProfile, session]);

  const handleAcceptCguv = async () => {
    try {
      const wasFirstTimeAccepting = !profile?.cguv_accepted_at;

      const updates: Partial<UserProfile> = {
        cguv_accepted_at: new Date().toISOString(),
        cguv_version: CURRENT_CGUV_VERSION,
      };

      if (profile?.onboarding_status === 'estimation_validated') {
        updates.onboarding_status = 'cguv_accepted';
      }

      const updatedProfile = await updateProfile(updates);

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
    throw new Error('useSession must be used within a SessionContextProvider');
  }
  return context;
};