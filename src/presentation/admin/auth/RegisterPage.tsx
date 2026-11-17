import { UserPlus } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';

import { routes } from '../../../app/routes';
import { useAuth } from '../../../application/auth/AuthProvider';
import { getUserFacingErrorMessage } from '../../../application/errors/userFacingError';
import { validateNewPassword } from '../../../domain/auth/passwordValidation';
import { getAuthRedirectUrl } from '../../../infrastructure/config/authRedirect';
import { isCustomerBuild } from '../../../infrastructure/config/instanceBrand';
import { AuthPageLayout } from './AuthPageLayout';
import { NewPasswordFields } from './NewPasswordFields';

export function RegisterPage() {
  const auth = useAuth();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (isCustomerBuild || auth.isAdminReady) {
    return <Navigate to={routes.login} state={location.state} replace />;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;
    const validationError = validateNewPassword(password, confirmation);
    setErrorMessage(validationError);
    if (validationError) return;

    setIsSubmitting(true);
    try {
      await auth.signUpWithPassword(email.trim(), password, getAuthRedirectUrl());
      setPassword('');
      setConfirmation('');
      setIsSent(true);
    } catch (error) {
      setErrorMessage(getUserFacingErrorMessage(error, 'Kunne ikke opprette kontoen. Prøv igjen.'));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthPageLayout title="Opprett konto">
      {isSent ? (
        <p className="form-alert form-alert--success" role="status">
          Sjekk e-posten din. Følg bekreftelseslenken for å fullføre registreringen.
        </p>
      ) : (
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
          <NewPasswordFields
            password={password}
            confirmation={confirmation}
            onPasswordChange={setPassword}
            onConfirmationChange={setConfirmation}
            disabled={isSubmitting}
          />
          {errorMessage || auth.status === 'misconfigured' ? (
            <p className="form-alert form-alert--error" role="alert">
              {errorMessage ?? auth.errorMessage}
            </p>
          ) : null}
          <button
            className="button button--primary"
            disabled={isSubmitting || auth.status === 'misconfigured' || auth.status === 'loading'}
            type="submit"
          >
            <UserPlus size={18} aria-hidden="true" />
            {isSubmitting ? 'Oppretter konto...' : 'Opprett konto'}
          </button>
        </form>
      )}
      <div className="auth-support-links">
        <Link to={routes.login} state={location.state}>Tilbake til innlogging</Link>
      </div>
    </AuthPageLayout>
  );
}
