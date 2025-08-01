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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Zod schemas for validation
const emailSchema = z.object({
  email: z.string().email({ message: "Email invalide." }),
  password: z.string().min(6, { message: "Le mot de passe doit contenir au moins 6 caractères." }),
});

const phoneSchema = z.object({
  countryCode: z.string().min(1, "Indicatif requis."),
  phone: z.string()
    .min(1, "Le numéro de téléphone est requis.")
    .transform(val => val.replace(/\s+|-/g, '')), // Nettoie les espaces et tirets
  otp: z.string().optional(),
});

type EmailFormValues = z.infer<typeof emailSchema>;
type PhoneFormValues = z.infer<typeof phoneSchema>;

const countryCodes = [
  { code: '33', name: 'FR (+33)' },
  { code: '32', name: 'BE (+32)' },
  { code: '41', name: 'CH (+41)' },
  { code: '352', name: 'LU (+352)' },
  { code: '1', name: 'US (+1)' },
];

const Login = () => {
  const navigate = useNavigate();
  const [authMethod, setAuthMethod] = useState<'email' | 'phone'>('email');
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fullPhoneNumber, setFullPhoneNumber] = useState('');

  const form = useForm<EmailFormValues | PhoneFormValues>({
    resolver: zodResolver(authMethod === 'email' ? emailSchema : phoneSchema),
    defaultValues: {
      email: '',
      password: '',
      countryCode: '33',
      phone: '',
      otp: '',
    },
  });

  useEffect(() => {
    form.reset({
      email: '',
      password: '',
      countryCode: '33',
      phone: '',
      otp: '',
    });
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
    const phone = `+${values.countryCode}${values.phone}`;
    setFullPhoneNumber(phone);

    try {
      if (!showOtpInput) {
        // Step 1: Send OTP using Supabase native auth
        const { error } = await supabase.auth.signInWithOtp({
          phone: phone,
        });
        if (error) throw error;
        setShowOtpInput(true);
        toast.success("Code de vérification envoyé !");
      } else {
        // Step 2: Verify OTP using Supabase native auth
        if (!values.otp || values.otp.length !== 6) {
          throw new Error("Le code de vérification doit contenir 6 chiffres.");
        }
        const { error } = await supabase.auth.verifyOtp({
          phone: phone,
          token: values.otp,
          type: 'sms',
        });
        if (error) throw error;
        toast.success("Vérification réussie ! Connexion en cours...");
        // The onAuthStateChange listener will handle navigation
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
                  <FormItem>
                    <FormLabel>Numéro de téléphone</FormLabel>
                    <div className="flex gap-2">
                       <FormField
                        control={form.control}
                        name="countryCode"
                        render={({ field }) => (
                          <FormItem>
                            <Select onValueChange={field.onChange} defaultValue={field.value} disabled={loading || showOtpInput}>
                              <FormControl>
                                <SelectTrigger className="w-[120px]">
                                  <SelectValue placeholder="Indicatif" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {countryCodes.map(c => (
                                  <SelectItem key={c.code} value={c.code}>{c.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem className="flex-grow">
                            <FormControl>
                              <Input placeholder="6 12 34 56 78" {...field} disabled={loading || showOtpInput} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </FormItem>

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

      <div className="hidden md:flex w-full md:w-1/2 items-center justify-center p-8 relative overflow-hidden aurora-background">
        <div className="absolute -top-1/2 -right-1/2 w-[800px] h-[800px] bg-blue-600/20 rounded-full filter blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-1/2 -left-1/2 w-[600px] h-[600px] bg-purple-600/20 rounded-full filter blur-3xl animate-pulse delay-1000"></div>
        <div className="text-center text-white space-y-6 relative z-10">
          <h2 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-white to-gray-300 drop-shadow-lg">
            La gestion locative, réinventée.
          </h2>
          <p className="text-lg text-slate-300 max-w-md mx-auto">
            Centralisez vos réservations, suivez vos finances et optimisez vos revenus avec une simplicité inégalée.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;