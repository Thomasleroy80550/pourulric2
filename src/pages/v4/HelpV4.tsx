import React from "react";
import { useNavigate, Link } from "react-router-dom";
import { ChevronLeft, Phone, CalendarCheck, MessageCircle } from "lucide-react";
import V4Layout from "./V4Layout";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useV4Faqs } from "./v4-data";

const CALENDLY_URL = "https://calendly.com/contach-hellokeys";

const HelpV4: React.FC = () => {
  const navigate = useNavigate();
  const { data: faqs, isLoading } = useV4Faqs();

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
          <h1 className="text-2xl font-bold text-slate-900">Aide & support</h1>
        </div>

        {/* Raccourcis contact */}
        <div className="grid grid-cols-3 gap-2">
          <Link
            to="/v4/messages"
            className="flex flex-col items-center gap-1.5 rounded-2xl bg-white p-3 shadow-sm"
          >
            <MessageCircle className="h-5 w-5 text-blue-600" />
            <span className="text-center text-xs font-semibold text-slate-700">
              Messages
            </span>
          </Link>
          <a
            href="tel:+33322319270"
            className="flex flex-col items-center gap-1.5 rounded-2xl bg-white p-3 shadow-sm"
          >
            <Phone className="h-5 w-5 text-blue-600" />
            <span className="text-center text-xs font-semibold text-slate-700">
              Appeler
            </span>
          </a>
          <a
            href={CALENDLY_URL}
            target="_blank"
            rel="noreferrer"
            className="flex flex-col items-center gap-1.5 rounded-2xl bg-white p-3 shadow-sm"
          >
            <CalendarCheck className="h-5 w-5 text-blue-600" />
            <span className="text-center text-xs font-semibold text-slate-700">
              Rendez-vous
            </span>
          </a>
        </div>

        <p className="px-1 text-xs text-slate-400">
          Nos horaires : 9h – 12h / 14h – 18h du lundi au samedi
        </p>

        {/* FAQ */}
        <div className="rounded-2xl bg-white px-4 py-2 shadow-sm">
          <h2 className="pt-2 font-semibold text-slate-900">
            Questions fréquentes
          </h2>
          {isLoading ? (
            <div className="space-y-2 py-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : faqs && faqs.length > 0 ? (
            <Accordion type="single" collapsible className="w-full">
              {faqs.map((f) => (
                <AccordionItem key={f.id} value={f.id} className="border-slate-100">
                  <AccordionTrigger className="text-left text-sm font-medium text-slate-800">
                    {f.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-sm text-slate-600">
                    {f.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          ) : (
            <p className="py-4 text-center text-sm text-slate-500">
              Aucune question disponible pour le moment.
            </p>
          )}
        </div>
      </div>
    </V4Layout>
  );
};

export default HelpV4;
