"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface EcowattData {
  // L'API renvoie un JSON complet; on reste permissif
  [key: string]: any;
}

export function useEcowatt() {
  const [data, setData] = useState<EcowattData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const CACHE_KEY = "ecowatt_cache_v1";
  const TTL_MS = 5 * 60_000;

  const readCache = () => {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as { data: EcowattData; fetchedAt: number };
      if (!parsed || typeof parsed.fetchedAt !== "number") return null;
      const isFresh = Date.now() - parsed.fetchedAt < TTL_MS;
      return isFresh ? parsed.data : null;
    } catch {
      return null;
    }
  };

  const writeCache = (payload: EcowattData) => {
    try {
      localStorage.setItem(
        CACHE_KEY,
        JSON.stringify({ data: payload, fetchedAt: Date.now() })
      );
    } catch {
      // ignore quota errors
    }
  };

  const fetchEcowatt = useCallback(async (force = false) => {
    // Utiliser le cache si pas de refresh forcé
    if (!force) {
      const cached = readCache();
      if (cached) {
        setData(cached);
        setLoading(false);
        setError(null);
        return;
      }
    }

    setLoading(true);
    setError(null);

    const { data, error } = await supabase.functions.invoke("ecowatt", { body: {} });

    if (error) {
      // En cas d'erreur (ex: 429), retomber sur le cache si dispo
      const cached = readCache();
      if (cached) {
        setData(cached);
      } else {
        setData(null);
      }
      setError(error.message ?? "Erreur inconnue");
      setLoading(false);
      return;
    }

    // Succès => stocker en cache et mettre à jour
    writeCache(data as EcowattData);
    setData(data as EcowattData);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchEcowatt(false);
  }, [fetchEcowatt]);

  const refresh = useCallback(() => {
    fetchEcowatt(true);
  }, [fetchEcowatt]);

  return useMemo(
    () => ({ data, loading, error, refresh }),
    [data, loading, error, refresh]
  );
}

export default useEcowatt;