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

  const fetchSessionAndProfile = useCallback(async (currentSession: Session | null) => {
    setSession(currentSession);
    if (currentSession) {
      try {
        const userProfile = await getProfile();
        setProfile(userProfile);
        if (userProfile?.is_banned) {
          console.warn("User is banned. Limited access.");
        }
        if (userProfile) {
          updateUserLastSeen();
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
        setProfile(null);
      }
    } else {
      setProfile(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log(`Auth event: ${event}`);
      
      if (event === 'SIGNED_IN') {
        await fetchSessionAndProfile(session);
        
        // Check for referral code after sign-in
        const referralCode = localStorage.getItem('referral_code');
        if (referralCode && session) {
          try {
            await supabase.functions.invoke('process-referral', {
              body: { referral_code: referralCode },
            });
            // Remove the code after processing to prevent re-use
            localStorage.removeItem('referral_code');
          } catch (error) {
            console.error('Erreur lors du traitement du parrainage:', error);
            // We can decide to show a toast here, but it might be confusing for the new user.
            // For now, just log it.
            localStorage.removeItem('referral_code'); // Also remove on error
          }
        }
      } else if (event === 'SIGNED_OUT') {
        await fetchSessionAndProfile(null);
        navigate('/login');
      } else if (event === 'INITIAL_SESSION') {
        await fetchSessionAndProfile(session);
      } else if (event === 'USER_UPDATED') {
        await fetchSessionAndProfile(session);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchSessionAndProfile, navigate]);

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