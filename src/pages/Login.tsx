import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';

const Login = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        navigate('/');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  return (
    <div className="min-h-screen flex flex-col md:flex-row"> {/* Flex container for two columns */}
      {/* Left Column: Login Form */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-8 bg-white dark:bg-gray-900"> {/* White background for light mode, dark for dark mode */}
        <div className="w-full max-w-sm space-y-8">
          <div className="flex flex-col items-start mb-6"> {/* Align items to start as in screenshot */}
            <img src="/logo.svg" alt="Hello Keys Logo" className="h-12 w-auto mb-2" /> {/* Adjust logo size */}
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-6">GESTION LOCATIVE 2.0</p> {/* Tagline */}
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-50 mb-2">
              Connectez-vous à votre compte
            </h1>
            <p className="text-md text-gray-600 dark:text-gray-400">
              Accédez à votre espace personnel en toute simplicité.
            </p>
          </div>
          <Auth
            supabaseClient={supabase}
            providers={['email', 'phone']} // Enable both email and phone login
            appearance={{
              theme: ThemeSupa,
              variables: {
                default: {
                  colors: {
                    brand: 'hsl(var(--primary))', // Your primary blue
                    brandAccent: 'hsl(var(--primary-foreground))', // White
                    inputBackground: 'hsl(var(--background))', // White for inputs
                    inputBorder: 'hsl(var(--border))', // Light gray border
                    inputBorderHover: 'hsl(var(--primary))', // Primary blue on hover
                    inputBorderFocus: 'hsl(var(--primary))', // Primary blue on focus
                    inputText: 'hsl(var(--foreground))', // Dark text
                    defaultButtonBackground: 'hsl(var(--primary))',
                    defaultButtonBackgroundHover: 'hsl(var(--primary) / 0.9)',
                    defaultButtonText: 'hsl(var(--primary-foreground))',
                  },
                  radii: {
                    borderRadiusButton: '0.5rem',
                    button: '0.5rem',
                    input: '0.5rem',
                  },
                },
              },
            }}
            theme="light" // Force light theme for Auth UI to match the white background
            redirectTo={window.location.origin + '/'}
          />
        </div>
      </div>

      {/* Right Column: Marketing/Illustration */}
      <div className="hidden md:flex w-full md:w-1/2 bg-blue-800 dark:bg-blue-950 items-center justify-center p-8"> {/* Blue background */}
        <div className="text-center text-white space-y-6">
          {/* Placeholder for the illustration. In a real app, you'd use an SVG or image here. */}
          <div className="w-full max-w-md mx-auto h-64 bg-blue-700 dark:bg-blue-800 rounded-lg flex items-center justify-center text-xl font-bold">
            {/* This is where your illustration would go */}
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