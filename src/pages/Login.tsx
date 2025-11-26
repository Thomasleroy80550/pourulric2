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
          // Redirige explicitement vers /login sur le domaine courant
          emailRedirectTo: `${window.location.origin}/login`,
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

      <div className="hidden md:flex w-full md:w-1/2 items-center justify-center p-8 relative overflow-hidden aurora-background">
        <div className="absolute -top-1/2 -right-1/2 w-[800px] h-[800px] bg-blue-600/20 rounded-full filter blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-1/2 -left-1/2 w-[600px] h-[600px] bg-purple-600/20 rounded-full filter blur-3xl animate-pulse delay-1000"></div>
        <div className="text-center text-white space-y-6 relative z-10">
          <Home size={80} className="mx-auto mb-4 text-white animate-float" />
          <h2 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-white to-gray-300 drop-shadow-lg">
            La gestion locative, réinventée.
          </h2>
          <p className="text-lg text-slate-300 max-w-md mx-auto">
            Centralisez vos réservations, suivez vos finances et optimisez vos revenus avec une simplicité inégalée.
          </p>
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