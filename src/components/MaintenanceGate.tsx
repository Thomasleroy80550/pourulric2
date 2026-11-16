import { useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import MaintenancePage from "@/pages/MaintenancePage";
import MigrationBanner from "@/components/MigrationBanner";
import { maintenanceAdminEmail } from "@/components/MaintenanceAdminAccess";

export default function MaintenanceGate({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    let active = true;
    let version = 0;
    let timer: number | undefined;

    const verify = async (session: Session | null) => {
      const checkVersion = ++version;
      if (!session || session.user.email?.toLowerCase() !== maintenanceAdminEmail) {
        if (active) setAllowed(false);
        if (session) await supabase.auth.signOut({ scope: "local" });
        return;
      }
      const { data, error } = await supabase.auth.getUser();
      if (active && checkVersion === version) {
        setAllowed(!error && data.user?.email?.toLowerCase() === maintenanceAdminEmail);
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session || session.user.email?.toLowerCase() !== maintenanceAdminEmail) setAllowed(false);
      window.clearTimeout(timer);
      timer = window.setTimeout(() => void verify(session), 0);
    });
    void supabase.auth.getSession().then(({ data }) => { if (active) void verify(data.session); });

    return () => {
      active = false;
      version++;
      window.clearTimeout(timer);
      subscription.unsubscribe();
    };
  }, []);

  const administration = pathname === "/admin" || pathname.startsWith("/admin/") || pathname === "/admin-v2" || pathname.startsWith("/admin-v2/");
  return administration && allowed ? <><MigrationBanner />{children}</> : <MaintenancePage />;
}
