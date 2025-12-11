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

  const onSubmit = (values: EmailFormValues) => {
    handleEmailSubmit(values);
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      <div className="w-full md:w-1/2 flex items-center justify-center p-8 bg-white dark:bg-gray-900">
        <div className="w-full max-w-sm space-y-8">
          <div className="flex flex-col items-start mb-6">
            <img src="/logo.png" alt="Hello Keys Logo" className="w-48 h-auto mb-6" />
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-50 mb-2">
              Connectez-vous à votre compte
            </h1>
            <p className="text-md text-gray-600 dark:text-gray-400">
              Accédez à votre espace personnel en toute simplicité.
            </p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="votre.email@example.com" {...field} disabled={loading} />
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
                    <FormLabel>Mot de passe</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="********" {...field} disabled={loading} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Connexion en cours...' : 'Se connecter'}
              </Button>
              <div className="flex items-center my-2">
                <div className="flex-1 h-px bg-muted"></div>
                <span className="mx-3 text-xs text-muted-foreground">ou</span>
                <div className="flex-1 h-px bg-muted"></div>
              </div>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={handleMagicLink}
                disabled={loading}
              >
                Se connecter avec un lien magique
              </Button>
              <p className="text-xs text-muted-foreground mt-1">
                Nous vous envoyons un lien par email pour vous connecter sans mot de passe.
              </p>
            </form>
          </Form>

          <Button
            variant="link"
            className="w-full text-sm text-gray-600 dark:text-gray-400 mt-4"
            onClick={() => setIsMigrationHelpDialogOpen(true)}
            disabled={loading}
          >
            Besoin d'aide pour la migration ?
          </Button>
        </div>
      </div>

      <div className="hidden md:flex w-full md:w-1/2 items-center justify-center relative rounded-[48px] overflow-hidden shadow-2xl bg-gradient-to-br from-blue-600/30 via-blue-500/20 to-purple-600/30 px-10 md:px-16 py-20 md:py-28">
        {/* Cadre photo à bords fortement arrondis + padding blanc interne */}
        <div className="w-full max-w-[720px]">
          <div className="rounded-[40px] bg-white p-3 md:p-4 shadow-md">
            <div className="rounded-[32px] overflow-hidden">
              <img
                src="/placeholder.svg"
                alt="Aperçu du dashboard Hello Keys"
                className="w-full h-[360px] md:h-[460px] object-cover"
              />
            </div>
          </div>

          {/* Légende sous le cadre */}
          <div className="mt-6 text-center px-4">
            <h2 className="text-3xl md:text-4xl font-bold text-[#0A2540]">
              La gestion locative, réinventée.
            </h2>
            <p className="mt-3 text-slate-600 md:text-lg">
              Une carte visuelle claire pour vos biens, réservations et finances.
            </p>
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