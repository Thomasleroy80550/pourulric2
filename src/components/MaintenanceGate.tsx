import type { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import MaintenancePage from "@/pages/MaintenancePage";

export default function MaintenanceGate({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const administration = pathname === "/admin" || pathname.startsWith("/admin/") || pathname === "/admin-v2" || pathname.startsWith("/admin-v2/");
  const login = ["/login", "/login-v2", "/v4/login"].includes(pathname);

  return administration || login ? children : <MaintenancePage />;
}
