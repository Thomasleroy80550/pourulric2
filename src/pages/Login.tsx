import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as zod from 'zod';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Home } from 'lucide-react';
import MigrationHelpDialog from '@/components/MigrationHelpDialog';

const emailSchema = zod.object({
  email: zod.string().email({ message: 'Email invalide.' }),
  password: zod.string().min(6, { message: 'Le mot de passe doit contenir au moins 6 caractères.' }),
});

type EmailFormValues = zod.infer<typeof emailSchema>;

const Login = () => {
  const [loading, setLoading] = useState(false);
  const [isMigrationHelpDialogOpen, setIsMigrationHelpDialogOpen] = useState(false);

  const form = useForm<EmailFormValues>({
    resolver: zodResolver(emailSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const handleEmailSubmit = async (values: EmailFormValues) => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password,
      });
      if (error) throw error;
      toast.success('Connexion réussie !');
      // La navigation est gérée par le SessionContextProvider via onAuthStateChange
    } catch (error: any) {
      toast.error(`Erreur: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleMagicLink = async () => {
    const email = form.getValues('email') as string;
    if (!email) {
      toast.error("Veuillez saisir votre email avant d'envoyer le lien magique.");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: false,
          // Redirection explicite vers production
          emailRedirectTo: 'https://beta.proprietaire.hellokeys.fr/login',
        },
      });
      if (error) throw error;
      toast.success('Lien magique envoyé ! Vérifiez votre email pour vous connecter.');
    } catch (error: any) {
      toast.error(`Erreur: ${error.message || "Impossible d'envoyer le lien magique."}`);
      console.error('Magic link error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    const email = form.getValues('email') as string;
    if (!email) {
      toast.error("Saisissez votre email pour réinitialiser le mot de passe.");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/login`,
      });
      if (error) throw error;
      toast.success('Email de réinitialisation envoyé.');
    } catch (error: any) {
      toast.error(`Erreur: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleOAuth = async (provider: 'google' | 'facebook') => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: window.location.origin },
      });
      if (error) throw error;
    } catch (error: any) {
      toast.error(`Erreur: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = (values: EmailFormValues) => {
    handleEmailSubmit(values);
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center px-6 py-10">
      <div className="w-full md:w-[92vw] lg:w-[88vw] max-w-7xl bg-white rounded-[48px] shadow-2xl overflow-hidden min-h-[720px]">
        <div className="grid grid-cols-1 md:grid-cols-2">
          {/* Colonne gauche: cadre photo avec padding blanc interne */}
          <div className="p-10 md:p-14 bg-gray-50 flex items-center">
            <div className="w-full">
              <div className="rounded-[40px] bg-white p-6 md:p-8 shadow-sm">
                <div className="rounded-[32px] overflow-hidden">
                  <div className="relative h-[520px] md:h-[640px] w-full bg-gradient-to-br from-[#175e82e6] to-[#175e82b3]">
                    <div className="absolute inset-0 pointer-events-none select-none" />
                    <div className="absolute inset-0 p-6 md:p-10 flex flex-col text-white">
                      <h2 className="text-3xl md:text-4xl font-extrabold leading-tight">
                        Simplifiez la gestion
                        <br /><span className="text-white">avec notre dashboard.</span>
                      </h2>
                      <p className="mt-4 text-white/90 max-w-sm">
                        Gérez vos locations via une interface moderne et intuitive.
                      </p>
                      {/* REMOVED: illustration placeholder image */}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Colonne droite: formulaire modernisé */}
          <div className="p-10 md:p-14">
            {/* Logo Hello Keys en haut */}
            <div className="mb-8">
              <img src="/logo.png" alt="Hello Keys" className="h-12 w-auto" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900">Bienvenue</h1>
            <p className="text-sm text-gray-500 mb-6">Veuillez vous connecter à votre compte</p>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email address</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="votre.email@example.com"
                          {...field}
                          disabled={loading}
                          className="h-12 rounded-2xl"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between">
                        <FormLabel>Password</FormLabel>
                        <button
                          type="button"
                          onClick={handleForgotPassword}
                          className="text-xs text-gray-500 hover:text-gray-700"
                          disabled={loading}
                        >
                          Mot de passe oublié ?
                        </button>
                      </div>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="********"
                          {...field}
                          disabled={loading}
                          className="h-12 rounded-2xl"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full h-12 rounded-2xl bg-orange-500 hover:bg-orange-600"
                  disabled={loading}
                >
                  {loading ? 'Connexion en cours...' : 'Login'}
                </Button>

                <div className="py-2">
                  <Separator />
                </div>
                <div className="text-xs text-center text-gray-500 -mt-2">Ou se connecter avec</div>

                <div className="grid grid-cols-2 gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 rounded-xl"
                    onClick={() => handleOAuth('google')}
                    disabled={loading}
                  >
                    <span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-white border">
                      <span className="text-xs font-bold text-[#EA4335]">G</span>
                    </span>
                    Google
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 rounded-xl"
                    onClick={() => handleOAuth('facebook')}
                    disabled={loading}
                  >
                    <span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#1877F2] text-white text-sm font-bold">
                      f
                    </span>
                    Facebook
                  </Button>
                </div>

                <Button
                  type="button"
                  variant="link"
                  className="w-full text-sm text-gray-600 mt-2"
                  onClick={handleMagicLink}
                  disabled={loading}
                >
                  Ou utilisez un lien magique
                </Button>
              </form>
            </Form>

            <div className="mt-4 text-center text-sm text-gray-500">
              Pas de compte ?{' '}
              <span className="font-medium text-orange-600 hover:underline cursor-pointer">
                Inscription
              </span>
            </div>
          </div>
        </div>
      </div>

      <MigrationHelpDialog
        isOpen={isMigrationHelpDialogOpen}
        onOpenChange={setIsMigrationHelpDialogOpen}
      />
    </div>
  );
};

export default Login;