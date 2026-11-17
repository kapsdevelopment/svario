import { KeyRound } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import { routes } from '../../../app/routes';
import { useAuth } from '../../../application/auth/AuthProvider';
import { isUnchangedPasswordError } from '../../../application/auth/passwordErrors';
import { getUserFacingErrorMessage } from '../../../application/errors/userFacingError';
import { validateNewPassword } from '../../../domain/auth/passwordValidation';
import { instanceBrand } from '../../../infrastructure/config/instanceBrand';
import { AuthPageLayout } from './AuthPageLayout';
import { NewPasswordFields } from './NewPasswordFields';

export function ResetPasswordPage() {
  const auth = useAuth();
  const [searchParams] = useSearchParams();
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completion, setCompletion] = useState<'updated' | 'unchanged' | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const hasValidSession = auth.status === 'authenticated' && auth.user !== null && !searchParams.has('error');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting || !hasValidSession) return;
    const validationError = validateNewPassword(password, confirmation);
    setErrorMessage(validationError);
    if (validationError) return;

    setIsSubmitting(true);
    try {
      await auth.updatePassword(password);
      setPassword('');
      setConfirmation('');
      setCompletion('updated');
    } catch (error) {
      if (isUnchangedPasswordError(error)) {
        setPassword('');
        setConfirmation('');
        setCompletion('unchanged');
      } else {
        setErrorMessage(getUserFacingErrorMessage(error, 'Kunne ikke oppdatere passordet. Prøv igjen.'));
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  let content;
  if (auth.status === 'loading') {
    content = <p role="status">Kontrollerer lenken...</p>;
  } else if (completion) {
    content = (
      <>
        <p className="form-alert form-alert--success" role="status">
          {completion === 'unchanged'
            ? 'Dette er allerede passordet ditt. Du kan fortsette å bruke det.'
            : `Passordet er oppdatert. Du er innlogget og kan fortsette til ${instanceBrand.name}.`}
        </p>
        <Link className="button button--primary" to={routes.dashboard}>
          Gå til {instanceBrand.name}
        </Link>
      </>
    );
  } else if (!hasValidSession) {
    content = (
      <>
        <p className="form-alert form-alert--error" role="alert">
          Lenken er utløpt eller ugyldig. Be om en ny lenke for å sette nytt passord.
        </p>
        <Link className="button button--primary" to={routes.forgotPassword}>Be om ny lenke</Link>
      </>
    );
  } else {
    content = (
      <form className="form-stack" onSubmit={handleSubmit}>
        <p>Velg et nytt passord til kontoen din.</p>
        <NewPasswordFields
          password={password}
          confirmation={confirmation}
          onPasswordChange={setPassword}
          onConfirmationChange={setConfirmation}
          disabled={isSubmitting}
          isReset
        />
        {errorMessage ? (
          <p className="form-alert form-alert--error" role="alert">{errorMessage}</p>
        ) : null}
        <button className="button button--primary" disabled={isSubmitting} type="submit">
          <KeyRound size={18} aria-hidden="true" />
          {isSubmitting ? 'Lagrer...' : 'Lagre nytt passord'}
        </button>
      </form>
    );
  }

  return (
    <AuthPageLayout title="Sett nytt passord">
      {content}
      <div className="auth-support-links">
        <Link to={routes.login}>Tilbake til innlogging</Link>
      </div>
    </AuthPageLayout>
  );
}
