import React, { useState, useEffect, createContext, useContext, useCallback } from 'react';
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

  console.log("SessionContextProvider rendering. Loading:", loading, "Path:", location.pathname);

  const fetchUserProfile = useCallback(async (userSession: Session) => {
    console.log("Fetching user profile...");
    try {
      const userProfile = await getProfile();
      console.log("User profile fetched:", userProfile);
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
        const isAdmin = userProfile.role === 'admin';
        const isOnboardingComplete = userProfile.onboarding_status === 'live';

        // --- Redirection Logic ---
        if (isAdmin) {
          // Admins are redirected to their dashboard from login/onboarding pages
          if (location.pathname === '/login' || location.pathname === '/onboarding-status') {
            navigate('/admin');
          }
        } else {
          // Regular user logic
          if (!isOnboardingComplete) {
            // If onboarding is not complete, they must be on the onboarding page.
            if (location.pathname !== '/onboarding-status') {
              navigate('/onboarding-status');
            }
          } else {
            // If onboarding is complete, they should not be on the onboarding page.
            if (location.pathname === '/onboarding-status' || location.pathname === '/login') {
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
      if (location.pathname !== '/login') {
        navigate('/login');
      }
    }
    setLoading(false);
  }, [fetchUserProfile, location.pathname, navigate]);

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
    console.log("SessionContextProvider useEffect running.");
    let isMounted = true;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, currentSession) => {
      if (!isMounted) return;
      console.log('Auth state changed:', event, currentSession);
      revalidateSessionAndProfile(currentSession);
    });

    supabase.auth.getSession().then(async ({ data: { session: initialSession } }) => {
      if (!isMounted) return;
      console.log("Initial getSession result:", initialSession);
      revalidateSessionAndProfile(initialSession);
    });

    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        console.log('Tab became visible. Re-checking session...');
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
    console.log("Handling CGUV acceptance...");
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
        console.log("First time accepting CGUV, showing confetti.");
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