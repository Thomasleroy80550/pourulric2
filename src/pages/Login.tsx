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
        // User is authenticated, redirect to dashboard
        navigate('/');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center 
                    bg-gradient-to-br from-blue-900 to-purple-900 
                    dark:from-gray-950 dark:to-gray-800 p-4"> {/* Added p-4 for mobile padding */}
      <div className="w-full max-w-md md:max-w-lg lg:max-w-xl p-8 space-y-8 
                      bg-white dark:bg-gray-800 rounded-xl shadow-2xl 
                      transform transition-all duration-300 hover:scale-[1.01]"> {/* Larger card, more shadow, subtle hover effect */}
        <div className="flex flex-col items-center mb-6">
          <img src="/logo.svg" alt="Hello Keys Logo" className="h-16 w-auto mb-4" /> {/* Larger logo */}
          <h1 className="text-4xl font-extrabold text-center text-gray-900 dark:text-gray-50 mb-2">
            Bienvenue sur Hello Keys
          </h1>
          <p className="text-lg text-center text-gray-600 dark:text-gray-400">
            Connectez-vous pour gérer vos propriétés.
          </p>
        </div>
        <Auth
          supabaseClient={supabase}
          providers={[]} // No third-party providers for now
          appearance={{
            theme: ThemeSupa,
            variables: {
              default: {
                colors: {
                  brand: 'hsl(var(--primary))', // Utilise la couleur primaire de votre thème
                  brandAccent: 'hsl(var(--primary-foreground))', // Utilise la couleur de premier plan de votre thème
                  // Vous pouvez ajouter d'autres variables ici pour personnaliser davantage
                  // Par exemple:
                  // defaultButtonBackground: 'hsl(var(--primary))',
                  // defaultButtonBackgroundHover: 'hsl(var(--primary-foreground))',
                  // inputBackground: 'hsl(var(--input))',
                  // inputBorder: 'hsl(var(--border))',
                  // inputBorderHover: 'hsl(var(--ring))',
                  // inputBorderFocus: 'hsl(var(--ring))',
                  // inputText: 'hsl(var(--foreground))',
                },
                radii: {
                  borderRadiusButton: '0.5rem', // Utilise la variable --radius de Tailwind
                  button: '0.5rem',
                  input: '0.5rem',
                },
              },
            },
          }}
          theme="light" // Use light theme, adjust if dark mode is preferred
          redirectTo={window.location.origin + '/'} // Redirect to home after login
        />
      </div>
    </div>
  );
};

export default Login;