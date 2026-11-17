import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { isCustomerBuild } from './infrastructure/config/instanceBrand';
import './styles/global.css';

async function start() {
  if (isCustomerBuild) {
    const { initializeCustomerEmailFlow } = await import('./application/auth/customerEmailFlow');
    await initializeCustomerEmailFlow();
  }
  // The hash router must be created AFTER consuming an Auth email callback.
  const { SvarioApp } = await import('./app/SvarioApp');
  createRoot(document.getElementById('root')!).render(<StrictMode><SvarioApp /></StrictMode>);
}
void start();
