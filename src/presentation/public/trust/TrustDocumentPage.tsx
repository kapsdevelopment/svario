import { ArrowLeft, ArrowRight, ExternalLink, FileText } from 'lucide-react';
import { Link, Navigate, useParams } from 'react-router-dom';

import { routes } from '../../../app/routes';
import { WebsiteFooter } from '../shared/WebsiteFooter';
import { getTrustDocument, trustDocuments, trustReferences } from './trustContent';

export function TrustDocumentPage() {
  const { documentSlug } = useParams();
  const document = getTrustDocument(documentSlug);

  if (!document) {
    return <Navigate replace to={routes.trust} />;
  }

  const Icon = document.icon;

  return (
    <main className="trust-page">
      <header className="security-topbar">
        <Link className="security-brand" to={routes.trust}>
          <span className="brand__mark">S</span>
          <span>
            <strong>Svario</strong>
            <small>Sikkerhet og personvern</small>
          </span>
        </Link>
        <nav className="security-topbar__nav" aria-label={document.title}>
          <Link to={routes.trust}>Sikkerhet og personvern</Link>
          <Link to={routes.privacy}>Personvern</Link>
          <Link to={routes.security}>Sikkerhet</Link>
          <Link className="button button--secondary" to={routes.login}>
            Logg inn
          </Link>
        </nav>
      </header>

      <section className="trust-document-hero" aria-labelledby="trust-document-title">
        <Link className="trust-back-link" to={routes.trust}>
          <ArrowLeft size={17} aria-hidden="true" />
          Sikkerhet og personvern
        </Link>
        <div className="trust-document-hero__title">
          <Icon size={30} aria-hidden="true" />
          <div>
            <p className="eyebrow">{document.eyebrow}</p>
            <h1 id="trust-document-title">{document.title}</h1>
          </div>
        </div>
        <p>{document.summary}</p>
        <div className="security-badges" aria-label="Dokumentstatus">
          <span>{document.status}</span>
          <span>Sist oppdatert {document.updated}</span>
        </div>
      </section>

      <section className="trust-document-layout">
        <aside className="trust-document-nav" aria-label="Andre dokumenter">
          <span>Dokumenter</span>
          {trustDocuments.map((item) => (
            <Link
              aria-current={item.slug === document.slug ? 'page' : undefined}
              key={item.slug}
              to={routes.trustDocument(item.slug)}
            >
              {item.shortTitle}
            </Link>
          ))}
        </aside>

        <article className="trust-document-body">
          {document.sections.map((section) => (
            <section key={section.title}>
              <h2>{section.title}</h2>
              {section.paragraphs?.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
              {section.bullets ? (
                <ul>
                  {section.bullets.map((bullet) => (
                    <li key={bullet}>{bullet}</li>
                  ))}
                </ul>
              ) : null}
              {section.table ? (
                <div className="trust-table-wrap">
                  <table>
                    <thead>
                      <tr>
                        {section.table.columns.map((column) => (
                          <th key={column}>{column}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {section.table.rows.map((row) => (
                        <tr key={row.join('|')}>
                          {row.map((cell) => (
                            <td key={cell}>{cell}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}
            </section>
          ))}
        </article>
      </section>

      <section className="trust-section trust-section--split">
        <div>
          <p className="eyebrow">Referanser</p>
          <h2>Kilder og veiledning</h2>
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

      <WebsiteFooter>
        <Link to={routes.trust}>
          <ArrowLeft size={17} aria-hidden="true" />
          Sikkerhet og personvern
        </Link>
        <Link to={routes.home}>
          Til forsiden
          <ArrowRight size={17} aria-hidden="true" />
        </Link>
      </WebsiteFooter>
    </main>
  );
}
