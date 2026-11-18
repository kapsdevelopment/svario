import { KeyRound, LogIn, Mail, Send, UserPlus } from 'lucide-react';
import { type FormEvent, useMemo, useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';

import { routes } from '../../../app/routes';
import { useAuth } from '../../../application/auth/AuthProvider';
import { getUserFacingErrorMessage } from '../../../application/errors/userFacingError';
import { getAuthRedirectUrl } from '../../../infrastructure/config/authRedirect';
import { instanceBrand, isCustomerBuild } from '../../../infrastructure/config/instanceBrand';
import { Panel } from '../../shared/components/Panel';

type AuthMode = 'password' | 'magic-link';
type LoginLocationState = {
  from?: {
    pathname: string;
    search: string;
    hash: string;
  };
};

export function LoginPage() {
  const auth = useAuth();
  const location = useLocation();
  const [mode, setMode] = useState<AuthMode>('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(() =>
    new URLSearchParams(location.search).has('error') ? 'Lenken er utløpt eller ugyldig. Prøv å logge inn på nytt.' : null,
  );

  const redirectTarget = useMemo(
    () => getRedirectTarget(location.state),
    [location.state],
  );
  const canSubmit = auth.status !== 'misconfigured' && !isSubmitting;

  if (instanceBrand.presentationOnly) {
    return (
      <main className="auth-page image-page image-page--pine">
        <Panel title="Skjemaportal" subtitle={instanceBrand.name}>
          {instanceBrand.logoUrl ? (
            <img alt="" className="auth-brand__logo auth-brand__logo--presentation" src={instanceBrand.logoUrl} />
          ) : null}
          <p>{instanceBrand.tagline}</p>
          <p className="form-alert form-alert--info">
            Privat Svario-prototype. Ingen innlogging eller innsamling av opplysninger.
          </p>
        </Panel>
      </main>
    );
  }

  if (auth.isAdminReady) {
    return <Navigate to={redirectTarget} replace />;
  }

  async function handlePasswordSignIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await submitAuthAction(async () => {
      await auth.signInWithPassword(email.trim(), password);
      setMessage('Logger inn...');
    });
  }

  async function handleMagicLinkSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await submitAuthAction(async () => {
      await auth.signInWithMagicLink(
        email.trim(),
        getAuthRedirectUrl(),
      );
      setMessage('Magic link er sendt.');
    });
  }

  async function submitAuthAction(action: () => Promise<void>) {
    setIsSubmitting(true);
    setMessage(null);
    setErrorMessage(null);

    try {
      await action();
    } catch (error) {
      setErrorMessage(getUserFacingErrorMessage(error, 'Innlogging feilet.'));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="auth-page image-page image-page--pine">
      <Panel title="Logg inn" subtitle={`${instanceBrand.name} admin`}>
        {instanceBrand.logoUrl ? (
          <img alt="" className="auth-brand__logo" src={instanceBrand.logoUrl} />
        ) : null}
        {!isCustomerBuild ? (
          <div
            className="segmented-control"
            role="tablist"
            aria-label="Innloggingsvalg"
          >
            <button
              aria-selected={mode === 'password'}
              className="segmented-control__item"
              onClick={() => setMode('password')}
              role="tab"
              type="button"
            >
              <KeyRound size={17} aria-hidden="true" />
              Passord
            </button>
            <button
              aria-selected={mode === 'magic-link'}
              className="segmented-control__item"
              onClick={() => setMode('magic-link')}
              role="tab"
              type="button"
            >
              <Mail size={17} aria-hidden="true" />
              E-postlenke
            </button>
          </div>
        ) : null}

        {auth.status === 'misconfigured' ? (
          <p className="form-alert form-alert--error">{auth.errorMessage}</p>
        ) : null}

        {auth.status === 'authenticated' && !auth.isAdminReady ? (
          <p className="form-alert form-alert--error">{auth.errorMessage}</p>
        ) : null}

        {mode === 'password' ? (
          <form className="form-stack" onSubmit={handlePasswordSignIn}>
            <label>
              E-post
              <input
                autoComplete="email"
                onChange={(event) => setEmail(event.target.value)}
                required
                type="email"
                value={email}
              />
            </label>
            <label>
              Passord
              <input
                autoComplete="current-password"
                minLength={6}
                onChange={(event) => setPassword(event.target.value)}
                required
                type="password"
                value={password}
              />
            </label>
            <Link className="auth-text-link" to={routes.forgotPassword}>Glemt passord?</Link>
            <div className="form-actions form-actions--split">
              {!isCustomerBuild ? (
                <Link
                  className="button button--secondary"
                  to={routes.register}
                  state={location.state}
                >
                  <UserPlus size={18} aria-hidden="true" />
                  Opprett konto
                </Link>
              ) : null}
              <button
                className="button button--primary"
                disabled={!canSubmit}
                type="submit"
              >
                <LogIn size={18} aria-hidden="true" />
                Logg inn
              </button>
            </div>
          </form>
        ) : (
          <form className="form-stack" onSubmit={handleMagicLinkSubmit}>
            <label>
              E-post
              <input
                autoComplete="email"
                onChange={(event) => setEmail(event.target.value)}
                required
                type="email"
                value={email}
              />
            </label>
            <div className="form-actions">
              <button
                className="button button--primary"
                disabled={!canSubmit}
                type="submit"
              >
                <Send size={18} aria-hidden="true" />
                Send lenke
              </button>
            </div>
          </form>
        )}

        {message ? (
          <p className="form-alert form-alert--success" role="status">{message}</p>
        ) : null}
        {errorMessage ? (
          <p className="form-alert form-alert--error" role="alert">{errorMessage}</p>
        ) : null}

        {!isCustomerBuild ? (
          <div className="auth-support-links">
            <Link to={routes.security}>Les om sikkerhet og personvern</Link>
          </div>
        ) : null}
      </Panel>
    </main>
  );
}

function getRedirectTarget(state: unknown) {
  const from = (state as LoginLocationState | null)?.from;

  if (!from || from.pathname === routes.login) {
    return routes.dashboard;
  }

  return `${from.pathname}${from.search}${from.hash}`;
}
