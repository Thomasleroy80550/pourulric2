import React, { useMemo, useState } from "react";
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
};

type SectionErrorBoundaryBaseProps = {
  route?: string;
} & SectionErrorBoundaryProps;

function SectionErrorBoundaryBase({ route, componentName, extra, kind = "section", children }: SectionErrorBoundaryBaseProps) {
  const [resetKey, setResetKey] = useState(0);
  const [reportOpen, setReportOpen] = useState(false);

  const context: ErrorBoundaryContext = useMemo(
    () => ({ route, componentName, extra }),
    [route, componentName, extra]
  );

  const wrapperClassName = kind === "global" ? "mx-auto w-full max-w-3xl p-4" : "w-full";

  return (
    <ErrorBoundary
      resetKey={resetKey}
      context={context}
      onError={(error, errorInfo, ctx) => {
        void logClientError(
          buildClientErrorPayload(error, { route: ctx?.route, componentName: ctx?.componentName, extra: ctx?.extra }, errorInfo)
        );
      }}
      fallbackRender={({ error, errorInfo, context: ctx, reset }) => {
        const payload = buildClientErrorPayload(
          error,
          { route: ctx?.route, componentName: ctx?.componentName, extra: ctx?.extra },
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
                      setResetKey((k) => k + 1);
                      reset();
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
              context={{ route: ctx?.route, componentName: ctx?.componentName, extra: ctx?.extra }}
            />
          </div>
        );
      }}
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