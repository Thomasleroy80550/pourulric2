import React, { useEffect, useMemo, useRef, useState } from "react";
import { useInRouterContext, useLocation } from "react-router-dom";
import { AlertTriangle } from "lucide-react";

import { ErrorBoundary, ErrorBoundaryContext } from "@/components/ErrorBoundary";
import ErrorReportDialog from "@/components/ErrorReportDialog";
import { buildClientErrorPayload, logClientError } from "@/lib/error-logging-api";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export type SectionErrorBoundaryProps = {
  componentName: string;
  extra?: unknown;
  kind?: "section" | "global";
  children: React.ReactNode;

  /** Dev helper: render the fallback UI without actually throwing a runtime error. */
  simulateError?: boolean;
  simulateErrorMessage?: string;

  /** Optional hook invoked when user clicks "Réessayer". */
  onRetry?: () => void;
};

type SectionErrorBoundaryBaseProps = {
  route?: string;
} & SectionErrorBoundaryProps;

function SectionErrorBoundaryBase({
  route,
  componentName,
  extra,
  kind = "section",
  children,
  simulateError,
  simulateErrorMessage,
  onRetry,
}: SectionErrorBoundaryBaseProps) {
  const [resetKey, setResetKey] = useState(0);
  const [reportOpen, setReportOpen] = useState(false);
  const simulatedLoggedSignatureRef = useRef<string | null>(null);

  const context: ErrorBoundaryContext = useMemo(
    () => ({ route, componentName, extra }),
    [route, componentName, extra]
  );

  const wrapperClassName = kind === "global" ? "mx-auto w-full max-w-3xl p-4" : "w-full";

  const renderFallback = (error: Error, errorInfo?: { componentStack?: string }, reset?: () => void) => {
    const payload = buildClientErrorPayload(
      error,
      { route: context?.route, componentName: context?.componentName, extra: context?.extra },
      { componentStack: errorInfo?.componentStack }
    );

    const details = {
      message: payload.message,
      route: payload.route,
      component: payload.component,
      stack: payload.stack,
      componentStack: (payload.metadata as any)?.componentStack as string | undefined,
    };

    return (
      <div className={wrapperClassName}>
        <Alert variant="destructive" className="shadow-sm">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Une erreur est survenue dans cette section</AlertTitle>
          <AlertDescription className="mt-2 space-y-3">
            <div className="text-sm">
              La section n’a pas pu s’afficher correctement. Vous pouvez réessayer, ou signaler le problème.
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="secondary"
                onClick={() => {
                  onRetry?.();
                  setResetKey((k) => k + 1);
                  reset?.();
                }}
              >
                Réessayer
              </Button>
              <Button variant="outline" onClick={() => setReportOpen(true)}>
                Signaler un problème
              </Button>
            </div>

            <Accordion type="single" collapsible>
              <AccordionItem value="details">
                <AccordionTrigger>Voir les détails</AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-3">
                    <div className="text-xs">
                      <div>
                        <span className="font-medium">Route:</span> {details.route ?? "—"}
                      </div>
                      <div>
                        <span className="font-medium">Composant:</span> {details.component ?? "—"}
                      </div>
                      <div>
                        <span className="font-medium">Message:</span> {details.message}
                      </div>
                    </div>

                    {details.stack ? (
                      <pre className="max-h-48 overflow-auto rounded-md bg-background/60 p-3 text-xs leading-relaxed">
                        {details.stack}
                      </pre>
                    ) : null}

                    {details.componentStack ? (
                      <pre className="max-h-48 overflow-auto rounded-md bg-background/60 p-3 text-xs leading-relaxed">
                        {details.componentStack}
                      </pre>
                    ) : null}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </AlertDescription>
        </Alert>

        <ErrorReportDialog
          open={reportOpen}
          onOpenChange={setReportOpen}
          error={error}
          errorInfo={{ componentStack: errorInfo?.componentStack }}
          context={{ route: context?.route, componentName: context?.componentName, extra: context?.extra }}
        />
      </div>
    );
  };

  // Dev-only path: show fallback without throwing a runtime error (avoids dev overlay).
  useEffect(() => {
    if (!simulateError) {
      simulatedLoggedSignatureRef.current = null;
      return;
    }

    const error = new Error(simulateErrorMessage ?? "Simulated ErrorBoundary test");
    const signature = `${componentName}|${route ?? ""}|${error.message}`;
    if (simulatedLoggedSignatureRef.current === signature) return;
    simulatedLoggedSignatureRef.current = signature;

    void logClientError(
      buildClientErrorPayload(error, { route, componentName, extra }, { componentStack: "(simulated)" })
    );
  }, [componentName, extra, route, simulateError, simulateErrorMessage]);

  if (simulateError) {
    return renderFallback(new Error(simulateErrorMessage ?? "Simulated ErrorBoundary test"), { componentStack: "(simulated)" });
  }

  return (
    <ErrorBoundary
      resetKey={resetKey}
      context={context}
      onError={(error, errorInfo, ctx) => {
        void logClientError(
          buildClientErrorPayload(error, { route: ctx?.route, componentName: ctx?.componentName, extra: ctx?.extra }, errorInfo)
        );
      }}
      fallbackRender={({ error, errorInfo, reset }) => renderFallback(error, { componentStack: errorInfo?.componentStack }, reset)}
    >
      {children}
    </ErrorBoundary>
  );
}

function SectionErrorBoundaryWithLocation(props: SectionErrorBoundaryProps) {
  const location = useLocation();
  return <SectionErrorBoundaryBase {...props} route={location.pathname} />;
}

export default function SectionErrorBoundary(props: SectionErrorBoundaryProps) {
  const inRouter = useInRouterContext();
  if (!inRouter) {
    return <SectionErrorBoundaryBase {...props} route={undefined} />;
  }
  return <SectionErrorBoundaryWithLocation {...props} />;
}