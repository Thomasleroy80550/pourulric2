import React, { useState, useEffect, createContext, useContext, useCallback } from 'react';
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
  const [loading, setLoading] = useState(true); // Initial loading state for the very first load
  const [showCguvModal, setShowCguvModal] = useState(false);
  const [showOnboardingConfetti, setShowOnboardingConfetti] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Paths that do not require authentication
  const publicPaths = ['/login', '/promotion', '/onboarding-status', '/pages/']; // Added /pages/ for content pages

  // Function to fetch user profile
  const fetchUserProfile = useCallback(async () => {
    try {
      const userProfile = await getProfile();
      setProfile(userProfile);
      return userProfile;
    } catch (error) {
      console.error("Error fetching user profile in SessionContextProvider:", error);
      toast.error("Erreur lors du chargement de votre profil.");
      setProfile(null);
      return null;
    }
  }, []);

  // Handles initial auth state and subsequent auth state changes
  const handleAuthAndProfile = useCallback(async (currentSession: Session | null) => {
    setLoading(true); // Start loading for auth state changes
    setSession(currentSession);
    if (currentSession) {
      await fetchUserProfile();
    } else {
      setProfile(null);
    }
    setLoading(false); // End loading for auth state changes
  }, [fetchUserProfile]);

  // Effect for initial session load and auth state changes
  useEffect(() => {
    let isMounted = true;

    // Initial session check
    supabase.auth.getSession().then(async ({ data: { session: initialSession } }) => {
      if (isMounted) {
        await handleAuthAndProfile(initialSession);
      }
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      if (isMounted) {
        await handleAuthAndProfile(currentSession);
      }
    });

    // Re-check session when tab becomes visible (for long-lived sessions)
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        const { data: { session: refreshedSession } } = await supabase.auth.getSession();
        if (isMounted) {
          await handleAuthAndProfile(refreshedSession);
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      isMounted = false;
      subscription.unsubscribe();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [handleAuthAndProfile]); // Only depends on handleAuthAndProfile, which itself doesn't depend on location.pathname

  // Effect for handling navigation and modals based on session/profile state
  useEffect(() => {
    // Only run this logic after the initial loading is complete
    if (loading) {
      return;
    }

    const currentPathIsPublic = publicPaths.some(path => location.pathname.startsWith(path));

    if (session && profile) {
      // User is logged in
      if (location.pathname === '/login') {
        navigate('/'); // Redirect from login page if already logged in
      }

      // Onboarding status redirection for non-admin users
      if (profile.role !== 'admin') {
        if (profile.onboarding_status && profile.onboarding_status !== 'live' && location.pathname !== '/onboarding-status') {
          navigate('/onboarding-status');
        } else if (profile.onboarding_status === 'live' && location.pathname === '/onboarding-status') {
          navigate('/'); // Redirect from onboarding page if onboarding is complete
        }
      }

      // CGUV Logic
      if (profile.is_banned) {
        setShowCguvModal(false);
      } else {
        const cguvAccepted = profile.cguv_accepted_at;
        const cguvVersion = profile.cguv_version;
        // Show CGUV modal if not accepted or version mismatch, AND not on estimation_sent/validated status
        if (!cguvAccepted || cguvVersion !== CURRENT_CGUV_VERSION) {
          if (profile.onboarding_status !== 'estimation_sent' && profile.onboarding_status !== 'estimation_validated') {
            setShowCguvModal(true);
          } else {
            setShowCguvModal(false); // Hide if on estimation status, as CGUV is handled there
          }
        } else {
          setShowCguvModal(false); // CGUV accepted and up to date
        }
      }
    } else {
      // User is not logged in
      setShowCguvModal(false);
      setShowOnboardingConfetti(false);
      // Redirect to login if not on a public path
      if (!currentPathIsPublic) {
        navigate('/login');
      }
    }
  }, [loading, session, profile, location.pathname, navigate, publicPaths]); // Dependencies for navigation/modal logic

  const handleAcceptCguv = async () => {
    if (!profile) return;
    try {
      const wasFirstTimeAccepting = !profile.cguv_accepted_at;

      const updates: Partial<UserProfile> = {
        cguv_accepted_at: new Date().toISOString(),
        cguv_version: CURRENT_CGUV_VERSION,
      };

      if (profile.onboarding_status === 'estimation_validated') {
        updates.onboarding_status = 'cguv_accepted';
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Utilisateur non authentifié.");

      const { data: updatedProfile, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id)
        .select('*')
        .single();

      if (error) throw error;

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
            // Prevent closing if CGUV not accepted and not on estimation status
            if (!open && (!profile?.cguv_accepted_at || profile?.cguv_version !== CURRENT_CGUV_VERSION) &&
                profile?.onboarding_status !== 'estimation_sent' && profile?.onboarding_status !== 'estimation_validated') {
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