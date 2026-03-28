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

function detectTranslationState() {
  if (typeof document === "undefined") {
    return {};
  }

  const html = document.documentElement;
  const body = document.body;
  const root = document.getElementById("root");

  const googleTranslateSelectors = [
    ".goog-te-banner-frame",
    ".goog-te-gadget",
    ".goog-te-combo",
    "iframe.goog-te-banner-frame",
    "[class*='goog-te']",
  ];

  const googleTranslateDetected = googleTranslateSelectors.some((selector) => {
    try {
      return !!document.querySelector(selector);
    } catch {
      return false;
    }
  });

  return {
    documentLang: html.lang || null,
    htmlTranslate: html.getAttribute("translate"),
    bodyTranslate: body?.getAttribute("translate") ?? null,
    rootTranslate: root?.getAttribute("translate") ?? null,
    htmlNoTranslateClass: html.classList.contains("notranslate"),
    bodyNoTranslateClass: body?.classList.contains("notranslate") ?? false,
    rootNoTranslateClass: root?.classList.contains("notranslate") ?? false,
    googleTranslateDetected,
  };
}

function getBrowserMetadata(message?: string): Record<string, unknown> {
  if (typeof window === "undefined") return {};

  try {
    const nav = navigator as Navigator & {
      userAgentData?: { platform?: string; brands?: Array<{ brand: string; version: string }> };
      deviceMemory?: number;
    };

    const suspectedExternalDomMutation =
      typeof message === "string" &&
      (message.toLowerCase().includes("failed to execute 'removechild' on 'node'") ||
        message.toLowerCase().includes("failed to execute 'insertbefore' on 'node'"));

    return {
      href: window.location?.href,
      userAgent: nav.userAgent,
      language: nav.language,
      languages: Array.isArray(nav.languages) ? nav.languages.slice(0, 5) : [],
      platform: nav.userAgentData?.platform ?? nav.platform,
      vendor: nav.vendor,
      onLine: nav.onLine,
      cookieEnabled: nav.cookieEnabled,
      hardwareConcurrency: nav.hardwareConcurrency,
      deviceMemory: nav.deviceMemory,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
        devicePixelRatio: window.devicePixelRatio,
      },
      screen: {
        width: window.screen?.width,
        height: window.screen?.height,
      },
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      suspectedExternalDomMutation,
      ...detectTranslationState(),
    };
  } catch {
    return {};
  }
}

function shouldIgnoreClientError(payload: ClientErrorLogPayload): boolean {
  const message = payload.message.toLowerCase();

  return (
    message.includes("failed to execute 'removechild' on 'node'") ||
    message.includes("failed to execute 'insertbefore' on 'node'")
  );
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
      ...getBrowserMetadata(err.message || "Unknown error"),
      componentStack: scrubStack(errorInfo?.componentStack ?? null),
      context: safeSerialize(context?.extra ?? null),
    },
  };
}

export async function logClientError(payload: ClientErrorLogPayload): Promise<void> {
  if (shouldIgnoreClientError(payload)) {
    return;
  }

  try {
    const { error } = await supabase.functions.invoke("log-client-error", {
      body: payload,
    });

    if (error) {
      console.warn("logClientError failed", error);
    }
  } catch (e) {
    console.warn("logClientError unexpected failure", e);
  }
}
