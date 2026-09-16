import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Home,
  FileText,
  Star,
  MessageCircle,
  Settings,
  HelpCircle,
  LogOut,
  ChevronRight,
  FlaskConical,
  RefreshCw,
} from "lucide-react";
import { PWA_UPDATE_TEST_EVENT } from "@/components/PwaUpdatePrompt";
import V4Layout from "./V4Layout";
import PushSettingV4 from "./PushSettingV4";
import { Switch } from "@/components/ui/switch";
import { useSession } from "@/components/SessionContextProvider";
import { supabase } from "@/integrations/supabase/client";
import { useV4Rooms, useV4Reviews } from "./v4-data";
import { isV4MockEnabled, setV4MockEnabled } from "./v4-mock";

const MoreV4: React.FC = () => {
  const navigate = useNavigate();
  const { profile } = useSession();
  const { data: rooms } = useV4Rooms();
  const { data: reviews } = useV4Reviews();
  const isAdmin = profile?.role === "admin";
  const [mockOn, setMockOn] = useState(isV4MockEnabled());

  const handleMockToggle = (checked: boolean) => {
    setV4MockEnabled(checked);
    setMockOn(checked);
  };

  const firstName = profile?.first_name ?? "";
  const lastName = profile?.last_name ?? "";
  const initials =
    `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || "HK";

  const rated = (reviews ?? []).filter((r) => r.rating > 0);
  const average =
    rated.length > 0
      ? Math.round((rated.reduce((a, r) => a + r.rating, 0) / rated.length) * 10) / 10
      : null;

  const sections = [
    [
      {
        icon: Home,
        label: "Mes logements",
        sub: rooms
          ? `${rooms.length} logement${rooms.length > 1 ? "s" : ""}`
          : "",
        to: "/v4/logements",
      },
      {
        icon: FileText,
        label: "Mes relevés",
        sub: "Historique de vos versements",
        to: "/v4/finances",
      },
      {
        icon: Star,
        label: "Mes avis",
        sub: average
          ? `${average.toLocaleString("fr-FR")}/5 (${(reviews ?? []).length} avis)`
          : "Vos avis voyageurs",
        to: "/v4/avis",
      },
      {
        icon: MessageCircle,
        label: "Contacter mon équipe",
        sub: "Une question ? Nous sommes là !",
        to: "/v4/contact",
      },
    ],
    [
      {
        icon: Settings,
        label: "Paramètres",
        sub: "Profil, coordonnées",
        to: "/v4/parametres",
      },
      {
        icon: HelpCircle,
        label: "Aide & support",
        sub: "FAQ, contact, rendez-vous",
        to: "/v4/aide",
      },
    ],
  ];

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  return (
    <V4Layout>
      <div className="space-y-4 px-4 pt-5">
        <h1 className="text-2xl font-bold text-slate-900">Plus</h1>

        {/* Profil */}
        <div className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-hk-100 text-sm font-bold text-hk-700">
            {initials}
          </span>
          <div>
            <p className="font-semibold text-slate-900">
              {firstName} {lastName}
            </p>
            <p className="text-sm text-slate-500">Propriétaire</p>
          </div>
        </div>

        {/* Sections */}
        {sections.map((items, i) => (
          <div key={i} className="rounded-2xl bg-white shadow-sm">
            {items.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.label}
                  to={item.to}
                  className="flex w-full items-center gap-3 border-b border-slate-100 px-4 py-3 text-left last:border-0"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 text-slate-600">
                    <Icon size={18} />
                  </span>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-900">
                      {item.label}
                    </p>
                    {item.sub && (
                      <p className="text-xs text-slate-400">{item.sub}</p>
                    )}
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-300" />
                </Link>
              );
            })}
          </div>
        ))}

        {/* Notifications push */}
        <PushSettingV4 />

        {/* Mode Mock (admin uniquement) */}
        {isAdmin && (
          <div className="rounded-2xl bg-white shadow-sm ring-1 ring-amber-200">
            <div className="flex items-center gap-3 px-4 py-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                <FlaskConical size={18} />
              </span>
              <div className="flex-1">
                <p className="text-sm font-semibold text-slate-900">Mock</p>
                <p className="text-xs text-slate-400">
                  Affiche des données fictives sur la V4 (pour les captures d'écran)
                </p>
              </div>
              <Switch
                checked={mockOn}
                onCheckedChange={handleMockToggle}
                aria-label="Activer le mode mock"
              />
            </div>
            <button
              onClick={() =>
                window.dispatchEvent(new Event(PWA_UPDATE_TEST_EVENT))
              }
              className="flex w-full items-center gap-3 border-t border-slate-100 px-4 py-3 text-left"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                <RefreshCw size={18} />
              </span>
              <div className="flex-1">
                <p className="text-sm font-semibold text-slate-900">
                  Tester le popup de mise à jour
                </p>
                <p className="text-xs text-slate-400">
                  Affiche le panneau sans lancer de vraie mise à jour
                </p>
              </div>
              <ChevronRight className="h-4 w-4 text-slate-300" />
            </button>
          </div>
        )}

        {/* Déconnexion */}
        <button
          onClick={handleSignOut}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-red-50 py-3.5 font-semibold text-red-500"
        >
          <LogOut className="h-4 w-4" />
          Se déconnecter
        </button>
      </div>
    </V4Layout>
  );
};

export default MoreV4;
