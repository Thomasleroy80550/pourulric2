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
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import MagicLoginButton from '@/components/MagicLoginButton';
import logoUrl from '@/assets/logo.png'; // Import the logo

// Zod schemas for validation
const emailSchema = z.object({
  email: z.string().email({ message: "Email invalide." }),
  password: z.string().min(6, { message: "Le mot de passe doit contenir au moins 6 caractères." }),
});

const phoneSchema = z.object({
  phone: z.string().min(10, { message: "Numéro de téléphone invalide." }).max(15, { message: "Numéro de téléphone trop long." }),
  otp: z.string().optional(), // OTP is optional initially, required after sending code
}).superRefine((data, ctx) => {
  if (data.otp && data.otp.length < 6) { // Assuming 6-digit OTP
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Le code OTP doit contenir 6 chiffres.",
      path: ['otp'],
    });
  }
});

type EmailFormValues = z.infer<typeof emailSchema>;
type PhoneFormValues = z.infer<typeof phoneSchema>;

const Login = () => {
  const navigate = useNavigate();
  const [authMethod, setAuthMethod] = useState<'email' | 'phone'>('email');
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [loading, setLoading] = useState(false);

  // Initialize react-hook-form with conditional schema
  const form = useForm<EmailFormValues | PhoneFormValues>({
    resolver: zodResolver(authMethod === 'email' ? emailSchema : phoneSchema),
    defaultValues: {
      email: '',
      password: '',
      phone: '',
      otp: '',
    },
  });

  // Reset form state when auth method changes
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

  const onSubmit = async (values: EmailFormValues | PhoneFormValues) => {
    setLoading(true);
    try {
      if (authMethod === 'email') {
        const emailValues = values as EmailFormValues;
        const { error } = await supabase.auth.signInWithPassword({
          email: emailValues.email,
          password: emailValues.password,
        });
        if (error) throw error;
        toast.success("Connexion réussie !");
      } else { // Phone authentication
        const phoneValues = values as PhoneFormValues;
        if (!showOtpInput) {
          // Step 1: Send OTP
          const { error } = await supabase.auth.signInWithOtp({
            phone: phoneValues.phone,
          });
          if (error) throw error;
          setShowOtpInput(true);
          toast.success("Code OTP envoyé à votre numéro de téléphone !");
        } else {
          // Step 2: Verify OTP
          if (!phoneValues.otp) {
            form.setError('otp', { message: "Veuillez entrer le code OTP." });
            setLoading(false);
            return;
          }
          const { error } = await supabase.auth.verifyOtp({
            phone: phoneValues.phone,
            token: phoneValues.otp,
            type: 'sms',
          });
          if (error) throw error;
          toast.success("Connexion réussie !");
        }
      }
    } catch (error: any) {
      toast.error(`Erreur: ${error.message}`);
      console.error("Authentication error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Left Column: Login Form */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-8 bg-white dark:bg-gray-900">
        <div className="w-full max-w-sm space-y-8">
          <div className="flex flex-col items-start mb-6">
            <img src={logoUrl} alt="Hello Keys Logo" className="w-48 h-auto mb-6" />
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
              ) : ( // Phone authentication
                <>
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Numéro de téléphone</FormLabel>
                        <FormControl>
                          <Input placeholder="+33612345678" {...field} disabled={loading || showOtpInput} />
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
                        <FormItem>
                          <FormLabel>Code OTP</FormLabel>
                          <FormControl>
                            <Input placeholder="Entrez le code à 6 chiffres" {...field} disabled={loading} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? (showOtpInput ? 'Vérification...' : 'Envoi du code...') : (showOtpInput ? 'Vérifier le code' : 'Envoyer le code')}
                  </Button>
                </>
              )}
            </form>
          </Form>
          {/* Magic Login Button for development */}
          <MagicLoginButton />
        </div>
      </div>

      {/* Right Column: Marketing/Illustration */}
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