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
    <div className="min-h-screen flex items-center justify-center 
                    bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 
                    dark:from-gray-950 dark:to-black p-4">
      <div className="w-full max-w-md md:max-w-lg lg:max-w-xl p-10 space-y-8 
                      bg-white/5 dark:bg-black/20 rounded-xl shadow-2xl border border-white/10 dark:border-gray-700
                      backdrop-blur-lg transform transition-all duration-300 hover:scale-[1.01]
                      animate-in fade-in zoom-in duration-700">
        <div className="flex flex-col items-center mb-6">
          <img src="/logo.svg" alt="Hello Keys Logo" className="h-20 w-auto mb-4" />
          <h1 className="text-4xl font-extrabold text-center text-white mb-2">
            Bienvenue sur Hello Keys
          </h1>
          <p className="text-lg text-center text-gray-300">
            Connectez-vous pour gérer vos propriétés.
          </p>
        </div>
        <Auth
          supabaseClient={supabase}
          providers={[]}
          appearance={{
            theme: ThemeSupa,
            variables: {
              default: {
                colors: {
                  brand: 'hsl(var(--primary))', // Primary color from theme
                  brandAccent: 'hsl(var(--primary-foreground))', // Foreground color for brand
                  inputBackground: 'rgba(255, 255, 255, 0.1)', // Slightly transparent input
                  inputBorder: 'rgba(255, 255, 255, 0.2)',
                  inputBorderHover: 'hsl(var(--primary))',
                  inputBorderFocus: 'hsl(var(--primary))',
                  inputText: 'hsl(var(--foreground))', // Text color from theme (light in dark mode)
                  defaultButtonBackground: 'hsl(var(--primary))',
                  defaultButtonBackgroundHover: 'hsl(var(--primary) / 0.8)', // Darker shade of primary for hover
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
          theme="dark" // Force dark theme for Auth UI
          redirectTo={window.location.origin + '/'}
        />
      </div>
    </div>
  );
};

export default Login;