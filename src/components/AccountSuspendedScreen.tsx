import React from 'react';
import { Lock, Mail, Clock, LogOut, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

const AccountSuspendedScreen: React.FC = () => {
  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div className="fixed inset-0 z-[100] flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-gray-950 via-red-950 to-gray-950 p-4">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-gray-900">
        {/* Header */}
        <div className="flex flex-col items-center bg-gradient-to-r from-red-600 to-red-700 px-6 py-8 text-center">
          <img src="/logo.png" alt="Hello Keys" className="mb-4 h-10 object-contain brightness-0 invert" />
          <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-white/15 backdrop-blur">
            <Lock className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Compte bloqué pour impayé</h1>
          <p className="mt-1 text-sm text-red-100">L'accès à votre espace est temporairement suspendu.</p>
        </div>

        {/* Body */}
        <div className="space-y-4 px-6 py-6">
          <div className="flex items-start gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800">
            <CreditCard className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
            <div>
              <p className="font-semibold text-gray-900 dark:text-gray-100">Déblocage à réception des paiements</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Votre compte sera automatiquement débloqué une fois vos paiements reçus par nos équipes.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
            <Clock className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
            <div>
              <p className="font-semibold text-red-700 dark:text-red-400">Sans action de votre part</p>
              <p className="text-sm text-red-600/90 dark:text-red-400/80">
                Vos réservations seront bloquées d'ici <strong>15 jours</strong>. Merci de régulariser votre situation au plus vite.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800">
            <Mail className="mt-0.5 h-5 w-5 shrink-0 text-gray-500" />
            <div>
              <p className="font-semibold text-gray-900 dark:text-gray-100">Une question ? Un paiement déjà effectué ?</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Contactez-nous à{' '}
                <a href="mailto:contact@hellokeys.fr" className="font-medium text-red-600 hover:underline">
                  contact@hellokeys.fr
                </a>{' '}
                et nous débloquerons votre compte dès vérification.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-100 px-6 py-4 dark:border-gray-800">
          <Button variant="outline" className="w-full" onClick={handleSignOut}>
            <LogOut className="mr-2 h-4 w-4" />
            Se déconnecter
          </Button>
        </div>
      </div>

      <p className="mt-6 text-center text-xs text-gray-400">
        Hello Keys — Gestion de locations saisonnières
      </p>
    </div>
  );
};

export default AccountSuspendedScreen;
