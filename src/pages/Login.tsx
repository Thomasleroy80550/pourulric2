import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSession } from '@/components/SessionContextProvider';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { session } = useSession();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const referralCode = params.get('ref');
    if (referralCode) {
      localStorage.setItem('referral_code', referralCode);
    }
  }, [location.search]);

  useEffect(() => {
    if (session) {
      navigate('/');
    }
  }, [session, navigate]);

  return (
    <div className="flex flex-col justify-center items-center min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      <img src="/logo.png" alt="Hello Keys Logo" className="w-64 h-auto mb-8" />
      <div className="w-full max-w-md">
        <Auth
          supabaseClient={supabase}
          appearance={{ theme: ThemeSupa }}
          providers={['google']}
          localization={{
            variables: {
              sign_in: {
                email_label: 'Adresse e-mail',
                password_label: 'Mot de passe',
                button_label: 'Se connecter',
                social_provider_text: 'Se connecter avec {{provider}}',
                link_text: 'Vous avez déjà un compte ? Connectez-vous',
              },
              sign_up: {
                email_label: 'Adresse e-mail',
                password_label: 'Mot de passe',
                button_label: 'S\'inscrire',
                social_provider_text: 'S\'inscrire avec {{provider}}',
                link_text: 'Vous n\'avez pas de compte ? Inscrivez-vous',
              },
              forgotten_password: {
                email_label: 'Adresse e-mail',
                button_label: 'Envoyer les instructions',
                link_text: 'Mot de passe oublié ?',
              },
            },
          }}
        />
      </div>
    </div>
  );
};

export default Login;