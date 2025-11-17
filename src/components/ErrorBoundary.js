import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    // Suppress generic "Script error" messages (often CORS/network related from external scripts)
    if (error && error.message && typeof error.message === 'string' && error.message.includes('Script error')) {
      console.warn('Suppressed generic script error in ErrorBoundary (likely CORS/network related):', error);
      // Don't update state for generic script errors
      return { hasError: false, error: null };
    }
    // For other errors, update state so the UI can render fallback
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Suppress generic "Script error" messages
    if (error && error.message && typeof error.message === 'string' && error.message.includes('Script error')) {
      console.warn('Suppressed generic script error in componentDidCatch (likely CORS/network related):', {
        error,
        errorInfo
      });
      // Clear error state to prevent fallback UI
      this.setState({ hasError: false, error: null });
      return;
    }
    
    // Log other errors
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError && this.state.error) {
      // Only show fallback for non-generic errors
      if (!this.state.error.message || !this.state.error.message.includes('Script error')) {
        return (
          <div className="min-h-screen flex items-center justify-center bg-gray-100">
            <div className="bg-white p-8 rounded-lg shadow-lg max-w-md">
              <h1 className="text-2xl font-bold text-red-600 mb-4">Something went wrong</h1>
              <p className="text-gray-600 mb-4">
                {this.state.error.message || 'An unexpected error occurred'}
              </p>
              <button
                onClick={() => {
                  this.setState({ hasError: false, error: null });
                  window.location.reload();
                }}
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
              >
                Reload Page
              </button>
            </div>
          </div>
        );
      }
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

