import React from "react";
import { Link } from "react-router-dom";
import {
  Home,
  FileText,
  Star,
  MessageCircle,
  Settings,
  HelpCircle,
  Info,
  LogOut,
  ChevronRight,
} from "lucide-react";
import V4Layout from "./V4Layout";
import { owner } from "./mockData";

interface Item {
  icon: React.ElementType;
  label: string;
  sub?: string;
  to?: string;
}

const sections: Item[][] = [
  [
    { icon: Home, label: "Mes logements", sub: "1 logement" },
    { icon: FileText, label: "Mes documents", sub: "Contrats, relevés, attestations" },
    { icon: Star, label: "Mes avis", sub: "4,5/5 (5 avis)", to: "/v4/avis" },
    {
      icon: MessageCircle,
      label: "Contacter mon équipe",
      sub: "Une question ? Nous sommes là !",
      to: "/v4/contact",
    },
  ],
  [
    { icon: Settings, label: "Paramètres", sub: "Notifications, langue, etc." },
    { icon: HelpCircle, label: "Aide & support", sub: "Centre d'aide" },
    { icon: Info, label: "À propos", sub: "Hello Keys" },
  ],
];

const MoreV4: React.FC = () => (
  <V4Layout>
    <div className="space-y-4 px-4 pt-5">
      <h1 className="text-2xl font-bold text-slate-900">Plus</h1>

      {/* Profil */}
      <div className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm">
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700">
          {owner.initials}
        </span>
        <div>
          <p className="font-semibold text-slate-900">{owner.firstName}</p>
          <p className="text-sm text-slate-500">Propriétaire</p>
        </div>
      </div>

      {/* Sections */}
      {sections.map((items, i) => (
        <div key={i} className="rounded-2xl bg-white shadow-sm">
          {items.map((item) => {
            const Icon = item.icon;
            const content = (
              <>
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 text-slate-600">
                  <Icon className="h-4.5 w-4.5" size={18} />
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
              </>
            );
            const className =
              "flex w-full items-center gap-3 border-b border-slate-100 px-4 py-3 text-left last:border-0";
            return item.to ? (
              <Link key={item.label} to={item.to} className={className}>
                {content}
              </Link>
            ) : (
              <button key={item.label} className={className}>
                {content}
              </button>
            );
          })}
        </div>
      ))}

      {/* Déconnexion */}
      <button className="flex w-full items-center justify-center gap-2 rounded-2xl bg-red-50 py-3.5 font-semibold text-red-500">
        <LogOut className="h-4 w-4" />
        Se déconnecter
      </button>
    </div>
  </V4Layout>
);

export default MoreV4;
