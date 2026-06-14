import { KeyRound, LogIn, Mail, Send, UserPlus } from 'lucide-react';
import { type FormEvent, useMemo, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

import { routes } from '../../../app/routes';
import { useAuth } from '../../../application/auth/AuthProvider';
import { getAuthRedirectUrl } from '../../../infrastructure/config/authRedirect';
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
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const redirectTarget = useMemo(
    () => getRedirectTarget(location.state),
    [location.state],
  );
  const canSubmit = auth.status !== 'misconfigured' && !isSubmitting;

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

  async function handlePasswordSignUp() {
    if (!email.trim() || password.length < 6) {
      setMessage(null);
      setErrorMessage('Fyll inn e-post og minst 6 tegn passord.');
      return;
    }

    await submitAuthAction(async () => {
      await auth.signUpWithPassword(
        email.trim(),
        password,
        getAuthRedirectUrl(),
      );
      setMessage('Sjekk e-posten din.');
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
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="auth-page image-page image-page--pine">
      <Panel title="Logg inn" subtitle="Svario admin">
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
            <div className="form-actions form-actions--split">
              <button
                className="button button--secondary"
                disabled={!canSubmit}
                type="button"
                onClick={handlePasswordSignUp}
              >
                <UserPlus size={18} aria-hidden="true" />
                Opprett konto
              </button>
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
          <p className="form-alert form-alert--success">{message}</p>
        ) : null}
        {errorMessage ? (
          <p className="form-alert form-alert--error">{errorMessage}</p>
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

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return 'Innlogging feilet.';
}
