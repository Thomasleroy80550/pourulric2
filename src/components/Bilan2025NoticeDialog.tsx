"use client";

import React from "react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FileText, CalendarDays } from "lucide-react";

const STORAGE_KEY = "bilan2025_notice_dismissed";

const isInNoticeWindow = () => {
  const now = new Date();
  const start = new Date(2025, 0, 4); // 4 janvier 2025
  const end = new Date(2025, 2, 1, 23, 59, 59); // 1er mars 2025 23:59:59
  return now >= start && now <= end;
};

const Bilan2025NoticeDialog: React.FC = () => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem(STORAGE_KEY);
    if (!dismissed && isInNoticeWindow()) {
      setOpen(true);
    }
  }, []);

  const handleClose = () => {
    setOpen(false);
    localStorage.setItem(STORAGE_KEY, "1");
  };

  const handleGoToStatements = () => {
    localStorage.setItem(STORAGE_KEY, "1");
    setOpen(false);
    navigate("/finances");
  };

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? setOpen(true) : handleClose())}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
            <FileText className="h-5 w-5 text-primary" />
            Bilan 2025
          </DialogTitle>
          <DialogDescription className="text-sm sm:text-base">
            <span className="inline-flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
              Disponible entre le 4 janvier et le 1er mars.
            </span>
            <div className="mt-2 text-xs sm:text-sm text-muted-foreground">
              Accédez à vos relevés dans la section Finances.
            </div>
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="flex gap-2 sm:gap-3">
          <Button variant="outline" onClick={handleClose} className="text-sm">
            Fermer
          </Button>
          <Button onClick={handleGoToStatements} className="text-sm">
            Voir mes relevés
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default Bilan2025NoticeDialog;