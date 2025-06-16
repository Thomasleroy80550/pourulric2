"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

const MagicLoginButton: React.FC = () => {
  const [loading, setLoading] = useState(false);

  const handleMagicLogin = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: 'thomasleroy80550@gmail.com',
        password: '123456',
      });

      if (error) {
        throw error;
      }
      toast.success("Connexion rapide réussie !");
    } catch (error: any) {
      toast.error(`Erreur de connexion rapide : ${error.message}`);
      console.error("Magic login error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={handleMagicLogin}
      disabled={loading}
      className="w-full bg-purple-600 hover:bg-purple-700 text-white"
    >
      {loading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Connexion rapide...
        </>
      ) : (
        "Connexion rapide (Dev)"
      )}
    </Button>
  );
};

export default MagicLoginButton;