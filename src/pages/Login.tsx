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
import { Home, Mail, Lock, Eye, EyeOff, Loader2, CalendarRange, Sparkles, BarChart3, KeyRound, ShieldCheck } from 'lucide-react';
import MigrationHelpDialog from '@/components/MigrationHelpDialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
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
      <div className="w-full md:w-[92vw] lg:w-[88vw] max-w-7xl bg-white rounded-[48px] shadow-none overflow-hidden min-h-[720px]">
        <div className="grid grid-cols-1 md:grid-cols-2">
          {/* Colonne gauche: cadre photo avec padding blanc interne */}
          <div className="p-10 md:p-14 bg-gray-50 flex items-center">
            <div className="w-full">
              <div className="rounded-[40px] bg-transparent p-0 shadow-none">
                <div className="rounded-[32px] overflow-hidden">
                  <div className="relative h-[520px] md:h-[640px] w-full bg-gradient-to-br from-[#175e82e6] to-[#175e82b3]">
                    {/* Effet brume pour donner de la profondeur (classes déjà définies dans globals.css) */}
                    <div className="fog-layer"></div>
                    <div className="fog-layer fog-layer-2"></div>

                    <div className="absolute inset-0 p-8 md:p-14 pb-20 flex flex-col items-start justify-center text-left text-white gap-3 relative z-[2]">
                      <h2 className="text-4xl md:text-5xl font-extrabold leading-tight tracking-tight">
                        Simplifiez la gestion
                        <br /><span className="text-white">avec notre dashboard.</span>
                      </h2>
                      {/* Illustration maison (immobilier), minimaliste */}
                      <div className="mt-4 flex items-center gap-3">
                        <span className="inline-flex items-center justify-center h-12 w-12 rounded-xl bg-white/20">
                          <Home className="h-7 w-7 text-white" />
                        </span>
                        <div className="h-1 w-24 md:w-32 rounded-full bg-white/40" />
                      </div>

                      {/* Chips de fonctionnalités pour remplir l'espace de manière utile */}
                      <div className="mt-6 grid grid-cols-2 gap-3 w-full max-w-md">
                        <div className="flex items-center gap-2 rounded-xl bg-white/10 border border-white/30 px-3 py-2">
                          <CalendarRange className="h-4 w-4 text-white/90" />
                          <span className="text-xs font-medium text-white/95">Réservations</span>
                        </div>
                        <div className="flex items-center gap-2 rounded-xl bg-white/10 border border-white/30 px-3 py-2">
                          <Sparkles className="h-4 w-4 text-white/90" />
                          <span className="text-xs font-medium text-white/95">Ménage</span>
                        </div>
                        <div className="flex items-center gap-2 rounded-xl bg-white/10 border border-white/30 px-3 py-2">
                          <BarChart3 className="h-4 w-4 text-white/90" />
                          <span className="text-xs font-medium text-white/95">Finances</span>
                        </div>
                        <div className="flex items-center gap-2 rounded-xl bg-white/10 border border-white/30 px-3 py-2">
                          <KeyRound className="h-4 w-4 text-white/90" />
                          <span className="text-xs font-medium text-white/95">Accès</span>
                        </div>
                      </div>

                      {/* Petit bandeau de confiance */}
                      <div className="mt-4 inline-flex items-center gap-2">
                        <Badge variant="outline" className="bg-white/10 border-white/30 text-white/90">
                          <ShieldCheck className="h-3.5 w-3.5 mr-1" />
                          Sécurisé et RGPD
                        </Badge>
                      </div>
                    </div>

                    {/* Mini carte stats en bas à gauche pour occuper la zone basse */}
                    <div className="absolute bottom-6 left-6 z-[2] w-64">
                      <Card className="bg-white/15 backdrop-blur-md border border-white/30 text-white shadow-lg">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="text-[11px] text-white/80">Taux d'occupation</div>
                              <div className="text-lg font-semibold">82%</div>
                            </div>
                            <div className="text-right">
                              <div className="text-[11px] text-white/80">Ménage du jour</div>
                              <div className="text-lg font-semibold">5 tâches</div>
                            </div>
                          </div>
                          <div className="mt-3 flex items-center gap-1 h-12">
                            <div className="w-2 bg-white/80 h-5 rounded-sm" />
                            <div className="w-2 bg-white/80 h-8 rounded-sm" />
                            <div className="w-2 bg-white/80 h-6 rounded-sm" />
                            <div className="w-2 bg-white/80 h-10 rounded-sm" />
                            <div className="w-2 bg-white/80 h-4 rounded-sm" />
                            <div className="w-2 bg-white/80 h-9 rounded-sm" />
                            <div className="w-2 bg-white/80 h-7 rounded-sm" />
                          </div>
                          <div className="mt-1 text-[10px] text-white/70">Derniers 7 jours</div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Vague ancrée tout en bas du bloc dégradé, sous le contenu */}
                    <div className="absolute bottom-0 left-0 right-0 z-[1] pointer-events-none select-none">
                      <svg className="w-full h-16 md:h-24" viewBox="0 0 1440 160" preserveAspectRatio="none" aria-hidden="true">
                        <path d="M0,120 C240,160 480,80 720,120 C960,160 1200,80 1440,120 L1440,160 L0,160 Z" fill="rgba(255,255,255,0.18)"/>
                        <path d="M0,100 C240,140 480,60 720,100 C960,140 1200,60 1440,100 L1440,160 L0,160 Z" fill="rgba(255,255,255,0.28)"/>
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Colonne droite: formulaire modernisé */}
          <div className="p-10 md:p-14">
            {/* Logo Hello Keys en haut */}
            <div className="mb-8 flex items-center justify-between">
              <img src="/logo.png" alt="Hello Keys" className="h-12 w-auto" />
              <button
                type="button"
                onClick={() => setIsMigrationHelpDialogOpen(true)}
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                Besoin d'aide pour migrer ?
              </button>
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
                      <FormLabel className="text-sm text-gray-700">Adresse e-mail</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <span className="absolute inset-y-0 left-4 flex items-center">
                            <Mail className="h-5 w-5 text-[#175e82b3]" />
                          </span>
                          <Input
                            placeholder="vous@exemple.com"
                            {...field}
                            disabled={loading}
                            className="h-14 md:h-16 rounded-2xl bg-[#175e821a] pl-12 pr-4 py-0 text-[#0A2540] placeholder:text-[#175e82b3] border-0 outline-none ring-0 ring-offset-0 focus:outline-none focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 focus:border-0 focus:bg-[#175e821a] leading-[56px] md:leading-[64px]"
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
                            placeholder="Votre mot de passe"
                            {...field}
                            disabled={loading}
                            className="h-14 md:h-16 rounded-2xl bg-[#175e821a] pl-12 pr-12 py-0 text-[#0A2540] placeholder:text-[#175e82b3] border-0 outline-none ring-0 ring-offset-0 focus:outline-none focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 focus:border-0 focus:bg-[#175e821a] leading-[56px] md:leading-[64px]"
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
                      Connexion en cours...
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
                  className="w-full text-sm text-gray-600 mt-2"
                  onClick={handleMagicLink}
                  disabled={loading}
                >
                  Ou utilisez un lien magique
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
                <div className="flex items-center gap-3 text-[10px] text-gray-600">
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