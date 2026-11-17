import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { isCustomerBuild } from './infrastructure/config/instanceBrand';
import { captureEmailCallback } from './domain/instance/emailCallback';
import './styles/global.css';

async function start() {
  if (isCustomerBuild) {
    // Capture before importing the Auth client: its constructor starts consuming the URL.
    const callback = captureEmailCallback(window.location.hash);
    const { initializeCustomerEmailFlow } = await import('./application/auth/customerEmailFlow');
    await initializeCustomerEmailFlow(callback);
  }
  // The hash router must be created AFTER consuming an Auth email callback.
  const { SvarioApp } = await import('./app/SvarioApp');
  createRoot(document.getElementById('root')!).render(<StrictMode><SvarioApp /></StrictMode>);
}
void start();
