import React, { useState, useEffect, createContext, useContext } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Session } from '@supabase/supabase-js';
import { useNavigate, useLocation } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';
import { Skeleton } from '@/components/ui/skeleton';
import CGUVModal from './CGUVModal'; // Import the new CGUVModal
import { getProfile, updateProfile, UserProfile } from '@/lib/profile-api'; // Import getProfile and updateProfile
import { CURRENT_CGUV_VERSION } from '@/lib/constants'; // Import the CGUV version constant
import { toast } from 'sonner'; // Import toast for notifications

interface SessionContextType {
  session: Session | null;
  loading: boolean;
  profile: UserProfile | null; // Add profile to context
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export const SessionContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null); // State for user profile
  const [loading, setLoading] = useState(true);
  const [showCguvModal, setShowCguvModal] = useState(false); // State to control CGUV modal visibility
  const navigate = useNavigate();
  const location = useLocation();

  const fetchUserProfile = async (userSession: Session) => {
    try {
      const userProfile = await getProfile();
      setProfile(userProfile);
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
    } catch (error: any) {
      console.error("Error accepting CGUV:", error);
      toast.error(`Erreur lors de l'acceptation des CGUV : ${error.message}`);
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      console.log('Auth state changed:', event, currentSession);
      setSession(currentSession);
      setLoading(false);

      if (event === 'SIGNED_OUT') {
        console.log('User signed out, redirecting to /login');
        setProfile(null); // Clear profile on sign out
        setShowCguvModal(false); // Hide CGUV modal on sign out
        navigate('/login');
      } else if (currentSession) {
        const userProfile = await fetchUserProfile(currentSession);
        if (location.pathname === '/login') {
          console.log('User signed in and on login page, redirecting to /');
          navigate('/');
        }

        // Check CGUV only if user is authenticated and not on the login page
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
        navigate('/login');
      }
    });

    // Initial session check
    supabase.auth.getSession().then(async ({ data: { session: initialSession } }) => {
      setSession(initialSession);
      setLoading(false);

      if (initialSession) {
        const userProfile = await fetchUserProfile(initialSession);
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
        navigate('/login');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, location.pathname]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-100 dark:bg-gray-950">
        {/* Skeleton Header */}
        <div className="bg-white dark:bg-gray-800 p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between shadow-sm">
          <Skeleton className="h-8 w-32" />
          <div className="flex items-center space-x-4">
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-8 w-8 rounded-full" />
          </div>
        </div>
        {/* Skeleton Main Content Area */}
        <div className="flex-1 flex">
          {/* Skeleton Sidebar */}
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
          {/* Skeleton Main Content */}
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
      <Toaster /> {/* Ensure Toaster is available globally */}
      {showCguvModal && (
        <CGUVModal
          isOpen={showCguvModal}
          onOpenChange={(open) => {
            // Prevent closing if CGUV not accepted, unless it's a sign-out
            if (!open && (!profile?.cguv_accepted_at || profile?.cguv_version !== CURRENT_CGUV_VERSION)) {
              // Do nothing, keep modal open
            } else {
              setShowCguvModal(open);
            }
          }}
          onAccept={handleAcceptCguv}
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