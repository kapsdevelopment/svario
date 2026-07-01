import {
  ArrowRight,
  Bug,
  Building2,
  CheckCircle2,
  ExternalLink,
  HeartHandshake,
  Lightbulb,
  MailCheck,
  MessageSquare,
  ShieldCheck,
} from 'lucide-react';
import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from 'react';
import { Link, useLocation } from 'react-router-dom';

import { routes } from '../../../app/routes';

const purposeItems = [
  {
    icon: CheckCircle2,
    title: 'Lav terskel',
    text: 'Svario skal være enkelt nok til raske evalueringer, pulsmålinger og små undersøkelser.',
  },
  {
    icon: ShieldCheck,
    title: 'Ryddig databruk',
    text: 'Tjenesten bygges med tydelige valg for anonymitet, persondata og tilgang til resultater.',
  },
  {
    icon: HeartHandshake,
    title: 'Rolig opplevelse',
    text: 'Respondenter skal møte et nøytralt skjema som fungerer godt på mobil og desktop.',
  },
] as const;

const contactReasons = [
  {
    icon: Lightbulb,
    title: 'Funksjonsønsker',
    text: 'Fortell hva som ville gjort Svario mer nyttig i din arbeidshverdag.',
  },
  {
    icon: Bug,
    title: 'Feil eller friksjon',
    text: 'Meld fra hvis noe ikke virker, oppleves uklart eller stopper en flyt.',
  },
  {
    icon: MailCheck,
    title: 'Spørsmål',
    text: 'Ta kontakt om produktet, personvern, sikkerhet eller bruksmåter.',
  },
] as const;

const subjectOptions = [
  'Funksjonsønske',
  'Feilrapport',
  'Spørsmål om Svario',
  'Personvern eller sikkerhet',
  'Annet',
] as const;

type FormStatusState = 'idle' | 'pending' | 'success' | 'error';

type FormStatus = {
  state: FormStatusState;
  message: string;
};

const initialStatus: FormStatus = {
  state: 'idle',
  message: '',
};

export function AboutPage() {
  const location = useLocation();
  const formRef = useRef<HTMLFormElement | null>(null);
  const pendingRef = useRef(false);
  const timeoutRef = useRef<number | null>(null);
  const [nextUrl, setNextUrl] = useState('');
  const [formStatus, setFormStatus] = useState<FormStatus>(initialStatus);

  useEffect(() => {
    setNextUrl(window.location.href);
  }, [location.pathname, location.search, location.hash]);

  useEffect(() => {
    if (!location.hash) {
      return;
    }

    const elementId = decodeURIComponent(location.hash.slice(1));
    const animationFrame = window.requestAnimationFrame(() => {
      document.getElementById(elementId)?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    });

    return () => window.cancelAnimationFrame(animationFrame);
  }, [location.hash]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  function handleSubmit(_event: FormEvent<HTMLFormElement>) {
    pendingRef.current = true;
    setFormStatus({
      state: 'pending',
      message: 'Sender meldingen din...',
    });

    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = window.setTimeout(() => {
      if (!pendingRef.current) {
        return;
      }

      pendingRef.current = false;
      setFormStatus({
        state: 'error',
        message:
          'Vi kunne ikke bekrefte innsendingen akkurat nå. Prøv igjen, eller send e-post til contact@kapsdevelopment.com.',
      });
    }, 9000);
  }

  function handleIframeLoad() {
    if (!pendingRef.current) {
      return;
    }

    pendingRef.current = false;

    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
    }

    setFormStatus({
      state: 'success',
      message: 'Takk! Meldingen er sendt. Vi følger opp så fort vi kan.',
    });
    window.setTimeout(() => formRef.current?.reset(), 60);
  }

  const isSubmitting = formStatus.state === 'pending';

  return (
    <main className="about-page">
      <header className="marketing-topbar">
        <Link className="security-brand" to={routes.home}>
          <span className="brand__mark">S</span>
          <span>
            <strong>Svario</strong>
            <small>Om tjenesten</small>
          </span>
        </Link>
        <nav className="marketing-topbar__nav" aria-label="Om Svario">
          <button onClick={() => scrollToSection('purpose')} type="button">
            Formål
          </button>
          <button onClick={() => scrollToSection('contact')} type="button">
            Kontakt
          </button>
          <Link to={routes.demo}>Se Svario i bruk</Link>
          <Link to={routes.trust}>Sikkerhet og personvern</Link>
          <Link className="button button--secondary" to={routes.login}>
            Logg inn
          </Link>
        </nav>
      </header>

      <section className="about-hero" aria-labelledby="about-title">
        <div>
          <p className="eyebrow">Om Svario</p>
          <h1 id="about-title">Et roligere spørreskjemaverktøy for praktisk innsikt</h1>
          <p>
            Svario er laget for å gjøre det enkelt å lage spørreskjemaer,
            samle inn svar og forstå resultatene uten at verktøyet blir større
            enn oppgaven.
          </p>
          <div className="marketing-hero__actions">
            <Link className="button button--primary" to={routes.login}>
              Kom i gang
              <ArrowRight size={18} aria-hidden="true" />
            </Link>
            <button
              className="button button--secondary"
              onClick={() => scrollToSection('contact')}
              type="button"
            >
              Kontakt oss
            </button>
          </div>
        </div>
      </section>

      <section className="about-section about-section--split" id="purpose">
        <div>
          <p className="eyebrow">Formål</p>
          <h2>Bygget for alle som trenger en enkel måte å samle inn svar</h2>
        </div>
        <div className="about-copy">
          <p>
            Målet med Svario er å gi virksomheter, team og enkeltpersoner en
            enkel måte å spørre, lære og følge opp på. Produktet prioriterer
            raske adminflyter, gode resultatsider og en respondentopplevelse
            som ikke stjeler oppmerksomhet fra spørsmålene.
          </p>
          <p>
            Svario skal være tydelig på personvern og sikkerhet fra starten av:
            hvem som eier skjemaet, hva som samles inn, og hvem som kan lese
            resultatene.
          </p>
        </div>
      </section>

      <section className="about-value-grid" aria-label="Svarios prinsipper">
        {purposeItems.map((item) => {
          const Icon = item.icon;
          return (
            <article className="about-value" key={item.title}>
              <Icon size={24} aria-hidden="true" />
              <h2>{item.title}</h2>
              <p>{item.text}</p>
            </article>
          );
        })}
      </section>

      <a
        aria-label="Les mer om Kapsdevelopment AS på kapsdevelopment.no"
        className="about-band"
        href="https://kapsdevelopment.no/"
        rel="noreferrer"
        target="_blank"
      >
        <div>
          <p className="eyebrow">Laget av</p>
          <h2>Kapsdevelopment AS utvikler og leverer Svario</h2>
          <p>
            Svario er et produkt fra Kapsdevelopment AS, org.nr. 937 284 624.
            Siden produktet fortsatt utvikles aktivt, er tilbakemeldinger om
            behov, feil og praktiske arbeidsflyter spesielt verdifulle.
          </p>
        </div>
        <span className="about-band__icon" aria-hidden="true">
          <Building2 size={42} />
          <ExternalLink size={18} />
        </span>
      </a>

      <section className="about-section about-section--split" id="contact">
        <div>
          <p className="eyebrow">Kontakt</p>
          <h2>Send inn ønsker, spørsmål eller feil du opplever</h2>
          <div className="about-contact-reasons">
            {contactReasons.map((reason) => {
              const Icon = reason.icon;
              return (
                <div key={reason.title}>
                  <Icon size={20} aria-hidden="true" />
                  <span>
                    <strong>{reason.title}</strong>
                    {reason.text}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="about-contact">
          <div
            aria-live="polite"
            className={`about-contact__status ${
              formStatus.state === 'idle' ? '' : `is-${formStatus.state}`
            }`}
          >
            {formStatus.message}
          </div>

          <iframe
            className="about-contact__iframe"
            id="svario-contact-frame"
            name="svario_contact_frame"
            onLoad={handleIframeLoad}
            title="Skjult sendemal for kontaktskjema"
          />

          <form
            acceptCharset="UTF-8"
            action="https://formcarry.com/s/arQi40sZeJz"
            method="POST"
            onSubmit={handleSubmit}
            ref={formRef}
            target="svario_contact_frame"
          >
            <input
              autoComplete="off"
              className="about-contact__honeypot"
              name="website"
              tabIndex={-1}
              type="text"
            />
            <input name="_next" readOnly type="hidden" value={nextUrl} />
            <input name="product" readOnly type="hidden" value="Svario" />
            <input
              name="source"
              readOnly
              type="hidden"
              value="Svario_About_Page"
            />

            <div className="about-contact__grid">
              <label>
                Navn
                <input
                  autoComplete="name"
                  id="about-contact-name"
                  name="name"
                  placeholder="Hva heter du?"
                  required
                  type="text"
                />
              </label>

              <label>
                E-post
                <input
                  autoComplete="email"
                  id="about-contact-email"
                  name="email"
                  placeholder="deg@epost.no"
                  required
                  type="email"
                />
              </label>
            </div>

            <label>
              Hva gjelder det?
              <select id="about-contact-subject" name="subject" required>
                {subjectOptions.map((subject) => (
                  <option key={subject} value={subject}>
                    {subject}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Melding
              <textarea
                id="about-contact-message"
                name="message"
                placeholder="Beskriv kort hva du ønsker, hva som skjedde, eller hva du lurer på."
                required
                rows={6}
              />
            </label>

            <button
              className="button button--primary"
              disabled={isSubmitting}
              type="submit"
            >
              <MessageSquare size={18} aria-hidden="true" />
              {isSubmitting ? 'Sender...' : 'Send melding'}
            </button>

            <p className="about-contact__hint">
              Unngå å dele sensitive personopplysninger. Ved feilrapport er det
              nyttig med skjermbilde, nettleser, enhet og hva du forsøkte å
              gjøre.
            </p>
          </form>
        </div>
      </section>

      <footer className="security-footer">
        <span>Svario</span>
        <Link to={routes.trust}>
          Sikkerhet og personvern
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
