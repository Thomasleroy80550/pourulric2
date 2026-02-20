import React from "react";

export type ErrorBoundaryContext = {
  route?: string;
  componentName?: string;
  extra?: unknown;
};

type FallbackRenderArgs = {
  error: Error;
  errorInfo?: React.ErrorInfo;
  context?: ErrorBoundaryContext;
  reset: () => void;
};

export type ErrorBoundaryProps = {
  children: React.ReactNode;
  context?: ErrorBoundaryContext;
  resetKey?: string | number;
  onError?: (error: Error, errorInfo: React.ErrorInfo | undefined, context: ErrorBoundaryContext | undefined) => void;
  fallbackRender: (args: FallbackRenderArgs) => React.ReactNode;
};

type ErrorBoundaryState = {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
};

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    hasError: false,
  };

  private lastLoggedSignature: string | null = null;

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Keep errorInfo for UI / reporting.
    this.setState({ errorInfo });

    const signature = `${this.props.context?.componentName ?? "unknown"}|${this.props.context?.route ?? ""}|${error.name}|${error.message}`;
    if (this.lastLoggedSignature === signature) return;
    this.lastLoggedSignature = signature;

    this.props.onError?.(error, errorInfo, this.props.context);
  }

  componentDidUpdate(prevProps: Readonly<ErrorBoundaryProps>) {
    if (prevProps.resetKey !== this.props.resetKey && this.state.hasError) {
      this.reset();
    }
  }

  reset = () => {
    this.lastLoggedSignature = null;
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      return this.props.fallbackRender({
        error: this.state.error,
        errorInfo: this.state.errorInfo,
        context: this.props.context,
        reset: this.reset,
      });
    }

    // Remount subtree when resetKey changes.
    return <React.Fragment key={String(this.props.resetKey ?? "0")}>{this.props.children}</React.Fragment>;
  }
}
