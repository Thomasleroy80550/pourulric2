import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useSession } from "@/components/SessionContextProvider";

const MOBILE_QUERY = "(max-width: 767px)";

// Routes propriétaire de l'app classique → équivalent V4
const EXACT_REDIRECTS: Record<string, string> = {
  "/": "/v4",
  "/home-classic": "/v4",
  "/home-v2": "/v4",
  "/home-v3": "/v4",
  "/calendar": "/v4/calendrier",
  "/calendar-mobile": "/v4/calendrier",
  "/planning-v2": "/v4/calendrier",
  "/planning-v3": "/v4/calendrier",
  "/bookings": "/v4/reservations",
  "/finances": "/v4/finances",
  "/reviews": "/v4/avis",
  "/notifications": "/v4/notifications",
  "/tickets": "/v4/messages",
  "/help": "/v4/aide",
  "/faq": "/v4/aide",
  "/my-rooms": "/v4/logements",
};

function getV4Target(pathname: string): string | null {
  if (EXACT_REDIRECTS[pathname]) return EXACT_REDIRECTS[pathname];
  const ticketMatch = pathname.match(/^\/tickets\/([^/]+)$/);
  if (ticketMatch) return `/v4/messages/${ticketMatch[1]}`;
  return null;
}

/**
 * Sur mobile, la V4 est la version par défaut : les principales routes
 * propriétaire de l'app classique redirigent vers leur équivalent V4.
 * Le desktop n'est pas concerné, et les routes /admin restent accessibles.
 */
const MobileV4Redirect: React.FC = () => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { profile } = useSession();

  const [isMobile, setIsMobile] = useState(
    () => typeof window !== "undefined" && window.matchMedia(MOBILE_QUERY).matches
  );

  useEffect(() => {
    const media = window.matchMedia(MOBILE_QUERY);
    const listener = () => setIsMobile(media.matches);
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, []);

  useEffect(() => {
    if (!isMobile) return;
    if (!profile) return;
    const target = getV4Target(pathname);
    if (target) navigate(target, { replace: true });
  }, [isMobile, pathname, profile, navigate]);

  return null;
};

export default MobileV4Redirect;
