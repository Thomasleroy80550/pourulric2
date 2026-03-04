import React, { useEffect, useRef } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

import SectionErrorBoundary from "@/components/SectionErrorBoundary";

export default function GlobalAppErrorBoundary({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navType = useNavigationType();
  const previousPathRef = useRef<string | null>(null);

  useEffect(() => {
    previousPathRef.current = location.pathname;
  }, [location.pathname]);

  return (
    <SectionErrorBoundary
      kind="global"
      componentName="AppRoutes"
      extra={{
        navigationType: navType,
        previousRoute: previousPathRef.current,
      }}
    >
      {children}
    </SectionErrorBoundary>
  );
}
