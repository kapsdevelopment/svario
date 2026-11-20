import type { ReactNode } from 'react';

import { instanceBrand } from '../../../infrastructure/config/instanceBrand';
import { Panel } from '../../shared/components/Panel';

export function AuthPageLayout({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="auth-page image-page image-page--pine">
      <Panel title={instanceBrand.presentationOnly ? 'Skjemaportal' : title} subtitle={`${instanceBrand.name} admin`}>
        {instanceBrand.logoUrl ? (
          <img alt="" className="auth-brand__logo" src={instanceBrand.logoUrl} />
        ) : null}
        {instanceBrand.presentationOnly ? (
          <>
            <p>{instanceBrand.tagline}</p>
            <p className="form-alert form-alert--info">
              Privat Svario-prototype. Ingen innlogging eller innsamling av opplysninger.
            </p>
          </>
        ) : (
          <div className="form-stack">{children}</div>
        )}
      </Panel>
    </main>
  );
}
