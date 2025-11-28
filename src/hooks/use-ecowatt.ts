"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface EcowattData {
  // L’API renvoie un JSON complet; on reste permissif
  [key: string]: any;
}

export function useEcowatt() {
  const [data, setData] = useState<EcowattData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEcowatt = useCallback(async () => {
    setLoading(true);
    setError(null);
    // invoke() effectue un POST par défaut
    const { data, error } = await supabase.functions.invoke("ecowatt", { body: {} });

    if (error) {
      setError(error.message ?? "Erreur inconnue");
      setData(null);
    } else {
      setData(data as EcowattData);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchEcowatt();
  }, [fetchEcowatt]);

  const refresh = useCallback(() => {
    fetchEcowatt();
  }, [fetchEcowatt]);

  return useMemo(
    () => ({ data, loading, error, refresh }),
    [data, loading, error, refresh]
  );
}

export default useEcowatt;