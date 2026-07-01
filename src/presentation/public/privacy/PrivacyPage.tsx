import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Cookie,
  Database,
  Euro,
  EyeOff,
  HeartHandshake,
  LockKeyhole,
  MessageSquare,
  ShieldCheck,
} from 'lucide-react';
import { Link } from 'react-router-dom';

import { routes } from '../../../app/routes';

const promises = [
  {
    icon: EyeOff,
    title: 'Vi bruker ikke svarene dine',
    text: 'Besvarelser brukes ikke til analyse, trening, profilering, annonsering eller andre formål.',
  },
  {
    icon: HeartHandshake,
    title: 'Vi selger aldri data',
    text: 'Svario finansieres ikke gjennom salg av data, datadeling med annonsører eller skjult markedsføring.',
  },
  {
    icon: Cookie,
    title: 'Ingen cookies for sporing',
    text: 'Svario bruker ikke reklamecookies eller tredjepartsanalyse.',
  },
  {
    icon: Database,
    title: 'Data blir værende i databasen',
    text: 'Svar og kontoopplysninger lagres i Europa.',
  },
];

const storedData = [
  'Selve spørreskjemabesvarelsen du sender inn.',
  'Eventuell respondentidentitet dersom skjemaet ber om navn, e-post eller annen identifikasjon.',
  'Brukeridentitet og profilinformasjon dersom du oppretter admin-konto i Svario.',
  'Nødvendig teknisk metadata for drift, sikkerhet og feilsøking.',
];

const noDataUse = [
  'Vi selger ikke data.',
  'Vi bruker ikke data til annonsering.',
  'Vi trener ikke modeller på besvarelser.',
  'Vi lager ikke skjulte markedsføringsprofiler.',
  'Vi deler ikke data med tredjeparter for kommersielle formål.',
];

export function PrivacyPage() {
  return (
    <main className="privacy-page">
      <header className="marketing-topbar">
        <Link className="security-brand" to={routes.home}>
          <span className="brand__mark">S</span>
          <span>
            <strong>Svario</strong>
            <small>Personvern og databruk</small>
          </span>
        </Link>
        <nav className="marketing-topbar__nav" aria-label="Personvernside">
          <Link to={routes.about}>Om Svario</Link>
          <Link to={routes.trust}>Sikkerhet og personvern</Link>
          <Link to={routes.home}>Forside</Link>
          <Link to={routes.security}>Sikkerhet</Link>
          <Link className="button button--secondary" to={routes.login}>
            Logg inn
          </Link>
        </nav>
      </header>

      <section className="privacy-hero" aria-labelledby="privacy-title">
        <div>
          <p className="eyebrow">Personvern</p>
          <h1 id="privacy-title">Dataene dine er ikke produktet vårt</h1>
          <p>
            Svario er en spørreskjematjeneste. Vi vil aldri bruke dataene dine
            til noe annet enn å levere skjema, lagre besvarelser og vise
            resultater til den som eier skjemaet.
          </p>
          <div className="marketing-hero__actions">
            <Link className="button button--primary" to={routes.trust}>
              Åpne sikkerhet og personvern
              <LockKeyhole size={18} aria-hidden="true" />
            </Link>
            <Link className="button button--secondary" to={routes.home}>
              Til forsiden
            </Link>
          </div>
        </div>
      </section>

      <section className="privacy-promise-grid" aria-label="Personvernlofter">
        {promises.map((promise) => {
          const Icon = promise.icon;
          return (
            <article className="privacy-promise" key={promise.title}>
              <Icon size={24} aria-hidden="true" />
              <h2>{promise.title}</h2>
              <p>{promise.text}</p>
            </article>
          );
        })}
      </section>

      <section className="privacy-section privacy-section--split">
        <div>
          <p className="eyebrow">Hva lagres</p>
          <h2>Kun data som trengs for tjenesten</h2>
        </div>
        <div className="security-checklist">
          {storedData.map((item) => (
            <div key={item}>
              <CheckCircle2 size={20} aria-hidden="true" />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="privacy-band">
        <div>
          <p className="eyebrow">Gratis uten skjult betaling</p>
          <h2>Tjenesten er gratis så lenge vi kan forsvare kostnaden</h2>
          <p>
            Eventuelle kostnader skal aldri dekkes gjennom salg av data, skjult
            markedsføring eller utydelige datapartnerskap. Hvis Svario en dag
            må ta betalt, skal det skje gjennom en ærlig og åpen prismodell.
          </p>
        </div>
        <Euro size={42} aria-hidden="true" />
      </section>

      <section className="privacy-section privacy-section--split">
        <div>
          <p className="eyebrow">Hva vi ikke gjør</p>
          <h2>Ingen sekundær bruk av besvarelser</h2>
        </div>
        <div className="privacy-no-list">
          {noDataUse.map((item) => (
            <div key={item}>
              <ShieldCheck size={20} aria-hidden="true" />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="privacy-section privacy-section--split">
        <div>
          <p className="eyebrow">Viktig presisering</p>
          <h2>Ingen produktsporing er ikke det samme som null teknisk drift</h2>
        </div>
        <div className="privacy-copy">
          <p>
            På vanlige nettsider kan hosting- og databaseleverandører behandle
            nødvendige tekniske logger for sikkerhet, feilsøking og drift. Det
            er ikke markedsføring, analyse av respondenter eller salg av data.
          </p>
          <p>
            Svario sitt løfte er at vi ikke legger inn cookies, tredjeparts
            analyse, reklamesporing eller andre skjulte datakanaler for å tjene
            penger på brukerne.
          </p>
        </div>
      </section>

      <section className="privacy-section privacy-section--split">
        <div>
          <p className="eyebrow">Ansvarlig leverandør</p>
          <h2>Kapsdevelopment AS leverer Svario</h2>
        </div>
        <div className="privacy-no-list">
          <div>
            <Building2 size={20} aria-hidden="true" />
            <span>Kapsdevelopment AS, org.nr. 937 284 624.</span>
          </div>
          <div>
            <MessageSquare size={20} aria-hidden="true" />
            <span>
              Personvern- og sikkerhetshenvendelser kan sendes via
              kontaktskjemaet på <Link to={`${routes.about}#contact`}>Om Svario</Link>
              .
            </span>
          </div>
        </div>
      </section>

      <footer className="security-footer">
        <span>Svario Privacy</span>
        <Link to={routes.trust}>
          Sikkerhet og personvern
          <ArrowRight size={17} aria-hidden="true" />
        </Link>
      </footer>
    </main>
  );
}
