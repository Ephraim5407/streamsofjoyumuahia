import React, { Component } from "react";
import type { ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class GlobalErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  private handleGoHome = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = "/home";
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[100dvh] w-full flex-col items-center justify-center bg-background p-6 text-center">
          <div className="mb-8 flex h-20 w-20 items-center justify-center rounded-3xl bg-error/10 text-error">
            <AlertTriangle size={40} />
          </div>

          <h1 className="mb-2 text-2xl font-bold text-text">
            Something went wrong
          </h1>
          <p className="mb-8 max-w-md text-text-secondary">
            An unexpected error occurred. This might be due to a connectivity issue or a temporary glitch.
          </p>

          <div className="flex flex-col w-full max-w-xs gap-3">
            <button
              onClick={this.handleReset}
              className="flex items-center justify-center gap-2 rounded-2xl bg-primary px-6 py-4 font-bold text-white shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-95"
            >
              <RefreshCw size={20} />
              Try Again
            </button>

            <button
              onClick={this.handleGoHome}
              className="flex items-center justify-center gap-2 rounded-2xl bg-surface px-6 py-4 font-bold text-text border border-border transition-all hover:bg-background active:scale-95"
            >
              <Home size={20} />
              Go to Homepage
            </button>
          </div>

          {import.meta.env.DEV && (
            <div className="mt-12 w-full max-w-2xl overflow-hidden rounded-2xl border border-border bg-surface text-left">
              <div className="border-b border-border bg-background px-4 py-2 text-xs font-mono font-bold uppercase tracking-wider text-text-muted">
                Error Details (Dev Only)
              </div>
              <pre className="overflow-auto p-4 text-xs font-mono text-error">
                {this.state.error?.stack}
              </pre>
            </div>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default GlobalErrorBoundary;
