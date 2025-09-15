import * as React from "react";

const MOBILE_BREAKPOINT = 768;

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(
    undefined,
  );

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = () => {
      const newState = window.innerWidth < MOBILE_BREAKPOINT;
      setIsMobile(newState);
      console.log(`useIsMobile: isMobile detected as ${newState} (width: ${window.innerWidth}px)`); // Added log
    };
    mql.addEventListener("change", onChange);
    onChange(); // Initial check
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return !!isMobile;
}