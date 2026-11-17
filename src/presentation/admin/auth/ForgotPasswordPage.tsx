import { Send } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';

import { routes } from '../../../app/routes';
import { useAuth } from '../../../application/auth/AuthProvider';
import { getUserFacingErrorMessage } from '../../../application/errors/userFacingError';
import { getPasswordResetRedirectUrl } from '../../../infrastructure/config/authRedirect';
import { AuthPageLayout } from './AuthPageLayout';

export function ForgotPasswordPage() {
  const auth = useAuth();
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    setIsSent(false);
    setErrorMessage(null);
    try {
      await auth.requestPasswordReset(email.trim(), getPasswordResetRedirectUrl());
      setIsSent(true);
    } catch (error) {
      setErrorMessage(getUserFacingErrorMessage(error, 'Kunne ikke sende lenken. Prøv igjen litt senere.'));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthPageLayout title="Glemt passord">
      <p>Skriv inn e-postadressen til kontoen din, så sender vi deg en lenke for å sette nytt passord.</p>
      <form className="form-stack" onSubmit={handleSubmit}>
        <label>
          E-post
          <input
            autoComplete="email"
            disabled={isSubmitting}
            name="email"
            onChange={(event) => setEmail(event.target.value)}
            required
            type="email"
            value={email}
          />
        </label>
        <button
          className="button button--primary"
          disabled={isSubmitting || auth.status === 'misconfigured'}
          type="submit"
        >
          <Send size={18} aria-hidden="true" />
          {isSubmitting ? 'Sender...' : 'Send tilbakestillingslenke'}
        </button>
      </form>
      {isSent ? (
        <p className="form-alert form-alert--success" role="status">
          Hvis e-postadressen er registrert, får du en lenke for å sette nytt passord. Sjekk også søppelpost.
        </p>
      ) : null}
      {errorMessage || auth.status === 'misconfigured' ? (
        <p className="form-alert form-alert--error" role="alert">
          {errorMessage ?? auth.errorMessage}
        </p>
      ) : null}
      <div className="auth-support-links">
        <Link to={routes.login}>Tilbake til innlogging</Link>
      </div>
    </AuthPageLayout>
  );
}
