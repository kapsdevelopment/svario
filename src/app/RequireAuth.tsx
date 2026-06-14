import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

import { useAuth } from '../application/auth/AuthProvider';
import { Panel } from '../presentation/shared/components/Panel';
import { routes } from './routes';

export function RequireAuth({ children }: { children: ReactNode }) {
  const auth = useAuth();
  const location = useLocation();

  if (auth.status === 'loading' || auth.bootstrapStatus === 'loading') {
    return (
      <main className="auth-page image-page image-page--pine">
        <Panel title="Klargjør konto" subtitle="Svario admin" />
      </main>
    );
  }

  if (auth.status === 'unauthenticated' || auth.status === 'misconfigured') {
    return <Navigate to={routes.login} replace state={{ from: location }} />;
  }

  if (!auth.isAdminReady) {
    return (
      <main className="auth-page image-page image-page--pine">
        <Panel title="Kontoen er ikke klar" subtitle={auth.errorMessage ?? undefined}>
          <button className="button button--secondary" type="button" onClick={auth.signOut}>
            Logg ut
          </button>
        </Panel>
      </main>
    );
  }

  return children;
}
