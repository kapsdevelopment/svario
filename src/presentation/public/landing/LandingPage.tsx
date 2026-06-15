import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  FileText,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
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
    text: 'Svar skal bli til ryddige visualiseringer, eksport og rapporter uten tung analysejobb.',
  },
  {
    icon: ShieldCheck,
    title: 'Sikkerhet fra starten',
    text: 'Svario bygges på Supabase/Postgres med RLS, dataminimering og tydelig trust-dokumentasjon.',
  },
];

const principles = [
  'Billig eller gratis å komme i gang',
  'God nok til de fleste vanlige spørrebehov',
  'Rolig respondentflyt på mobil og desktop',
  'Tydelig skille mellom anonyme og identifiserte svar',
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
            <Link to={routes.security}>Sikkerhet</Link>
            <Link className="button button--secondary" to={routes.login}>
              Logg inn
            </Link>
          </nav>
        </header>

        <div className="marketing-hero__content">
          <p className="eyebrow">Spørreskjema for små og mellomstore virksomheter</p>
          <h1 id="landing-title">Svario</h1>
          <p>
            En rimelig spørreskjematjeneste for virksomheter som vil samle inn
            svar, forstå resultatene og behandle persondata med respekt.
          </p>
          <div className="marketing-hero__actions">
            <Link className="button button--primary" to={routes.login}>
              Gå til admin
              <ArrowRight size={18} aria-hidden="true" />
            </Link>
            <Link className="button button--secondary" to={routes.security}>
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
            lite tydelige på persondata. Svario er laget for praktiske
            adminflyter, rolige respondentopplevelser og gode visualiseringer.
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
          <h2>Sikkerhetssiden skal være like praktisk som produktet</h2>
          <p>
            Svario beskriver hva som er beskyttet av Supabase, hva appen selv
            kontrollerer, og hvilke krav som må være ferdige før produksjon.
          </p>
        </div>
        <Link className="button button--primary" to={routes.security}>
          Les sikkerhetssiden
          <LockKeyhole size={18} aria-hidden="true" />
        </Link>
      </section>

      <section className="marketing-preview" aria-label="Produktretning">
        <div className="marketing-preview__panel">
          <div>
            <Sparkles size={20} aria-hidden="true" />
            <span>Kommer i Svario</span>
          </div>
          <h2>Skjemabygger, respondentflyt, resultater og eksport i samme rolige arbeidsflate.</h2>
        </div>
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
