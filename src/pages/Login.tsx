import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import MagicLoginButton from '@/components/MagicLoginButton';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";

// Zod schemas for validation
const emailSchema = z.object({
  email: z.string().email({ message: "Email invalide." }),
  password: z.string().min(6, { message: "Le mot de passe doit contenir au moins 6 caractères." }),
});

const phoneSchema = z.object({
  phone: z.string().regex(/^\d{10,15}$/, { message: "Numéro de téléphone invalide. Utilisez le format international sans le '+' (ex: 33612345678)." }),
  otp: z.string().optional(),
});

type EmailFormValues = z.infer<typeof emailSchema>;
type PhoneFormValues = z.infer<typeof phoneSchema>;

const Login = () => {
  const navigate = useNavigate();
  const [authMethod, setAuthMethod] = useState<'email' | 'phone'>('email');
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [loading, setLoading] = useState(false);

  const form = useForm<EmailFormValues | PhoneFormValues>({
    resolver: zodResolver(authMethod === 'email' ? emailSchema : phoneSchema),
    defaultValues: {
      email: '',
      password: '',
      phone: '',
      otp: '',
    },
  });

  useEffect(() => {
    form.reset();
    setShowOtpInput(false);
  }, [authMethod, form]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        navigate('/');
      }
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleAuthMethodChange = (checked: boolean) => {
    setAuthMethod(checked ? 'phone' : 'email');
  };

  const handlePhoneSubmit = async (values: PhoneFormValues) => {
    setLoading(true);
    try {
      if (!showOtpInput) {
        // Step 1: Send OTP
        const { error } = await supabase.functions.invoke('custom-sms-auth', {
          body: { action: 'send', phone: values.phone },
        });
        if (error) throw new Error(error.message);
        setShowOtpInput(true);
        toast.success("Code de vérification envoyé !");
      } else {
        // Step 2: Verify OTP and get magic link
        if (!values.otp || values.otp.length !== 6) {
          throw new Error("Le code de vérification doit contenir 6 chiffres.");
        }
        const { data, error } = await supabase.functions.invoke('custom-sms-auth', {
          body: { action: 'verify', phone: values.phone, otp: values.otp },
        });
        if (error) throw new Error(error.message);
        if (data.action_link) {
          toast.success("Vérification réussie ! Connexion en cours...");
          // Redirect to the magic link to complete authentication
          window.location.href = data.action_link;
        } else {
          throw new Error("Le lien de connexion n'a pas pu être généré.");
        }
      }
    } catch (error: any) {
      const errorMessage = error.message || "Une erreur est survenue.";
      toast.error(`Erreur: ${errorMessage}`);
      console.error("Phone auth error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSubmit = async (values: EmailFormValues) => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password,
      });
      if (error) throw error;
      toast.success("Connexion réussie !");
    } catch (error: any) {
      toast.error(`Erreur: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = (values: EmailFormValues | PhoneFormValues) => {
    if (authMethod === 'phone') {
      handlePhoneSubmit(values as PhoneFormValues);
    } else {
      handleEmailSubmit(values as EmailFormValues);
    }
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

          <div className="flex items-center justify-between space-x-2 mb-6">
            <Label htmlFor="auth-method-switch" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Utiliser mon email
            </Label>
            <Switch
              id="auth-method-switch"
              checked={authMethod === 'phone'}
              onCheckedChange={handleAuthMethodChange}
              disabled={loading}
            />
            <Label htmlFor="auth-method-switch" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Utiliser mon numéro
            </Label>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {authMethod === 'email' ? (
                <>
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
                </>
              ) : (
                <>
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Numéro de téléphone</FormLabel>
                        <FormControl>
                          <Input placeholder="33612345678" {...field} disabled={loading || showOtpInput} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {showOtpInput && (
                    <FormField
                      control={form.control}
                      name="otp"
                      render={({ field }) => (
                        <FormItem className="flex flex-col items-center">
                          <FormLabel>Code de vérification</FormLabel>
                          <FormControl>
                            <InputOTP maxLength={6} {...field}>
                              <InputOTPGroup>
                                <InputOTPSlot index={0} />
                                <InputOTPSlot index={1} />
                                <InputOTPSlot index={2} />
                                <InputOTPSlot index={3} />
                                <InputOTPSlot index={4} />
                                <InputOTPSlot index={5} />
                              </InputOTPGroup>
                            </InputOTP>
                          </FormControl>
                          <FormDescription>
                            Entrez le code à 6 chiffres reçu par SMS.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? (showOtpInput ? 'Vérification...' : 'Envoi du code...') : (showOtpInput ? 'Vérifier et se connecter' : 'Envoyer le code')}
                  </Button>
                </>
              )}
            </form>
          </Form>
          <MagicLoginButton />
        </div>
      </div>

      <div className="hidden md:flex w-full md:w-1/2 bg-blue-800 dark:bg-blue-950 items-center justify-center p-8">
        <div className="text-center text-white space-y-6">
          <div className="w-full max-w-md mx-auto h-64 bg-blue-700 dark:bg-blue-800 rounded-lg flex items-center justify-center text-xl font-bold">
            Illustration Placeholder
          </div>
          <h2 className="text-3xl font-bold">Suivez vos réservations en temps réel.</h2>
          <p className="text-lg text-blue-100">
            Consultez et gérez facilement toutes vos réservations depuis un seul et même espace.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;