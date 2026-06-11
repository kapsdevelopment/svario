import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { SvarioApp } from './app/SvarioApp';
import './styles/global.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SvarioApp />
  </StrictMode>,
);
