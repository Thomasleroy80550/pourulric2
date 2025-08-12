import React, { useCallback, useEffect, useState } from 'react';
import { useSession } from '@/components/SessionContextProvider';
import { getProfile, updateProfile, OnboardingStatus } from '@/lib/profile-api';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { CheckCircle, Circle, Loader2, Rocket, KeyRound } from 'lucide-react';
import { Link } from 'react-router-dom';
import CGUVModal from '@/components/CGUVModal';
import { CURRENT_CGUV_VERSION } from '@/lib/constants';

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
            <Rocket className="h-16 w-16 mx-auto text-green-500" />
            <CardTitle className="text-2xl mt-4">Félicitations, {profile.first_name} !</CardTitle>
            <CardDescription>Votre logement est en ligne et prêt à accueillir des voyageurs.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link to="/">
              <Button size="lg" className="w-full">Découvrir mon tableau de bord</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentStatusIndex = statusSteps.findIndex(step => step.status === profile.onboarding_status);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-8 estimation-background-effect">
      <div className="max-w-5xl mx-auto">
        <header className="text-center mb-12">
          <img src="/logo.png" alt="Hello Keys Logo" className="h-12 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">Bienvenue, {profile.first_name} !</h1>
          <p className="text-gray-600 dark:text-gray-400">Suivez les étapes de notre collaboration pour mettre en ligne votre logement.</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Suivi de votre intégration</CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="space-y-4">
                  {statusSteps.map((step, index) => (
                    <li key={step.status} className="flex items-start gap-4">
                      <div className="flex flex-col items-center">
                        {index <= currentStatusIndex ? (
                          <CheckCircle className="h-6 w-6 text-blue-600" />
                        ) : (
                          <Circle className="h-6 w-6 text-gray-300 dark:text-gray-600" />
                        )}
                        {index < statusSteps.length - 1 && (
                          <div className={`w-px h-12 mt-2 ${index < currentStatusIndex ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'}`}></div>
                        )}
                      </div>
                      <div>
                        <h3 className={`font-semibold ${index <= currentStatusIndex ? 'text-gray-800 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400'}`}>{step.title}</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-300">{step.description}</p>
                        {profile.onboarding_status === 'estimation_sent' && step.status === 'estimation_validated' && (
                          <Button onClick={handleValidateEstimation} disabled={loading} className="mt-2">
                            {loading ? <Loader2 className="animate-spin" /> : 'Valider mon estimation'}
                          </Button>
                        )}
                        {profile.onboarding_status === 'estimation_validated' && step.status === 'cguv_accepted' && (
                          <Button onClick={() => setIsCguvModalOpen(true)} className="mt-2">
                            Lire et accepter les CGUV
                          </Button>
                        )}
                      </div>
                    </li>
                  ))}
                </ol>
                
                {profile.onboarding_status === 'cguv_accepted' && (
                  <div className="mt-8 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                      <KeyRound className="h-6 w-6 text-blue-600" /> Remise des clés
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Nous avons besoin de <strong>2 jeux de clés complets</strong> pour assurer la gestion de votre logement.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="p-4 border rounded-lg flex flex-col">
                        <h4 className="font-semibold text-lg mb-2">1. Déposer en agence</h4>
                        <p className="text-sm text-muted-foreground flex-grow">
                          Vous pouvez déposer vos clés directement à notre agence.
                          <br />
                          <strong>Adresse :</strong> 14 rue Carnot, 80550 LE CROTOY
                        </p>
                        <Button onClick={() => handleKeyChoice('deposit')} disabled={isSubmittingChoice} className="mt-4 w-full">
                          {isSubmittingChoice ? <Loader2 className="animate-spin" /> : "Je choisis le dépôt"}
                        </Button>
                      </div>
                      <div className="p-4 border rounded-lg flex flex-col">
                        <h4 className="font-semibold text-lg mb-2">2. Envoyer par courrier</h4>
                        <p className="text-sm text-muted-foreground flex-grow">
                          Envoyez vos clés en courrier suivi à l'adresse ci-dessous.
                          <br />
                          <strong>Adresse :</strong> 14 rue Carnot, 80550 LE CROTOY
                        </p>
                        <Button onClick={() => handleKeyChoice('mail')} disabled={isSubmittingChoice} className="mt-4 w-full">
                          {isSubmittingChoice ? <Loader2 className="animate-spin" /> : "Je choisis l'envoi"}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {profile.onboarding_status === 'keys_retrieved' && (
                  <div className="mt-8 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                      <KeyRound className="h-6 w-6 text-blue-600" /> Informations sur les clés
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-semibold text-gray-700 dark:text-gray-200">Adresse de dépôt/envoi des clés</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {profile.key_deposit_address || "Non spécifié. Veuillez contacter l'agence."}
                        </p>
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-700 dark:text-gray-200">Jeux de clés nécessaires</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {profile.key_sets_needed ? `${profile.key_sets_needed} jeux complets` : "Non spécifié."}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div>
            <Card>
              <CardHeader>
                <CardTitle>Votre estimation personnalisée</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold text-gray-700 dark:text-gray-200">Revenu annuel estimé</h4>
                  <p className="text-2xl font-bold text-blue-600">
                    {profile.estimated_revenue ? `${profile.estimated_revenue.toLocaleString('fr-FR')} €` : 'N/A'}
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-700 dark:text-gray-200">Détails et remarques</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
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