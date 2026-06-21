import {
  ArrowRight,
  Building2,
  ExternalLink,
  FileText,
  MessageSquare,
} from 'lucide-react';
import { Link } from 'react-router-dom';

import { routes } from '../../../app/routes';
import { trustDocuments, trustHighlights, trustReferences } from './trustContent';

export function TrustCenterPage() {
  return (
    <main className="trust-page">
      <header className="security-topbar">
        <Link className="security-brand" to={routes.home}>
          <span className="brand__mark">S</span>
          <span>
            <strong>Svario</strong>
            <small>Trust Center</small>
          </span>
        </Link>
        <nav className="security-topbar__nav" aria-label="Trust Center">
          <Link to={routes.privacy}>Personvern</Link>
          <Link to={routes.security}>Sikkerhet</Link>
          <Link to={routes.home}>Forside</Link>
          <Link className="button button--secondary" to={routes.login}>
            Logg inn
          </Link>
        </nav>
      </header>

      <section className="trust-hero" aria-labelledby="trust-title">
        <div>
          <p className="eyebrow">Svario Trust Center</p>
          <h1 id="trust-title">Personvern, sikkerhet og databehandlerinformasjon samlet ett sted</h1>
          <p>
            Svario bygges for enkel innsamling av svar med tydelig
            ansvarsdeling, minst mulig persondata og praktiske
            personverninnstillinger i produktet.
          </p>
          <div className="security-badges" aria-label="Trust Center status">
            <span>Under utvikling</span>
            <span>Kapsdevelopment AS</span>
            <span>Sist oppdatert 21. juni 2026</span>
          </div>
        </div>
      </section>

      <section className="trust-highlight-grid" aria-label="Nøkkeltiltak">
        {trustHighlights.map((highlight) => {
          const Icon = highlight.icon;
          return (
            <article className="trust-highlight" key={highlight.title}>
              <Icon size={24} aria-hidden="true" />
              <h2>{highlight.title}</h2>
              <p>{highlight.text}</p>
            </article>
          );
        })}
      </section>

      <section className="trust-section" aria-labelledby="trust-documents">
        <div className="trust-section__header">
          <p className="eyebrow">Dokumenter</p>
          <h2 id="trust-documents">Offentlige arbeidsutkast</h2>
          <p>
            Dokumentene er skrevet med inspirasjon fra nordiske
            spørreskjemaleverandører og Datatilsynet, men med Svario sin egen
            ordlyd og status. De må juridisk kvalitetssikres før de brukes som
            bindende avtale.
          </p>
        </div>

        <div className="trust-document-grid">
          {trustDocuments.map((document) => {
            const Icon = document.icon;
            return (
              <Link
                className="trust-document-card"
                key={document.slug}
                to={routes.trustDocument(document.slug)}
              >
                <Icon size={24} aria-hidden="true" />
                <span>{document.eyebrow}</span>
                <h3>{document.shortTitle}</h3>
                <p>{document.summary}</p>
                <small>{document.status}</small>
                <strong>
                  Les dokumentet
                  <ArrowRight size={17} aria-hidden="true" />
                </strong>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="trust-band">
        <div>
          <p className="eyebrow">Kontaktpunkt</p>
          <h2>Kontakt via skjema, ikke åpen e-postadresse</h2>
          <p>
            Personvern- og sikkerhetshenvendelser kan sendes via
            kontaktskjemaet på Kapsdevelopment sin nettside. Det lar oss ha et
            tydelig offentlig kontaktpunkt uten å publisere e-postadressen i
            klartekst på web.
          </p>
        </div>
        <div className="trust-contact-list">
          <div>
            <Building2 size={20} aria-hidden="true" />
            <span>Kapsdevelopment AS, org.nr. 937 284 624</span>
          </div>
          <a href="https://kapsdevelopment.com/" rel="noreferrer" target="_blank">
            <MessageSquare size={20} aria-hidden="true" />
            <span>Kontaktskjema på kapsdevelopment.com</span>
            <ExternalLink size={17} aria-hidden="true" />
          </a>
        </div>
      </section>

      <section className="trust-section trust-section--split">
        <div>
          <p className="eyebrow">Referanser</p>
          <h2>Kilder og formatinspirasjon</h2>
        </div>
        <div className="security-source-list">
          {trustReferences.map((source) => (
            <a href={source.href} key={source.href} rel="noreferrer" target="_blank">
              <FileText size={20} aria-hidden="true" />
              <span>{source.label}</span>
              <ExternalLink size={17} aria-hidden="true" />
            </a>
          ))}
        </div>
      </section>

      <footer className="security-footer">
        <span>Svario Trust Center</span>
        <Link to={routes.home}>
          Til forsiden
          <ArrowRight size={17} aria-hidden="true" />
        </Link>
      </footer>
    </main>
  );
}
