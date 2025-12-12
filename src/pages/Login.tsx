import React, { useState, useEffect } from 'react';
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
import { getServiceStatuses, ServiceStatus, ServiceStatusValue } from "@/lib/status-api";

const emailSchema = zod.object({
  email: zod.string().email({ message: 'Email invalide.' }),
  password: zod.string().min(6, { message: 'Le mot de passe doit contenir au moins 6 caractères.' }),
});

type EmailFormValues = zod.infer<typeof emailSchema>;

const Login = () => {
  const [loading, setLoading] = useState(false);
  const [isMigrationHelpDialogOpen, setIsMigrationHelpDialogOpen] = useState(false);
  const [serviceStatuses, setServiceStatuses] = useState<ServiceStatus[]>([]);
  const [statusesLoading, setStatusesLoading] = useState<boolean>(false);

  const form = useForm<EmailFormValues>({
    resolver: zodResolver(emailSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  useEffect(() => {
    setStatusesLoading(true);
    getServiceStatuses()
      .then((data) => setServiceStatuses(data))
      .finally(() => setStatusesLoading(false));
  }, []);

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
              <div className="rounded-[40px] bg-transparent p-0 shadow-none">
                <div className="rounded-[32px] overflow-hidden">
                  <div className="relative h-[520px] md:h-[640px] w-full bg-gradient-to-br from-[#175e82e6] to-[#175e82b3]">
                    <div className="absolute inset-0 pointer-events-none select-none" />
                    <div className="absolute inset-0 p-8 md:p-14 flex flex-col items-start justify-center text-left text-white gap-3">
                      <h2 className="text-4xl md:text-5xl font-extrabold leading-tight tracking-tight">
                        Simplifiez la gestion
                        <br /><span className="text-white">avec notre dashboard.</span>
                      </h2>
                      <div className="mt-3">
                        <div className="h-2 w-52 md:w-72 rounded-full bg-gradient-to-r from-white/80 to-white/30 shadow-[0_6px_24px_rgba(255,255,255,0.25)]"></div>
                      </div>
                      <p className="mt-4 text-white/90 max-w-lg">
                        Gérez vos locations via une interface moderne et intuitive.
                      </p>
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
                      <FormControl>
                        <Input
                          placeholder="Adresse e-mail"
                          {...field}
                          disabled={loading}
                          className="h-14 md:h-16 rounded-2xl bg-[#175e821a] px-5 py-0 text-[#0A2540] placeholder:text-[#175e82b3] border-0 outline-none ring-0 ring-offset-0 focus:outline-none focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 focus:border-0 focus:bg-[#175e821a] leading-[56px] md:leading-[64px]"
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
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="Mot de passe"
                          {...field}
                          disabled={loading}
                          className="h-14 md:h-16 rounded-2xl bg-[#175e821a] px-5 py-0 text-[#0A2540] placeholder:text-[#175e82b3] border-0 outline-none ring-0 ring-offset-0 focus:outline-none focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 focus:border-0 focus:bg-[#175e821a] leading-[56px] md:leading-[64px]"
                        />
                      </FormControl>
                      <div className="mt-2 flex justify-end">
                        <button
                          type="button"
                          onClick={handleForgotPassword}
                          className="text-xs text-gray-500 hover:text-gray-700"
                          disabled={loading}
                        >
                          Mot de passe oublié ?
                        </button>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full h-12 rounded-2xl bg-[#175e82e6] hover:bg-[#175e82b3] text-white"
                  disabled={loading}
                >
                  {loading ? 'Connexion en cours...' : 'Se connecter'}
                </Button>

                <div className="py-2">
                  <Separator />
                </div>
                {/* REMOVED: social login text and buttons (Google/Facebook) */}

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

            {/* REMOVED: lien d'inscription sous le formulaire */}
          </div>
        </div>
      </div>

      {/* Zone minimaliste de statuts des services (sous le contenu) */}
      <div className="mt-6 w-full">
        <div className="mx-auto max-w-6xl px-3">
          <div className="flex flex-wrap justify-center gap-2 rounded-lg border border-gray-200 bg-white/60 backdrop-blur p-2">
            {statusesLoading ? (
              <span className="text-xs text-gray-500">Chargement des statuts…</span>
            ) : serviceStatuses.length > 0 ? (
              serviceStatuses.map((s) => {
                const labelMap: Record<ServiceStatusValue, string> = {
                  operational: "Actif",
                  degraded: "Dégradé",
                  outage: "Panne",
                  maintenance: "Maintenance",
                };
                const dotClass =
                  s.status === "operational"
                    ? "bg-green-500"
                    : s.status === "outage"
                    ? "bg-red-500"
                    : s.status === "degraded"
                    ? "bg-gradient-to-r from-amber-400 to-orange-500"
                    : "bg-blue-500";
                return (
                  <span key={s.id} className="inline-flex items-center gap-2 px-2 py-1">
                    <span className={`h-2.5 w-2.5 rounded-full ${dotClass}`} />
                    <span className="text-xs text-gray-800">
                      {s.name} — {labelMap[s.status]}
                    </span>
                  </span>
                );
              })
            ) : (
              <>
                <span className="inline-flex items-center gap-2 px-2 py-1">
                  <span className="h-2.5 w-2.5 rounded-full bg-green-500" />
                  <span className="text-xs text-gray-800">Vert — Actif</span>
                </span>
                <span className="inline-flex items-center gap-2 px-2 py-1">
                  <span className="h-2.5 w-2.5 rounded-full bg-gradient-to-r from-amber-400 to-orange-500" />
                  <span className="text-xs text-gray-800">Orange — Dégradé</span>
                </span>
                <span className="inline-flex items-center gap-2 px-2 py-1">
                  <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
                  <span className="text-xs text-gray-800">Rouge — Panne</span>
                </span>
              </>
            )}
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