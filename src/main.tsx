import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { initializeAuthCallback } from './app/initializeAuthCallback';
import './styles/global.css';

const root = createRoot(document.getElementById('root')!);
root.render(
  <div className="route-loading" role="status">Laster...</div>,
);

void startApp();

async function startApp() {
  try {
    // Auth links and HashRouter both use the URL fragment. Finish auth before creating the router.
    await initializeAuthCallback();
    const { SvarioApp } = await import('./app/SvarioApp');
    root.render(
      <StrictMode>
        <SvarioApp />
      </StrictMode>,
    );
  } catch {
    root.render(
      <main className="app-error-page">
        <section className="app-error-panel">
          <h1>Kunne ikke laste siden</h1>
          <p>Sjekk nettforbindelsen og prøv igjen.</p>
          <button className="button button--primary" onClick={() => window.location.reload()}>
            Last inn på nytt
          </button>
        </section>
      </main>,
    );
  }
}
