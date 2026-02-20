import { supabase } from "@/integrations/supabase/client";

export type ErrorLoggingContext = {
  route?: string;
  componentName?: string;
  extra?: unknown;
};

export type ClientErrorLogPayload = {
  route?: string | null;
  component?: string | null;
  message: string;
  stack?: string | null;
  metadata?: Record<string, unknown>;
  user_email?: string | null;
  user_description?: string | null;
};

const redactKeys = new Set(["password", "token", "secret", "authorization", "apikey", "api_key"]);

function safeSerialize(value: unknown): unknown {
  if (value == null) return null;
  if (typeof value === "string") return value.length > 800 ? `${value.slice(0, 800)}…` : value;
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (Array.isArray(value)) return value.slice(0, 20).map(safeSerialize);
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (redactKeys.has(k.toLowerCase())) continue;
      out[k] = safeSerialize(v);
    }
    return out;
  }
  return String(value);
}

function scrubStack(stack?: string | null): string | null {
  if (!stack) return null;
  const lines = stack.split("\n").slice(0, 6).map((l) => l.trim());
  return lines.join("\n");
}

export function buildClientErrorPayload(
  error: unknown,
  context?: ErrorLoggingContext,
  errorInfo?: { componentStack?: string }
): ClientErrorLogPayload {
  const err = error instanceof Error ? error : new Error(typeof error === "string" ? error : "Unknown error");

  return {
    route: context?.route ?? null,
    component: context?.componentName ?? null,
    message: err.message || "Unknown error",
    stack: scrubStack(err.stack ?? null),
    metadata: {
      componentStack: scrubStack(errorInfo?.componentStack ?? null),
      context: safeSerialize(context?.extra ?? null),

    },
  };
}

export async function logClientError(payload: ClientErrorLogPayload): Promise<void> {
  // Fire-and-forget behavior: callers typically shouldn't await.
  try {
    const { error } = await supabase.functions.invoke("log-client-error", {
      body: payload,
    });

    if (error) {
      // Swallow errors to avoid crashing the UI.
      // eslint-disable-next-line no-console
      console.warn("logClientError failed", error);
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn("logClientError unexpected failure", e);
  }
}
