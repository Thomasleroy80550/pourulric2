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
import { Home, Mail, Lock, Eye, EyeOff, Loader2 } from 'lucide-react';
import LoadingOverlay from '@/components/LoadingOverlay';
import MigrationHelpDialog from '@/components/MigrationHelpDialog';
import { getServiceStatuses, ServiceStatus } from "@/lib/status-api";

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
  const [showPassword, setShowPassword] = useState(false);

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

  const onSubmit = (values: EmailFormValues) => {
    handleEmailSubmit(values);
  };

  return (
    <div className="min-h-[100svh] bg-gradient-to-b from-gray-50 via-white to-[#EAF4FF] flex items-center justify-center px-4 py-6 pt-[calc(1.5rem+env(safe-area-inset-top))] pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
      {loading && <LoadingOverlay message="Connexion en cours..." />}

      {/* Conteneur principal : style plus "app iOS" en mobile */}
      <div className="w-full max-w-md md:max-w-7xl bg-white/80 backdrop-blur-xl rounded-3xl md:rounded-[48px] shadow-lg md:shadow-none border border-white/40 overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-2">
          {/* Colonne gauche: hero (desktop uniquement) */}
          <div className="hidden md:flex p-5 sm:p-6 md:p-14 bg-gray-50/70 items-center">
            <div className="w-full">
              <div className="rounded-3xl md:rounded-[32px] overflow-hidden">
                <div className="relative h-44 sm:h-56 md:h-[640px] w-full bg-gradient-to-br from-[#175e82e6] to-[#175e82b3]">
                  {/* Effet brume léger pour donner de la profondeur */}
                  <div className="fog-layer"></div>
                  <div className="fog-layer fog-layer-2"></div>

                  <div className="absolute inset-0 p-6 md:p-14 pb-16 flex flex-col items-start justify-center text-left text-white gap-3 relative z-[2]">
                    <h2 className="text-2xl sm:text-3xl md:text-5xl font-extrabold leading-tight tracking-tight">
                      Simplifiez la gestion
                      <br />
                      <span className="text-white">avec notre dashboard.</span>
                    </h2>
                    <div className="mt-2 md:mt-4 flex items-center gap-3">
                      <span className="inline-flex items-center justify-center h-11 w-11 md:h-12 md:w-12 rounded-xl bg-white/20">
                        <Home className="h-6 w-6 md:h-7 md:w-7 text-white" />
                      </span>
                      <div className="h-1 w-20 md:w-32 rounded-full bg-white/40" />
                    </div>
                  </div>

                  {/* Vague ancrée tout en bas */}
                  <div className="absolute bottom-0 left-0 right-0 z-[1] pointer-events-none select-none">
                    <svg className="w-full h-12 md:h-24" viewBox="0 0 1440 160" preserveAspectRatio="none" aria-hidden="true">
                      <path d="M0,120 C240,160 480,80 720,120 C960,160 1200,80 1440,120 L1440,160 L0,160 Z" fill="rgba(255,255,255,0.18)" />
                      <path d="M0,100 C240,140 480,60 720,100 C960,140 1200,60 1440,100 L1440,160 L0,160 Z" fill="rgba(255,255,255,0.28)" />
                    </svg>
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* Colonne droite: formulaire modernisé */}
          <div className="p-6 sm:p-8 md:p-14">
            {/* Logo + aide */}
            <div className="mb-6 flex items-center justify-between">
              <img src="/logo.png" alt="Hello Keys" className="h-10 w-auto" />
              <button
                type="button"
                onClick={() => setIsMigrationHelpDialogOpen(true)}
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                Aide migration
              </button>
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900">Bienvenue</h1>
            <p className="text-sm text-gray-500 mb-6">Connectez-vous à votre compte</p>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm text-gray-700">Adresse e-mail</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <span className="absolute inset-y-0 left-4 flex items-center">
                            <Mail className="h-5 w-5 text-[#175e82b3]" />
                          </span>
                          <Input
                            type="email"
                            inputMode="email"
                            autoCapitalize="none"
                            autoCorrect="off"
                            placeholder="vous@exemple.com"
                            {...field}
                            disabled={loading}
                            className="h-14 md:h-16 rounded-2xl bg-[#175e821a] pl-12 pr-4 py-0 text-base text-[#0A2540] placeholder:text-[#175e82b3] border-0 outline-none ring-0 ring-offset-0 focus:outline-none focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 focus:border-0 focus:bg-[#175e821a] leading-[56px] md:leading-[64px]"
                          />
                        </div>
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
                      <FormLabel className="text-sm text-gray-700">Mot de passe</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <span className="absolute inset-y-0 left-4 flex items-center">
                            <Lock className="h-5 w-5 text-[#175e82b3]" />
                          </span>
                          <Input
                            type={showPassword ? 'text' : 'password'}
                            autoCapitalize="none"
                            autoCorrect="off"
                            placeholder="Votre mot de passe"
                            {...field}
                            disabled={loading}
                            className="h-14 md:h-16 rounded-2xl bg-[#175e821a] pl-12 pr-12 py-0 text-base text-[#0A2540] placeholder:text-[#175e82b3] border-0 outline-none ring-0 ring-offset-0 focus:outline-none focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 focus:border-0 focus:bg-[#175e821a] leading-[56px] md:leading-[64px]"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword((v) => !v)}
                            className="absolute inset-y-0 right-3 flex items-center text-[#175e82b3] hover:text-[#175e82] transition"
                            aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                            disabled={loading}
                          >
                            {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                          </button>
                        </div>
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
                  className="w-full h-12 rounded-2xl bg-[#175e82e6] hover:bg-[#175e82b3] text-white flex items-center justify-center gap-2"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Connexion…
                    </>
                  ) : (
                    'Se connecter'
                  )}
                </Button>

                <div className="py-2">
                  <Separator />
                </div>

                <Button
                  type="button"
                  variant="link"
                  className="w-full text-sm text-gray-600"
                  onClick={handleMagicLink}
                  disabled={loading}
                >
                  Utiliser un lien magique
                </Button>
              </form>
            </Form>

            <div className="mt-6">
              <div className="space-y-2">
                {/* Services sur une seule ligne, minimalistes */}
                <div className="flex flex-nowrap gap-3 overflow-x-auto">
                  {statusesLoading ? (
                    <span className="text-[11px] text-gray-500">Chargement…</span>
                  ) : (
                    serviceStatuses.map((s) => {
                      const dotClass =
                        s.status === "operational"
                          ? "bg-green-500"
                          : s.status === "outage"
                          ? "bg-red-500"
                          : s.status === "degraded"
                          ? "bg-gradient-to-r from-amber-400 to-orange-500"
                          : "bg-blue-500";
                      return (
                        <span key={s.id} className="inline-flex items-center gap-1.5 flex-shrink-0">
                          <span className={`h-2 w-2 rounded-full ${dotClass}`} />
                          <span className="text-[11px] text-gray-800">{s.name}</span>
                        </span>
                      );
                    })
                  )}
                </div>
                {/* Légende compacte */}
                <div className="flex flex-wrap items-center gap-3 text-[10px] text-gray-600">
                  <span className="inline-flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-green-500" />
                    <span>Actif</span>
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-gradient-to-r from-amber-400 to-orange-500" />
                    <span>Dégradé</span>
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-red-500" />
                    <span>Panne</span>
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-blue-500" />
                    <span>Maintenance</span>
                  </span>
                </div>
              </div>
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