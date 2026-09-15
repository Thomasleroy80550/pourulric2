import React from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Mail, PhoneCall, Phone, Heart, ChevronRight } from "lucide-react";
import V4Layout from "./V4Layout";

const options = [
  {
    icon: Mail,
    label: "Envoyer un message",
    sub: "Réponse sous 24h",
  },
  {
    icon: PhoneCall,
    label: "Être rappelé",
    sub: "Laissez votre numéro, nous vous rappelons",
  },
  {
    icon: Phone,
    label: "Nous appeler",
    sub: "09 XX XX XX XX · Lun. – Ven. 9h – 18h",
  },
];

const ContactV4: React.FC = () => {
  const navigate = useNavigate();

  return (
    <V4Layout hideNav>
      <div className="space-y-4 px-4 pt-5 pb-8">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="rounded-full bg-white p-2 text-slate-600 shadow-sm"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h1 className="text-2xl font-bold text-slate-900">
            Contacter Hello Keys
          </h1>
        </div>

        <p className="text-sm text-slate-500">
          Notre équipe est à votre écoute pour toute question concernant votre
          logement.
        </p>

        <div className="space-y-2">
          {options.map((o) => {
            const Icon = o.icon;
            return (
              <button
                key={o.label}
                className="flex w-full items-center gap-3 rounded-2xl bg-white p-4 text-left shadow-sm"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <Icon className="h-5 w-5" />
                </span>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-900">
                    {o.label}
                  </p>
                  <p className="text-xs text-slate-400">{o.sub}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-300" />
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-3 rounded-2xl bg-rose-50 p-4">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-rose-500">
            <Heart className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm font-semibold text-rose-500">
              Merci de votre confiance !
            </p>
            <p className="text-xs text-slate-500">
              Vous déléguez, on s'occupe de tout.
            </p>
          </div>
        </div>
      </div>
    </V4Layout>
  );
};

export default ContactV4;
