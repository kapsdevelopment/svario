import { CheckCircle2, UserPlus } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';

import { routes } from '../../../app/routes';
import { getUserFacingErrorMessage } from '../../../application/errors/userFacingError';
import { useAcceptWorkspaceInvitation } from '../../../application/workspaces/useAcceptWorkspaceInvitation';
import { Panel } from '../../shared/components/Panel';

export function JoinWorkspacePage() {
  const { token } = useParams();
  const acceptInvitation = useAcceptWorkspaceInvitation();

  async function handleAccept() {
    if (!token) {
      return;
    }

    await acceptInvitation.mutateAsync(token);
  }

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Invitasjon</p>
          <h1>Bli med i arbeidsflate</h1>
        </div>
      </header>

      <Panel
        title={
          acceptInvitation.isSuccess
            ? 'Du er med'
            : 'Godta invitasjon til Svario'
        }
        subtitle={
          acceptInvitation.isSuccess
            ? 'Arbeidsflaten er lagt til profilen din.'
            : 'Du må være innlogget før invitasjonen kan godtas.'
        }
        action={
          acceptInvitation.isSuccess ? (
            <Link className="button button--primary" to={routes.profile}>
              <CheckCircle2 size={18} aria-hidden="true" />
              Gå til profil
            </Link>
          ) : null
        }
      >
        {!token ? (
          <div className="form-alert form-alert--error" role="alert">
            Invitasjonslenken mangler token.
          </div>
        ) : null}

        {!acceptInvitation.isSuccess ? (
          <div className="form-actions">
            <button
              className="button button--primary"
              type="button"
              disabled={!token || acceptInvitation.isPending}
              onClick={handleAccept}
            >
              <UserPlus size={18} aria-hidden="true" />
              {acceptInvitation.isPending ? 'Legger deg til...' : 'Godta invitasjon'}
            </button>
          </div>
        ) : null}

        {acceptInvitation.isError ? (
          <div className="form-alert form-alert--error" role="alert">
            {getUserFacingErrorMessage(
              acceptInvitation.error,
              'Kunne ikke godta invitasjonen.',
            )}
          </div>
        ) : null}
      </Panel>
    </div>
  );
}
