import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

// Suppress generic "Script error" messages EARLY (after imports but before React renders)
// These errors are often CORS/network related from external scripts (PayPal SDK, etc.)
(function() {
  const originalConsoleError = console.error;
  console.error = function(...args) {
    // Check if any argument contains "Script error"
    const hasScriptError = args.some(arg => 
      (typeof arg === 'string' && arg.includes('Script error')) ||
      (arg && arg.message && typeof arg.message === 'string' && arg.message.includes('Script error'))
    );
    
    if (hasScriptError) {
      // Suppress generic script errors - just log to console.warn instead
      console.warn('Suppressed generic script error (likely CORS/network related from external script):', ...args);
      return;
    }
    
    // Let other errors through
    originalConsoleError.apply(console, args);
  };
})();

// Early error suppression - catch errors before React's error overlay
(function() {
  // Suppress generic script errors in window.onerror
  const originalOnError = window.onerror;
  window.onerror = function(message, source, lineno, colno, error) {
    // Suppress generic "Script error" messages
    if (message && typeof message === 'string' && message.includes('Script error')) {
      console.warn('Suppressed generic script error (likely CORS/network related):', {
        message,
        source,
        lineno,
        colno
      });
      return true; // Suppress the error
    }
    
    // Let other errors through to original handler or React
    if (originalOnError) {
      return originalOnError.call(this, message, source, lineno, colno, error);
    }
    return false;
  };

  // Suppress generic script errors in unhandled promise rejections
  window.addEventListener('unhandledrejection', function(event) {
    const errorMessage = event.reason?.message || event.reason?.toString() || '';
    if (typeof errorMessage === 'string' && errorMessage.includes('Script error')) {
      console.warn('Suppressed generic script error in promise rejection (likely CORS/network related):', event.reason);
      event.preventDefault();
      event.stopPropagation();
    }
  }, true);

  // Suppress generic script errors in error events
  window.addEventListener('error', function(event) {
    if (event.message && typeof event.message === 'string' && event.message.includes('Script error')) {
      console.warn('Suppressed generic script error event (likely CORS/network related):', event);
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
    }
  }, true);
})();

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
