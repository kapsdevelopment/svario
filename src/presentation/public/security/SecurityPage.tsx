import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Database,
  ExternalLink,
  EyeOff,
  FileText,
  KeyRound,
  LockKeyhole,
  MessageSquare,
  Server,
  ShieldCheck,
  TriangleAlert,
  UserCheck,
} from 'lucide-react';
import { Link } from 'react-router-dom';

import { routes } from '../../../app/routes';

const platformControls = [
  {
    icon: Server,
    title: 'EU/Norden-region',
    text: 'Svario-prosjektet er satt opp med Supabase i North EU. Region og underleverandører dokumenteres for produksjon.',
  },
  {
    icon: LockKeyhole,
    title: 'Kryptering hos plattformen',
    text: 'Supabase oppgir AES-256-kryptering av kundedata ved lagring og TLS for data i transitt.',
  },
  {
    icon: Database,
    title: 'Postgres med RLS',
    text: 'App-tabeller beskyttes med Row Level Security, smale grants og eierkontroller i databasen.',
  },
  {
    icon: UserCheck,
    title: 'Skilt identitetsmodell',
    text: 'Svario skiller innlogget Supabase Auth-bruker fra Svario sin domenekonto og dataeierskap.',
  },
];

const dataPrinciples = [
  'Anonyme skjemaer skal ikke lagre respondentnavn, e-post eller konto-id.',
  'Identifiserte skjemaer skal bare samle inn respondentfelt når skjemaet krever det.',
  'Resultater skal kun leses av skjemaeier eller kontrollerte tjenesteflyter.',
  'Eksport og rapporter skal respektere samme anonymitetsvalg som selve skjemaet.',
];

const assurancePractices = [
  'Offentlig innsending valideres server-side før svar lagres.',
  'Tilgangsregler gjennomgås når datamodellen endres.',
  'Admin-innlogging og session-krav vurderes etter faktisk risikobilde.',
  'Leverandør- og personverndokumentasjon holdes oppdatert.',
  'Slette-, eksport- og retention-rutiner dokumenteres og testes.',
];

const sourceLinks = [
  {
    label: 'Supabase Security',
    href: 'https://supabase.com/security',
  },
  {
    label: 'Supabase DPA',
    href: 'https://supabase.com/legal/dpa',
  },
  {
    label: 'Supabase product security',
    href: 'https://supabase.com/docs/guides/security/product-security',
  },
  {
    label: 'Supabase Vault',
    href: 'https://supabase.com/docs/guides/database/vault',
  },
];

export function SecurityPage() {
  return (
    <main className="security-page">
      <header className="security-topbar">
        <Link className="security-brand" to={routes.home}>
          <span className="brand__mark">S</span>
          <span>
            <strong>Svario</strong>
            <small>Sikkerhet og tillit</small>
          </span>
        </Link>
        <nav className="security-topbar__nav" aria-label="Sikkerhetsside">
          <button onClick={() => scrollToSection('data')} type="button">
            Data
          </button>
          <button onClick={() => scrollToSection('drift')} type="button">
            Drift
          </button>
          <button onClick={() => scrollToSection('status')} type="button">
            Status
          </button>
          <Link to={routes.trust}>Trust Center</Link>
          <Link to={routes.home}>Forside</Link>
          <Link to={routes.privacy}>Personvern</Link>
          <Link className="button button--secondary" to={routes.login}>
            Logg inn
          </Link>
        </nav>
      </header>

      <section className="security-hero" aria-labelledby="security-title">
        <div className="security-hero__content">
          <p className="eyebrow">Sikkerhet og personvern</p>
          <h1 id="security-title">Trygghet for spørreskjemaer med persondata</h1>
          <p className="security-hero__lead">
            Svario bygges for virksomheter som trenger enkel innsamling,
            tydelige resultater og en ryddig sikkerhetsmodell. Denne siden
            beskriver hva som er valgt, hva Supabase dekker, og hvordan
            sikkerhetsarbeidet følges opp.
          </p>
          <div className="security-badges" aria-label="Sikkerhetsstatus">
            <span>Åpen sikkerhetsmodell</span>
            <span>Supabase/Postgres</span>
            <span>Sist oppdatert 21. juni 2026</span>
          </div>
        </div>

        <aside className="security-snapshot" aria-label="Kort oppsummert">
          <div>
            <ShieldCheck size={22} aria-hidden="true" />
            <span>Plattform</span>
            <strong>AES-256 ved lagring og TLS i transitt via Supabase</strong>
          </div>
          <div>
            <KeyRound size={22} aria-hidden="true" />
            <span>Tilgang</span>
            <strong>Supabase Auth, domenekontoer og RLS-eierskap</strong>
          </div>
          <div>
            <EyeOff size={22} aria-hidden="true" />
            <span>Anonymitet</span>
            <strong>Anonymous mode blokkerer respondentidentitet i databasen</strong>
          </div>
        </aside>
      </section>

      <section className="security-section security-section--split" id="drift">
        <div>
          <p className="eyebrow">Plattform</p>
          <h2>Samme type krypteringskontroll som store survey-leverandører beskriver</h2>
        </div>
        <div className="security-copy">
          <p>
            Når leverandører beskriver kryptering av data som er lagret i
            skyplattformen, menes normalt kryptering ved lagring: disker,
            backups og underliggende lagring beskyttes med leverandørstyrte
            nøkler. Supabase beskriver samme hovedkategori for kundedata:
            AES-256 ved lagring og TLS i transitt.
          </p>
          <p>
            Dette er ikke det samme som ende-til-ende-kryptering av hvert
            spørreskjemasvar. Svario må kunne beregne visualiseringer, eksport
            og resultater. Derfor ligger den viktigste app-sikkerheten i RLS,
            dataminimering, smale rettigheter, logging og testede tilgangsregler.
          </p>
        </div>
      </section>

      <section className="security-control-grid" aria-label="Sikkerhetskontroller">
        {platformControls.map((control) => {
          const Icon = control.icon;
          return (
            <article className="security-control" key={control.title}>
              <Icon size={24} aria-hidden="true" />
              <h2>{control.title}</h2>
              <p>{control.text}</p>
            </article>
          );
        })}
      </section>

      <section className="security-section security-section--split" id="data">
        <div>
          <p className="eyebrow">Data i Svario</p>
          <h2>Minst mulig persondata, tydeligst mulig tilgang</h2>
        </div>
        <div className="security-checklist">
          {dataPrinciples.map((principle) => (
            <div key={principle}>
              <CheckCircle2 size={20} aria-hidden="true" />
              <span>{principle}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="security-band" id="status">
        <div>
          <p className="eyebrow">Åpenhet</p>
          <h2>Svario skal ikke overselge sikkerhet</h2>
          <p>
            Supabase har leverandørsertifiseringer og plattformkontroller.
            Svario er ikke selv sertifisert ennå. Sikkerhetskravene
            dokumenteres, testes og holdes oppdatert etter hvert som produktet
            og kundebehovene utvikler seg.
          </p>
        </div>
        <div className="security-status-list">
          {assurancePractices.map((task) => (
            <div key={task}>
              <TriangleAlert size={19} aria-hidden="true" />
              <span>{task}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="security-section security-section--split">
        <div>
          <p className="eyebrow">Dokumentasjon</p>
          <h2>Kilder og leverandørdokumentasjon</h2>
        </div>
        <div className="security-source-list">
          {sourceLinks.map((source) => (
            <a
              href={source.href}
              key={source.href}
              rel="noreferrer"
              target="_blank"
            >
              <FileText size={20} aria-hidden="true" />
              <span>{source.label}</span>
              <ExternalLink size={17} aria-hidden="true" />
            </a>
          ))}
        </div>
      </section>

      <section className="security-section security-section--split">
        <div>
          <p className="eyebrow">Kontaktpunkt</p>
          <h2>Personvern- og sikkerhetshenvendelser går via kontaktskjema</h2>
        </div>
        <div className="security-checklist">
          <div>
            <Building2 size={20} aria-hidden="true" />
            <span>Kapsdevelopment AS, org.nr. 937 284 624, leverer Svario.</span>
          </div>
          <div>
            <MessageSquare size={20} aria-hidden="true" />
            <span>
              Bruk kontaktskjemaet på{' '}
              <a href="https://kapsdevelopment.com/" rel="noreferrer" target="_blank">
                kapsdevelopment.com
              </a>{' '}
              for spørsmål om sikkerhet, personvern eller databehandleravtale.
            </span>
          </div>
        </div>
      </section>

      <footer className="security-footer">
        <span>Svario Trust</span>
        <Link to={routes.trust}>
          Trust Center
          <ArrowRight size={17} aria-hidden="true" />
        </Link>
      </footer>
    </main>
  );
}

function scrollToSection(id: string) {
  document.getElementById(id)?.scrollIntoView({
    behavior: 'smooth',
    block: 'start',
  });
}
