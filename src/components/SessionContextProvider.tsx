import React, { useState, useEffect, createContext, useContext } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Session } from '@supabase/supabase-js';
import { useNavigate, useLocation } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';
import { Skeleton } from '@/components/ui/skeleton';
import CGUVModal from './CGUVModal';
import OnboardingConfettiDialog from './OnboardingConfettiDialog';
import { getProfile, UserProfile, updateProfile } from '@/lib/profile-api';
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

  useEffect(() => {
    setLoading(true);

    // 1. Get the session ONCE at the start to unblock the UI.
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      if (session) {
        try {
          const userProfile = await getProfile(session.user.id);
          setProfile(userProfile);
        } catch (error) {
          console.error("Error fetching initial profile:", error);
          setProfile(null);
        }
      }
      setLoading(false);
    });

    // 2. Subscribe to auth changes for login, logout, and token refreshes.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        setSession(currentSession);

        if (event === 'SIGNED_OUT') {
          // User is explicitly signed out. Clear everything.
          setProfile(null);
        } else if (currentSession?.user) {
          // This handles SIGNED_IN, TOKEN_REFRESHED, USER_UPDATED.
          try {
            const userProfile = await getProfile(currentSession.user.id);
            setProfile(userProfile);
          } catch (error) {
            // CRITICAL FIX: If profile fetch fails (e.g., network error on tab focus),
            // DO NOT set profile to null. Keep the old data to prevent "logout".
            console.error("Failed to refresh profile, keeping stale data:", error);
            toast.warning("Connexion instable, les données peuvent ne pas être à jour.", { duration: 2000 });
          }
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Effect for handling redirection and other side effects based on session/profile state
  useEffect(() => {
    if (loading) {
      return; // Don't do anything while loading
    }

    const currentPath = location.pathname;
    const publicPaths = ['/login', '/new-owner-site', '/promotion'];

    // If there is no session, redirect to login (unless on a public page)
    if (!session) {
      if (!publicPaths.some(p => currentPath.startsWith(p))) {
        navigate('/login');
      }
      return;
    }

    // If there is a session, but user is on login page, redirect to home
    if (currentPath === '/login') {
      navigate('/');
      return;
    }

    if (!profile) {
      if (!currentPath.startsWith('/onboarding')) {
        console.error("User is authenticated, but profile could not be loaded or does not exist.");
      }
      return;
    }

    // --- All logic below assumes a valid session and profile ---

    if (profile.role !== 'admin') {
      const onboardingStatus = profile.onboarding_status || 'estimation_sent';
      let requiredOnboardingPath: string | null = null;

      if (onboardingStatus === 'live') {
        if (currentPath.startsWith('/onboarding')) {
          requiredOnboardingPath = '/';
        }
      } else {
        if (['estimation_sent', 'estimation_validated', 'cguv_accepted', 'keys_pending_reception', 'photoshoot_done'].includes(onboardingStatus)) {
          requiredOnboardingPath = '/onboarding/status';
        } else if (['keys_retrieved', 'info_gathering'].includes(onboardingStatus)) {
          requiredOnboardingPath = '/onboarding/property-info';
        } else {
          requiredOnboardingPath = '/onboarding/status'; // Fallback
        }
      }

      if (requiredOnboardingPath && currentPath !== requiredOnboardingPath) {
        navigate(requiredOnboardingPath);
        return;
      }
    }

    // Handle CGUV Modal display
    if (profile.is_banned) {
      setShowCguvModal(false);
    } else {
      const cguvAccepted = profile.cguv_accepted_at;
      const cguvVersion = profile.cguv_version;
      if ((!cguvAccepted || cguvVersion !== CURRENT_CGUV_VERSION) && profile.onboarding_status !== 'estimation_sent' && profile.onboarding_status !== 'estimation_validated') {
        setShowCguvModal(true);
      } else {
        setShowCguvModal(false);
      }
    }
  }, [session, profile, loading, location.pathname, navigate]);

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