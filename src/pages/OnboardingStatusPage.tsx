import React, { useCallback, useEffect, useState } from 'react';
import { useSession } from '@/components/SessionContextProvider';
import { getProfile, updateProfile, OnboardingStatus } from '@/lib/profile-api';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { CheckCircle, Circle, Loader2, Rocket, KeyRound, LogOut } from 'lucide-react';
import { Link } from 'react-router-dom';
import CGUVModal from '@/components/CGUVModal';
import { CURRENT_CGUV_VERSION } from '@/lib/constants';
import OnboardingVisualProgress from '@/components/OnboardingVisualProgress'; // Import the new component
import { supabase } from '@/integrations/supabase/client';

const statusSteps: { status: OnboardingStatus; title: string; description: string; action?: string }[] = [
  { status: 'estimation_sent', title: 'Estimation envoyée', description: 'Nous vous avons envoyé une estimation de revenus. Veuillez la consulter et la valider.' },
  { status: 'estimation_validated', title: 'Validation de l\'estimation', description: 'Vous avez validé l\'estimation. Prochaine étape : accepter nos conditions générales.', action: 'Valider mon estimation' },
  { status: 'cguv_accepted', title: 'Acceptation des CGUV', description: 'Merci ! Veuillez maintenant choisir comment nous faire parvenir les clés.' },
  { status: 'keys_pending_reception', title: 'En attente réception clés', description: 'Nous attendons de recevoir vos clés. Un membre de notre équipe confirmera la réception prochainement.' },
  { status: 'keys_retrieved', title: 'Clés récupérées', description: 'Nos équipes ont bien reçu les clés de votre logement.' },
  { status: 'photoshoot_done', title: 'Shooting photo', description: 'Les photos professionnelles de votre bien ont été réalisées.' },
  { status: 'live', title: 'Mise en ligne terminée !', description: 'Félicitations, votre logement est maintenant en ligne et prêt à accueillir des voyageurs.' },
];

const OnboardingStatusPage: React.FC = () => {
  const { profile: sessionProfile, loading: sessionLoading } = useSession();
  const [profile, setProfile] = useState(sessionProfile);
  const [loading, setLoading] = useState(true);
  const [isCguvModalOpen, setIsCguvModalOpen] = useState(false);
  const [isSubmittingChoice, setIsSubmittingChoice] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const fetchProfileData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getProfile();
      setProfile(data);
    } catch (error: any) {
      toast.error(`Erreur de chargement: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (sessionProfile) {
      setProfile(sessionProfile);
      setLoading(false);
    } else if (!sessionLoading) {
      fetchProfileData();
    }
  }, [sessionProfile, sessionLoading, fetchProfileData]);

  const handleValidateEstimation = async () => {
    setLoading(true);
    try {
      await updateProfile({ onboarding_status: 'estimation_validated' });
      toast.success("Estimation validée !");
      fetchProfileData();
      // Automatically open CGUV modal after validation
      setIsCguvModalOpen(true);
    } catch (error: any) {
      toast.error(`Erreur: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptCguv = async () => {
    setLoading(true);
    try {
      await updateProfile({
        cguv_accepted_at: new Date().toISOString(),
        cguv_version: CURRENT_CGUV_VERSION,
        onboarding_status: 'cguv_accepted',
      });
      toast.success("CGUV acceptées !");
      setIsCguvModalOpen(false);
      fetchProfileData();
    } catch (error: any) {
      toast.error(`Erreur: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyChoice = async (method: 'deposit' | 'mail') => {
    setIsSubmittingChoice(true);
    try {
      await updateProfile({
        onboarding_status: 'keys_pending_reception',
        key_delivery_method: method,
      });
      toast.success("Votre choix a été enregistré !");
      fetchProfileData(); // Refresh profile to show the new status
    } catch (error: any) {
      toast.error(`Erreur: ${error.message}`);
    } finally {
      setIsSubmittingChoice(false);
    }
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    await supabase.auth.signOut();
    toast.success('Vous avez été déconnecté.');
    setIsLoggingOut(false);
    // La redirection vers /login est gérée par SessionContextProvider
  };

  if (loading || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
        <div className="w-full max-w-4xl space-y-8">
          <Skeleton className="h-12 w-1/2 mx-auto" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (profile.onboarding_status === 'live') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4 text-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <Rocket className="h-12 w-12 mx-auto text-green-500" />
            <CardTitle className="text-xl mt-2">Félicitations, {profile.first_name} !</CardTitle>
            <CardDescription>Votre logement est en ligne et prêt à accueillir des voyageurs.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link to="/">
              <Button size="lg" className="w-full">Découvrir mon tableau de bord</Button>
            </Link>
            <Button
              variant="outline"
              className="w-full mt-3"
              onClick={handleLogout}
              disabled={isLoggingOut}
            >
              {isLoggingOut ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <LogOut className="mr-2 h-4 w-4" />}
              Se déconnecter
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentStatusIndex = statusSteps.findIndex(step => step.status === profile.onboarding_status);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-6 estimation-background-effect">
      <div className="max-w-5xl mx-auto py-8">
        <header className="text-center mb-8 pb-6 border-b border-gray-200 dark:border-gray-700">
          <img src="/logo.png" alt="Hello Keys Logo" className="h-12 mx-auto mb-4" />
          <h1 className="text-3xl font-extrabold text-gray-800 dark:text-gray-100 mb-1">Bienvenue, {profile.first_name} !</h1>
          <p className="text-base text-gray-600 dark:text-gray-400">Suivez les étapes de notre collaboration pour mettre en ligne votre logement.</p>
          <div className="mt-4 flex justify-center">
            <Button
              variant="outline"
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="text-sm"
            >
              {isLoggingOut ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <LogOut className="mr-2 h-4 w-4" />}
              Se déconnecter
            </Button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="text-xl">Suivi de votre intégration</CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="space-y-4">
                  {statusSteps.map((step, index) => (
                    <li
                      key={step.status}
                      className={`flex items-start gap-3 p-3 rounded-lg transition-all duration-300
                        ${index <= currentStatusIndex
                          ? 'bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800'
                          : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:shadow-md'
                        }
                      `}
                    >
                      <div className="flex flex-col items-center">
                        {index <= currentStatusIndex ? (
                          <CheckCircle className="h-6 w-6 text-blue-600 flex-shrink-0" />
                        ) : (
                          <Circle className="h-6 w-6 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                        )}
                        {index < statusSteps.length - 1 && (
                          <div className={`w-0.5 h-10 mt-2 ${index < currentStatusIndex ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'}`}></div>
                        )}
                      </div>
                      <div>
                        <h3 className={`font-semibold text-base ${index <= currentStatusIndex ? 'text-gray-800 dark:text-gray-100' : 'text-gray-600 dark:text-gray-300'}`}>{step.title}</h3>
                        <p className="text-sm text-gray-700 dark:text-gray-300 mt-0.5">{step.description}</p>
                        {profile.onboarding_status === 'estimation_sent' && step.status === 'estimation_validated' && (
                          <Button onClick={handleValidateEstimation} disabled={loading} className="mt-2 text-sm">
                            {loading ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : 'Valider mon estimation'}
                          </Button>
                        )}
                        {profile.onboarding_status === 'estimation_validated' && step.status === 'cguv_accepted' && (
                          <Button onClick={() => setIsCguvModalOpen(true)} className="mt-2 text-sm">
                            Lire et accepter les CGUV
                          </Button>
                        )}
                      </div>
                    </li>
                  ))}
                </ol>
                
                {profile.onboarding_status === 'cguv_accepted' && (
                  <div className="mt-8 pt-5 border-t border-gray-200 dark:border-gray-700">
                    <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                      <KeyRound className="h-6 w-6 text-blue-600" /> Remise des clés
                    </h3>
                    <p className="text-base text-muted-foreground mb-5">
                      Nous avons besoin de <strong>2 jeux de clés complets</strong> pour assurer la gestion de votre logement.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="p-5 border rounded-lg flex flex-col bg-white dark:bg-gray-800 shadow-md hover:shadow-lg transition-shadow duration-300">
                        <h4 className="font-semibold text-lg mb-2">1. Déposer en agence</h4>
                        <p className="text-sm text-muted-foreground flex-grow mb-3">
                          Vous pouvez déposer vos clés directement à notre agence.
                          <br />
                          <strong>Adresse :</strong> 14 rue Carnot, 80550 LE CROTOY
                        </p>
                        <Button onClick={() => handleKeyChoice('deposit')} disabled={isSubmittingChoice} className="mt-auto w-full text-sm">
                          {isSubmittingChoice ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : "Je choisis le dépôt"}
                        </Button>
                      </div>
                      <div className="p-5 border rounded-lg flex flex-col bg-white dark:bg-gray-800 shadow-md hover:shadow-lg transition-shadow duration-300">
                        <h4 className="font-semibold text-lg mb-2">2. Envoyer par courrier</h4>
                        <p className="text-sm text-muted-foreground flex-grow mb-3">
                          Envoyez vos clés en courrier suivi à l'adresse ci-dessous.
                          <br />
                          <strong>Adresse :</strong> 14 rue Carnot, 80550 LE CROTOY
                        </p>
                        <Button onClick={() => handleKeyChoice('mail')} disabled={isSubmittingChoice} className="mt-auto w-full text-sm">
                          {isSubmittingChoice ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : "Je choisis l'envoi"}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div>
            {/* New Card for visual progress */}
            <Card className="shadow-lg mb-6">
              <CardHeader>
                <CardTitle className="text-xl">Progression de votre logement</CardTitle>
              </CardHeader>
              <CardContent>
                <OnboardingVisualProgress currentStatusIndex={currentStatusIndex} />
              </CardContent>
            </Card>

            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="text-xl">Votre estimation personnalisée</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div>
                  <h4 className="font-semibold text-gray-700 dark:text-gray-200 text-base">Revenu annuel estimé</h4>
                  <p className="text-3xl font-extrabold text-blue-600 mt-1">
                    {profile.estimated_revenue ? `${profile.estimated_revenue.toLocaleString('fr-FR')} €` : 'N/A'}
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-700 dark:text-gray-200 text-base">Détails et remarques</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap mt-0.5">
                    {profile.estimation_details || "Aucun détail fourni."}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      <CGUVModal
        isOpen={isCguvModalOpen}
        onOpenChange={setIsCguvModalOpen}
        onAccept={handleAcceptCguv}
      />
    </div>
  );
};

export default OnboardingStatusPage;