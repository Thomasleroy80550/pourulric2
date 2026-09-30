"use client";

import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSession } from "@/components/SessionContextProvider";
import {
  ArrowUpRight,
  Flame,
  Plug,
  Snowflake,
  Thermometer,
  AirVent,
} from "lucide-react";

const STORAGE_KEY = "thermosync_promo_dismissed_v1";

const ThermoSyncPromoDialog: React.FC = () => {
  const navigate = useNavigate();
  const { profile } = useSession();
  const [open, setOpen] = useState(false);

  const isClient =
    profile && profile.role !== "housekeeper" && profile.role !== "accountant";

  useEffect(() => {
    if (!isClient) return;
    const dismissed = localStorage.getItem(STORAGE_KEY);
    if (!dismissed) {
      const timer = setTimeout(() => setOpen(true), 1200);
      return () => clearTimeout(timer);
    }
  }, [isClient]);

  const handleClose = () => {
    setOpen(false);
    localStorage.setItem(STORAGE_KEY, "1");
  };

  const handleLearnMore = () => {
    localStorage.setItem(STORAGE_KEY, "1");
    setOpen(false);
    navigate("/thermo-sync");
  };

  if (!isClient) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? setOpen(true) : handleClose())}>
      <DialogContent className="sm:max-w-lg overflow-hidden p-0 gap-0">
        {/* Bandeau hiver */}
        <div className="relative bg-gradient-to-br from-orange-500 via-orange-600 to-red-600 px-6 py-7 text-white">
          <Snowflake className="absolute right-4 top-4 h-6 w-6 opacity-40" />
          <Snowflake className="absolute right-12 top-10 h-4 w-4 opacity-25" />
          <Snowflake className="absolute right-24 top-5 h-3 w-3 opacity-30" />

          <div className="flex items-center gap-2">
            <Badge className="bg-white/20 text-white hover:bg-white/20 border-0">
              Offre partenaire Hello Keys
            </Badge>
          </div>
          <h2 className="mt-3 text-2xl font-bold leading-tight">
            L'hiver arrive… <br className="sm:hidden" />
            Prenez le contrôle du chauffage
          </h2>
          <p className="mt-2 text-sm text-white/90">
            Avec <span className="font-semibold">Thermo Sync</span>, chauffez vos
            logements uniquement quand il le faut : préchauffage avant l'arrivée,
            mode éco entre deux réservations.
          </p>
        </div>

        <div className="px-6 py-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Compatible avec votre installation
          </p>
          <div className="mt-3 grid grid-cols-3 gap-2">
            <div className="flex flex-col items-center gap-1.5 rounded-xl border bg-muted/40 p-3 text-center">
              <Flame className="h-5 w-5 text-orange-600" />
              <span className="text-xs font-medium leading-tight">
                Chaudière gaz
              </span>
            </div>
            <div className="flex flex-col items-center gap-1.5 rounded-xl border bg-muted/40 p-3 text-center">
              <Plug className="h-5 w-5 text-orange-600" />
              <span className="text-xs font-medium leading-tight">
                Chauffage électrique
              </span>
            </div>
            <div className="flex flex-col items-center gap-1.5 rounded-xl border bg-muted/40 p-3 text-center">
              <AirVent className="h-5 w-5 text-orange-600" />
              <span className="text-xs font-medium leading-tight">
                Climatisation
              </span>
            </div>
          </div>

          <div className="mt-4 flex items-start gap-2 rounded-lg bg-orange-50 p-3 text-xs text-orange-950 dark:bg-orange-950/30 dark:text-orange-100">
            <Thermometer className="mt-0.5 h-4 w-4 shrink-0 text-orange-600" />
            <p>
              Jusqu'à <span className="font-semibold">25% d'économies</span> visées
              sur vos consommations pendant les périodes vacantes, sans dégrader le
              confort de vos voyageurs.
            </p>
          </div>

          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            <Button asChild className="flex-1 bg-orange-600 hover:bg-orange-700">
              <a
                href="https://www.thermosync.fr"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => localStorage.setItem(STORAGE_KEY, "1")}
              >
                Découvrir thermosync.fr
                <ArrowUpRight className="ml-2 h-4 w-4" />
              </a>
            </Button>
            <Button variant="outline" className="flex-1" onClick={handleLearnMore}>
              En savoir plus
            </Button>
          </div>
          <button
            onClick={handleClose}
            className="mt-3 w-full text-center text-xs text-muted-foreground hover:underline"
          >
            Non merci, ne plus afficher
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ThermoSyncPromoDialog;
