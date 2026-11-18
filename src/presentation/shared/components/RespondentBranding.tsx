import { type CSSProperties, type ReactNode, useId } from 'react';

import type { RespondentBranding } from '../../../domain/workspaces/workspace';
import { Panel } from './Panel';
import './respondentBranding.css';

export function RespondentBrandingService() {
  return (
    <header className="respondent-branding-service">
      <span aria-hidden="true">S</span> Svario
    </header>
  );
}

export function RespondentSurveyCard({ branding, title, subtitle, children, titleAs: Title = 'h1' }: {
  branding?: RespondentBranding | null;
  title: string;
  subtitle?: string;
  children?: ReactNode;
  titleAs?: 'h1' | 'h3';
}) {
  const titleId = useId();
  if (!branding) return <Panel title={title} subtitle={subtitle}>{children}</Panel>;

  return (
    <section className="respondent-branding-card" aria-labelledby={titleId}
      style={{ '--respondent-accent': branding.accentColor } as CSSProperties}>
      <header>
        {branding.logoSrc ? <img className="respondent-branding__logo" src={branding.logoSrc} alt={branding.displayName} />
          : <p className="respondent-branding-placeholder">Velg en logo for å se profilen.</p>}
        <Title className="respondent-branding-card__title" id={titleId}>{title}</Title>
        {subtitle ? <p className="respondent-branding-card__meta">{subtitle}</p> : null}
      </header>
      {children ? <div className="respondent-branding-card__body">{children}</div> : null}
    </section>
  );
}

export function RespondentBrandingCredit() {
  return <footer className="respondent-branding__credit">Levert av Svario</footer>;
}

export function RespondentBrandingPreview({ branding }: { branding: RespondentBranding }) {
  return (
    <div className="branding-admin-preview">
      <RespondentBrandingService />
      <RespondentSurveyCard branding={branding} title="Eksempelskjema" titleAs="h3">
        <p>Hjelp oss å gjøre neste samling bedre.</p>
        <p className="respondent-branding-preview__question">Hvor nyttig var samlingen for deg?</p>
        <ul className="respondent-branding-preview__choices" aria-label="Eksempel på svaralternativer">
          <li>Veldig nyttig</li>
          <li>Ganske nyttig</li>
          <li>Lite nyttig</li>
        </ul>
      </RespondentSurveyCard>
      <RespondentBrandingCredit />
    </div>
  );
}
