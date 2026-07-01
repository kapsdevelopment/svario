import { ArrowRight, BarChart3, ClipboardList, Users } from 'lucide-react';
import { Link } from 'react-router-dom';

import { routes } from '../../../app/routes';
import { WebsiteFooter } from '../shared/WebsiteFooter';

const demoVideos = [
  {
    icon: BarChart3,
    eyebrow: 'Live resultater',
    title: 'Følg svarene mens de kommer inn',
    text: 'Se hvordan resultatvisningen oppdateres fortløpende med grafer, fordelinger og ordsky når nye besvarelser registreres.',
    src: '/videos/svario-live-respons.mov',
    poster: '/videos/svario-live-respons-poster.png',
  },
  {
    icon: ClipboardList,
    eyebrow: 'Opprett skjema',
    title: 'Lag en spørreundersøkelse',
    text: 'En rolig gjennomgang av hvordan et skjema bygges opp, publiseres og gjøres klart for innsamling.',
    src: '/videos/svario-lag-sporreskjema.mov',
    poster: '/videos/svario-lag-sporreskjema-poster.png',
  },
  {
    icon: Users,
    eyebrow: 'Respondentflyt',
    title: 'Slik oppleves skjemaet for den som svarer',
    text: 'Respondenten møter en enkel og nøytral utfylling som fungerer fint på både mobil og desktop.',
    src: '/videos/svario-respondentflyt.mov',
    poster: '/videos/svario-respondentflyt-poster.png',
  },
] as const;

export function DemoPage() {
  const [featuredDemo, ...supportingDemos] = demoVideos;
  const FeaturedIcon = featuredDemo.icon;

  return (
    <main className="demo-page">
      <header className="marketing-topbar">
        <Link className="security-brand" to={routes.home}>
          <span className="brand__mark">S</span>
          <span>
            <strong>Svario</strong>
            <small>Se Svario i bruk</small>
          </span>
        </Link>
        <nav className="marketing-topbar__nav" aria-label="Demoside">
          <Link to={routes.home}>Forside</Link>
          <Link to={routes.about}>Om Svario</Link>
          <Link to={routes.trust}>Sikkerhet og personvern</Link>
          <Link to={routes.privacy}>Personvern</Link>
          <Link className="button button--secondary" to={routes.login}>
            Logg inn
          </Link>
        </nav>
      </header>

      <section className="demo-hero" aria-labelledby="demo-title">
        <div>
          <p className="eyebrow">Produktdemo</p>
          <h1 id="demo-title">Se Svario i bruk</h1>
          <p>
            Tre korte demonstrasjoner viser hvordan Svario fungerer fra første
            skjema til innsamlede svar og levende resultater.
          </p>
          <div className="marketing-hero__actions">
            <Link className="button button--primary" to={routes.login}>
              Kom i gang
              <ArrowRight size={18} aria-hidden="true" />
            </Link>
            <Link className="button button--secondary" to={routes.home}>
              Til forsiden
            </Link>
            <Link className="button button--secondary" to={routes.about}>
              Om Svario
            </Link>
          </div>
        </div>
      </section>

      <section className="demo-feature" aria-labelledby="demo-feature-title">
        <div className="demo-feature__copy">
          <FeaturedIcon size={25} aria-hidden="true" />
          <p className="eyebrow">{featuredDemo.eyebrow}</p>
          <h2 id="demo-feature-title">{featuredDemo.title}</h2>
          <p>{featuredDemo.text}</p>
        </div>
        <DemoVideo
          label={featuredDemo.title}
          poster={featuredDemo.poster}
          src={featuredDemo.src}
        />
      </section>

      <section className="demo-video-grid" aria-label="Flere produktdemoer">
        {supportingDemos.map((demo) => {
          const Icon = demo.icon;

          return (
            <article className="demo-video-card" key={demo.title}>
              <div className="demo-video-card__copy">
                <Icon size={23} aria-hidden="true" />
                <p className="eyebrow">{demo.eyebrow}</p>
                <h2>{demo.title}</h2>
                <p>{demo.text}</p>
              </div>
              <DemoVideo label={demo.title} poster={demo.poster} src={demo.src} />
            </article>
          );
        })}
      </section>

      <section className="demo-cta">
        <div>
          <p className="eyebrow">Klar til å prøve?</p>
          <h2>Lag et skjema og se hvordan svarene tar form.</h2>
        </div>
        <Link className="button button--primary" to={routes.login}>
          Kom i gang
          <ArrowRight size={18} aria-hidden="true" />
        </Link>
      </section>

      <WebsiteFooter />
    </main>
  );
}

function DemoVideo({
  label,
  poster,
  src,
  autoPlay = false,
}: {
  label: string;
  poster: string;
  src: string;
  autoPlay?: boolean;
}) {
  return (
    <div className="demo-video-frame">
      <video
        aria-label={label}
        autoPlay={autoPlay}
        controls
        loop={autoPlay}
        muted
        playsInline
        poster={poster}
        preload="metadata"
      >
        <source src={src} />
        Nettleseren din kan ikke spille av denne videoen.
      </video>
    </div>
  );
}
