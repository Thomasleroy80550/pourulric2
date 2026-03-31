import { LayoutDashboard, Sparkles } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type DashboardVersionSwitchProps = {
  className?: string;
  theme?: "default" | "inverted";
};

const DashboardVersionSwitch = ({
  className,
  theme = "default",
}: DashboardVersionSwitchProps) => {
  const location = useLocation();
  const isClassic = location.pathname === "/";
  const isV2 = location.pathname === "/home-v2";
  const isInverted = theme === "inverted";

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 rounded-full border p-1",
        isInverted
          ? "border-white/10 bg-white/5 backdrop-blur"
          : "border-border bg-background/80 backdrop-blur",
        className,
      )}
    >
      <Button
        asChild
        size="sm"
        variant={isClassic ? "default" : "ghost"}
        className={cn(
          "rounded-full",
          !isClassic && isInverted && "text-slate-200 hover:bg-white/10 hover:text-white",
        )}
      >
        <Link to="/">
          <LayoutDashboard className="mr-2 h-4 w-4" />
          Dashboard actuel
        </Link>
      </Button>
      <Button
        asChild
        size="sm"
        variant={isV2 ? "default" : "ghost"}
        className={cn(
          "rounded-full",
          !isV2 && isInverted && "text-slate-200 hover:bg-white/10 hover:text-white",
        )}
      >
        <Link to="/home-v2">
          <Sparkles className="mr-2 h-4 w-4" />
          Dashboard V2
        </Link>
      </Button>
    </div>
  );
};

export default DashboardVersionSwitch;
