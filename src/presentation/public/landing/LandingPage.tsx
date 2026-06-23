import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  FileText,
  LockKeyhole,
  ShieldCheck,
} from 'lucide-react';
import { Link } from 'react-router-dom';

import { routes } from '../../../app/routes';

const benefits = [
  {
    icon: FileText,
    title: 'Skjemaer uten støy',
    text: 'Lag enkle spørreskjemaer for puls, kurs, kundeinnsikt og intern evaluering.',
  },
  {
    icon: BarChart3,
    title: 'Resultater som kan brukes',
    text: 'Svar blir til fine visualiseringer som du kan presentere rett fra webapplikasjonen, eller eksportere om du ønsker det.',
  },
  {
    icon: ShieldCheck,
    title: 'Sikkerhet fra starten',
    text: 'Svario bygges på sikker skyløsning i Europa med tilgangsstyring, dataminimering og tydelig dokumentasjon.',
  },
];

const principles = [
  'Gratis',
  'Enkelt og uforpliktende å komme igang',
  'Nøytral respondentopplevelse både på mobil og desktop.',
  'Ta enkelt stilling til om svarene skal være anonyme eller ikke.',
];

export function LandingPage() {
  return (
    <main className="marketing-page">
      <section className="marketing-hero" aria-labelledby="landing-title">
        <header className="marketing-topbar">
          <Link className="security-brand" to={routes.home}>
            <span className="brand__mark">S</span>
            <span>
              <strong>Svario</strong>
              <small>Spørsmål og innsikt</small>
            </span>
          </Link>
          <nav className="marketing-topbar__nav" aria-label="Forside">
            <button onClick={() => scrollToSection('produkt')} type="button">
              Produkt
            </button>
            <Link to={routes.trust}>Trust Center</Link>
            <Link to={routes.privacy}>Personvern</Link>
            <Link className="button button--secondary" to={routes.login}>
              Logg inn
            </Link>
          </nav>
        </header>

        <div className="marketing-hero__content">
          <p className="eyebrow">Spørreskjema for alle som trenger det</p>
          <h1 id="landing-title">Svario</h1>
          <p>
            En gratis spørreskjematjeneste for alle som trenger å samle inn
            svar, forstå resultatene og behandle persondata med respekt.
          </p>
          <div className="marketing-hero__actions">
            <Link className="button button--primary" to={routes.login}>
              Kom i gang
              <ArrowRight size={18} aria-hidden="true" />
            </Link>
            <Link className="button button--secondary" to={routes.trust}>
              Sikkerhet og personvern
            </Link>
          </div>
        </div>
      </section>

      <section className="marketing-intro" id="produkt">
        <div>
          <p className="eyebrow">Hvorfor Svario</p>
          <h2>En enklere vei fra spørsmål til innsikt</h2>
        </div>
        <div className="marketing-copy">
          <p>
            Mange spørreskjemaverktøy er enten for dyre, for tunge eller for
            lite tydelige på persondata. Svario er laget for enkelt oppsett,
            nøytrale respondentopplevelser og gode visualiseringer.
          </p>
          <div className="marketing-principles">
            {principles.map((principle) => (
              <div key={principle}>
                <CheckCircle2 size={19} aria-hidden="true" />
                <span>{principle}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="marketing-benefits" aria-label="Svario-fordeler">
        {benefits.map((benefit) => {
          const Icon = benefit.icon;
          return (
            <article className="marketing-benefit" key={benefit.title}>
              <Icon size={24} aria-hidden="true" />
              <h2>{benefit.title}</h2>
              <p>{benefit.text}</p>
            </article>
          );
        })}
      </section>

      <section className="marketing-trust">
        <div>
          <p className="eyebrow">Trust center</p>
          <h2>Sikkerhetssiden gir god informasjon og oversikt over data og sikkerhet.</h2>
          <p>
            Viktig informasjon om hvordan data behandles, hvor data er lagret
            og løsningen er godt dokumentert i Trust Center. Sjekk det ut.
          </p>
        </div>
        <Link className="button button--primary" to={routes.trust}>
          Åpne Trust Center
          <LockKeyhole size={18} aria-hidden="true" />
        </Link>
      </section>

      <section className="marketing-data-promise">
        <div>
          <p className="eyebrow">Databruk</p>
          <h2>Dataene dine er ikke produktet vårt</h2>
          <p>
            Svario vil aldri selge data, vise skjult markedsføring eller bruke
            besvarelser til andre formål enn selve spørreskjematjenesten.
          </p>
        </div>
        <Link className="button button--secondary" to={routes.privacy}>
          Personvern
        </Link>
      </section>
    </main>
  );
}

function scrollToSection(id: string) {
  document.getElementById(id)?.scrollIntoView({
    behavior: 'smooth',
    block: 'start',
  });
}
