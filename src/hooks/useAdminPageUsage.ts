import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

export type AdminPageUsage = { page_path: string; visit_count: number };
let lastRecordedVisit = '';
let pendingVisit: Promise<void> = Promise.resolve();

export function useAdminPageUsage(userId: string | undefined, enabled: boolean, pages: string[]) {
  const location = useLocation();
  const [usage, setUsage] = useState<AdminPageUsage[]>([]);
  const currentPage = pages
    .filter((href) => {
      const [path, query] = href.split('?');
      const matchesPath = path === '/admin'
        ? location.pathname === path
        : location.pathname === path || location.pathname.startsWith(`${path}/`);
      return matchesPath && (!query || new URLSearchParams(query).get('module') === new URLSearchParams(location.search).get('module'));
    })
    .sort((a, b) => b.length - a.length)[0];

  useEffect(() => {
    if (!enabled || !userId) {
      setUsage([]);
      return;
    }
    let cancelled = false;
    const visitKey = `${userId}:${location.key}:${currentPage}`;
    const loadUsage = async () => {
      if (currentPage && lastRecordedVisit !== visitKey) {
        lastRecordedVisit = visitKey;
        pendingVisit = (async () => {
          const { error } = await supabase.rpc('record_admin_page_visit', { page_path_input: currentPage });
          if (error) {
            if (lastRecordedVisit === visitKey) lastRecordedVisit = '';
            console.warn('[admin-page-usage] Comptage indisponible', error.message);
          }
        })();
      }
      await pendingVisit;
      const { data, error } = await supabase
        .from('admin_page_usage')
        .select('page_path, visit_count')
        .order('visit_count', { ascending: false });
      if (cancelled) return;
      if (error) {
        console.warn('[admin-page-usage] Classement indisponible', error.message);
        return;
      }
      setUsage((data ?? []).map((row) => ({ page_path: row.page_path, visit_count: Number(row.visit_count) })));
    };
    void loadUsage();
    return () => { cancelled = true; };
  }, [enabled, userId, currentPage, location.key]);

  return usage;
}
