import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import '@fontsource-variable/manrope';
import { ServicesProvider } from './app/services';
import { AuthProvider } from './features/auth/application/auth-context';
import { AppRouter } from './app/router';
import { ErrorBoundary } from './app/error-boundary';
import './app/styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <ServicesProvider>
          <AuthProvider>
            <AppRouter />
          </AuthProvider>
        </ServicesProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
);
