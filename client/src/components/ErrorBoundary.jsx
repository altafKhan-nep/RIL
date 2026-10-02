import { Component } from 'react';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  handleTryAgain = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <main className="flex-1 flex items-center justify-center px-4 py-16 bg-background">
          <div className="w-full max-w-md text-center">
            <div className="w-20 h-20 rounded-2xl bg-error-container flex items-center justify-center mx-auto mb-6">
              <span className="material-symbols-outlined text-4xl text-on-error-container" style={{ fontVariationSettings: "'FILL' 1" }}>
                error
              </span>
            </div>
            <h1 className="text-2xl font-bold text-on-surface mb-2">Something went wrong</h1>
            <p className="text-sm text-on-surface-variant mb-8 leading-relaxed">
              We encountered an unexpected error. Don't worry, your data is safe. You can try again or head back home.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={this.handleTryAgain}
                className="btn-primary text-on-primary-container font-semibold px-6 py-3 rounded-xl flex items-center justify-center gap-2 text-sm w-full sm:w-auto"
              >
                <span className="material-symbols-outlined text-lg">refresh</span>
                Try Again
              </button>
              <a
                href="/"
                className="btn-ghost font-semibold px-6 py-3 rounded-xl flex items-center justify-center gap-2 text-sm w-full sm:w-auto"
              >
                <span className="material-symbols-outlined text-lg">                home</span>
                Go Home
              </a>
            </div>
            {this.state.error && (
              <details className="mt-8 text-left">
                <summary className="text-xs text-on-surface-variant cursor-pointer hover:text-primary transition-colors font-medium">
                  Technical Details
                </summary>
                <pre className="mt-2 p-4 bg-surface-container-low rounded-xl text-xs text-on-surface-variant overflow-x-auto border border-surface-container/60">
                  {this.state.error.message}
                </pre>
              </details>
            )}
          </div>
        </main>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
