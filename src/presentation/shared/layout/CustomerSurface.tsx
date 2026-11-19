import type { ReactNode } from 'react';
import { instanceBrand } from '../../../infrastructure/config/instanceBrand';

/** Only opted-in, self-hosted builds get a sender masthead. Hosted layouts stay unchanged. */
export function CustomerSurface({ children }: { children: ReactNode }) {
  const identity = instanceBrand.identity;
  if (!identity || !instanceBrand.logoUrl) return <>{children}</>;
  return <div className="c-surface">
    <header className="c-masthead">
      <img className="c-masthead__logo" src={instanceBrand.logoUrl} alt={identity.organization} />
      <span className="c-masthead__service">{identity.service}</span>
    </header>
    {children}
    {identity.notice && <footer className="c-surface__notice">{identity.notice}</footer>}
  </div>;
}
