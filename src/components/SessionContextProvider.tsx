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
import { callGSheetProxy } from '@/lib/gsheets'; // Import the gsheet proxy function

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
      let userProfile = await getProfile();
      console.log("User profile fetched:", userProfile);

      // New logic: Check for Pennylane Customer ID and fetch if missing
      if (userProfile && !userProfile.pennylane_customer_id) {
        console.log("Pennylane Customer ID is missing. Fetching from Google Sheet...");
        try {
          const sheetData = await callGSheetProxy({ action: 'read_sheet', range: 'BT2' });
          if (sheetData && sheetData[0] && sheetData[0][0]) {
            const pennylaneId = sheetData[0][0];
            console.log(`Found Pennylane Customer ID in GSheet: ${pennylaneId}`);
            
            const updatedProfile = await updateProfile({ pennylane_customer_id: pennylaneId });
            console.log("Profile updated with Pennylane ID:", updatedProfile);
            
            userProfile = updatedProfile; // Use the updated profile for the rest of the session
          } else {
            console.warn("Could not find Pennylane Customer ID in Google Sheet at cell BT2.");
          }
        } catch (gsheetError: any) {
          console.error("Error fetching Pennylane ID from Google Sheet:", gsheetError.message);
          toast.warning("Impossible de récupérer l'ID client Pennylane depuis Google Sheets. Vous pouvez le configurer manuellement dans votre profil.");
        }
      }

      setProfile(userProfile);
      return userProfile;
    } catch (error) {
      console.error("Error fetching user profile in SessionContextProvider:", error);
      toast.error("Erreur lors du chargement de votre profil.");
      return null;
    }
  }, []);

  // This function will handle the core logic of checking session and profile
  const revalidateSessionAndProfile = useCallback(async (currentSession: Session | null) => {
    setLoading(true); // Start loading
    if (currentSession) {
      setSession(currentSession);
      const userProfile = await fetchUserProfile(currentSession);

      if (location.pathname === '/login') {
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
      } else if (!userProfile && location.pathname !== '/login') {
        // If session exists but profile couldn't be fetched, or is null,
        // it might indicate a problem or a new user without a profile entry yet.
        // For now, we'll assume it's a new user or an error and keep them on login or redirect.
        // If a profile is mandatory for all pages, they should be redirected.
        // Given the current flow, if profile is null, it might be a new user who needs to accept CGUV.
        // The CGUV modal logic already handles this.
        console.log("Session exists but profile not found or error fetching. Checking CGUV status.");
        // The CGUV modal will be shown if profile is null or CGUV not accepted.
        // No explicit redirect here, let the CGUV modal handle it.
      }
    } else {
      // No session
      setSession(null);
      setProfile(null);
      setShowCguvModal(false);
      setShowOnboardingConfetti(false);
      if (location.pathname !== '/login') {
        console.log('No session and not on login page, redirecting to /login');
        navigate('/login');
      }
    }
    setLoading(false); // End loading
  }, [fetchUserProfile, location.pathname, navigate]);


  useEffect(() => {
    console.log("SessionContextProvider useEffect running.");
    let isMounted = true;

    // Supabase auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, currentSession) => {
      if (!isMounted) return;
      console.log('Auth state changed:', event, currentSession);
      // When auth state changes, revalidate everything
      revalidateSessionAndProfile(currentSession);
    });

    // Initial session check on mount
    supabase.auth.getSession().then(async ({ data: { session: initialSession } }) => {
      if (!isMounted) return;
      console.log("Initial getSession result:", initialSession);
      revalidateSessionAndProfile(initialSession);
    });

    // Handle tab visibility change (alt-tab scenario)
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