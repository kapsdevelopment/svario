import { Home, RefreshCw } from 'lucide-react';
import { Link, isRouteErrorResponse, useRouteError } from 'react-router-dom';

import { isRouteLoadError } from './lazyRoute';
import { routes } from './routes';

export function RouteErrorPage() {
  const error = useRouteError();
  const isLoadError = isRouteLoadError(error);
  const title = isLoadError ? 'Svario må lastes inn på nytt' : 'Noe gikk galt';
  const message = isLoadError
    ? 'En ny versjon kan ha blitt publisert mens siden var åpen. Last inn på nytt for å hente de siste filene.'
    : getRouteErrorMessage(error);

  return (
    <main className="app-error-page">
      <section className="app-error-panel" aria-labelledby="route-error-title">
        <p className="eyebrow">Svario</p>
        <h1 id="route-error-title">{title}</h1>
        <p>{message}</p>
        <div className="form-actions form-actions--split">
          <button
            className="button button--primary"
            type="button"
            onClick={() => window.location.reload()}
          >
            <RefreshCw size={18} aria-hidden="true" />
            Last inn på nytt
          </button>
          <Link className="button button--secondary" to={routes.home}>
            <Home size={18} aria-hidden="true" />
            Til forsiden
          </Link>
        </div>
      </section>
    </main>
  );
}

function getRouteErrorMessage(error: unknown) {
  if (isRouteErrorResponse(error)) {
    if (error.status === 404) {
      return 'Siden finnes ikke eller er flyttet.';
    }

    return error.statusText || 'Applikasjonen traff en uventet feil.';
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Applikasjonen traff en uventet feil.';
}
