import React from "react";
import { useNavigate } from "react-router-dom";
import { BellRing, Flame, Sparkles } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useIsMobile } from "@/hooks/use-mobile";

const DISMISS_STORAGE_KEY = "news_notifications_returned_popup_dismissed_v1";

const NewsNotificationsPopup: React.FC = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    const dismissed = window.localStorage.getItem(DISMISS_STORAGE_KEY);
    if (dismissed !== "1") {
      setOpen(true);
    }
  }, []);

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);

    if (!nextOpen) {
      window.localStorage.setItem(DISMISS_STORAGE_KEY, "1");
    }
  };

  const handleGoToNotifications = () => {
    window.localStorage.setItem(DISMISS_STORAGE_KEY, "1");
    setOpen(false);
    navigate("/notifications");
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="overflow-hidden border-0 bg-transparent p-0 shadow-none sm:max-w-lg">
        <div className="relative rounded-3xl border border-orange-200 bg-gradient-to-br from-orange-50 via-white to-amber-50 p-4 shadow-2xl sm:p-6">
          <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-orange-200/40 blur-2xl" />
          <div className="absolute -left-6 bottom-0 h-24 w-24 rounded-full bg-amber-200/40 blur-2xl" />

          <div className="relative space-y-4">
            <div className="flex items-center justify-between gap-3">
              <Badge className="border-0 bg-orange-500 px-3 py-1 text-white hover:bg-orange-500">
                <Flame className="mr-1 h-3.5 w-3.5" />
                News !
              </Badge>
              <div className="flex items-center gap-1 text-orange-500">
                <Flame className="h-5 w-5" />
                <Flame className="h-4 w-4" />
                <Flame className="h-5 w-5" />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-start gap-3">
                <div className="rounded-2xl bg-orange-100 p-3 text-orange-600">
                  <BellRing className="h-6 w-6" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-2xl font-bold leading-tight text-slate-900 sm:text-3xl">
                    Les notifications SMS et mail sont de retour !
                  </h2>
                  <p className="text-sm leading-6 text-slate-600 sm:text-base">
                    Retrouvez vos alertes importantes par email et par SMS directement depuis votre espace propriétaire.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-orange-100 bg-white/90 p-4">
              <div className="flex items-start gap-3">
                <Sparkles className="mt-0.5 h-5 w-5 text-amber-500" />
                <div>
                  <p className="font-semibold text-slate-900">Nouveau</p>
                  <p className="mt-1 text-sm text-slate-600">
                    Activez vos alertes de réservations par email et SMS depuis votre profil, dans l’onglet Notifications.
                  </p>
                </div>
              </div>
            </div>

            <div className={`flex ${isMobile ? "flex-col" : "flex-row justify-end"} gap-2`}>
              <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} className="border-slate-200 bg-white">
                Plus tard
              </Button>
              <Button type="button" onClick={handleGoToNotifications} className="bg-orange-500 text-white hover:bg-orange-600">
                Voir les notifications
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default NewsNotificationsPopup;
