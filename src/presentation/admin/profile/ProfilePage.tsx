import { KeyRound } from 'lucide-react';
import { type FormEvent, useState } from 'react';

import { useAuth } from '../../../application/auth/AuthProvider';
import { Panel } from '../../shared/components/Panel';

const minimumPasswordLength = 6;

export function ProfilePage() {
  const auth = useAuth();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  async function handlePasswordChange(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordMessage(null);
    setPasswordError(null);

    if (newPassword.length < minimumPasswordLength) {
      setPasswordError('Passordet må være minst 6 tegn.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Passordene er ikke like.');
      return;
    }

    setIsUpdatingPassword(true);

    try {
      await auth.updatePassword(newPassword);
      setNewPassword('');
      setConfirmPassword('');
      setPasswordMessage('Passordet er oppdatert.');
    } catch (error) {
      setPasswordError(getErrorMessage(error));
    } finally {
      setIsUpdatingPassword(false);
    }
  }

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Konto</p>
          <h1>Min profil</h1>
        </div>
      </header>

      <Panel title="Konto" subtitle={auth.user?.email ?? 'Innlogget admin'}>
        <dl className="definition-list">
          <div>
            <dt>Domain account</dt>
            <dd>{auth.account?.id ?? 'Ikke klargjort'}</dd>
          </div>
          <div>
            <dt>Status</dt>
            <dd>{auth.account?.status ?? 'Ukjent'}</dd>
          </div>
          <div>
            <dt>Auth user</dt>
            <dd>{auth.user?.id ?? 'Ukjent'}</dd>
          </div>
        </dl>
      </Panel>

      <Panel title="Bytt passord" subtitle="E-post/passord">
        <form className="form-stack" onSubmit={handlePasswordChange}>
          <label>
            Nytt passord
            <input
              autoComplete="new-password"
              minLength={minimumPasswordLength}
              onChange={(event) => setNewPassword(event.target.value)}
              required
              type="password"
              value={newPassword}
            />
          </label>
          <label>
            Gjenta nytt passord
            <input
              autoComplete="new-password"
              minLength={minimumPasswordLength}
              onChange={(event) => setConfirmPassword(event.target.value)}
              required
              type="password"
              value={confirmPassword}
            />
          </label>

          <div className="form-actions">
            <button
              className="button button--primary"
              disabled={isUpdatingPassword}
              type="submit"
            >
              <KeyRound size={18} aria-hidden="true" />
              {isUpdatingPassword ? 'Oppdaterer...' : 'Oppdater passord'}
            </button>
          </div>
        </form>

        {passwordMessage ? (
          <p className="form-alert form-alert--success">{passwordMessage}</p>
        ) : null}
        {passwordError ? (
          <p className="form-alert form-alert--error">{passwordError}</p>
        ) : null}
      </Panel>
    </div>
  );
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return 'Kunne ikke oppdatere passordet.';
}
