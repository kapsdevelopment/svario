import { type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';

import { routes } from '../../../app/routes';
import { useAuth } from '../../../application/auth/AuthProvider';
import { useBrandingLogo } from '../../../application/workspaces/useBrandingLogo';
import { useBrandingAccess } from '../../../application/workspaces/useBrandingRequests';
import { useWorkspaceScope } from '../../../application/workspaces/WorkspaceScopeProvider';
import { useReplaceWorkspaceLogo, useWorkspaceLogo } from '../../../application/workspaces/useWorkspaceLogo';
import type { WorkspaceRespondentBranding } from '../../../domain/workspaces/workspace';
import { Panel } from '../../shared/components/Panel';
import { RespondentBrandingPreview } from '../../shared/components/RespondentBranding';
import { BrandingInterestForm } from './BrandingInterestForm';
import './workspaceBrandingAdmin.css';

export function WorkspaceBrandingPage() {
  const { workspaceId = '' } = useParams();
  const { account } = useAuth();
  const { workspaces } = useWorkspaceScope();
  const workspace = workspaces.find(({ id }) => id === workspaceId);

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">{workspace?.name ?? 'Arbeidsflate'}</p>
          <h1>Profilering</h1>
          <p>Logoen vises på arbeidsflatens åpne skjemaer når profileringen er aktiv.</p>
        </div>
        <Link to={routes.profile} className="button button--secondary">Mine arbeidsflater</Link>
      </header>
      {account ? <WorkspaceBrandingAccess key={`${account.id}:${workspaceId}`} accountId={account.id} workspaceId={workspaceId} workspaceName={workspace?.name ?? 'Arbeidsflaten'} /> : null}
    </div>
  );
}

function WorkspaceBrandingAccess({ accountId, workspaceId, workspaceName }: { accountId: string; workspaceId: string; workspaceName: string }) {
  const access = useBrandingAccess(accountId, workspaceId);
  if (access.isPending) return <p role="status">Laster profilering …</p>;
  if (access.isError) {
    const denied = 'code' in access.error && access.error.code === '42501';
    return <Panel title={denied ? 'Tilgang kreves' : 'Kunne ikke hente profilering'}
      subtitle={denied ? 'Bare arbeidsflatens eiere og administratorer kan administrere profilering.' : undefined}>
      <button className="button button--secondary" type="button" onClick={() => void access.refetch()}>Prøv igjen</button>
    </Panel>;
  }
  if (access.data.isAllowed) return <WorkspaceLogo accountId={accountId} workspaceId={workspaceId} workspaceName={workspaceName} />;
  if (access.data.requestStatus === 'new' || access.data.requestStatus === 'in_review') {
    return <Panel title="Interesse meldt">
      <p role="status">{access.data.requestStatus === 'in_review' ? 'Forespørselen er under behandling.' : 'Vi har mottatt forespørselen.'} Svario kontakter dere om pris og oppstart.</p>
      <p>Dere kan fortsette å bruke arbeidsflaten gratis mens dere venter.</p>
      <button className="button button--secondary" type="button" disabled={access.isFetching} onClick={() => void access.refetch()}>Oppdater status</button>
    </Panel>;
  }
  return <BrandingInterestForm accountId={accountId} workspaceId={workspaceId} previouslyClosed={access.data.requestStatus === 'closed'} />;
}

function WorkspaceLogo({ accountId, workspaceId, workspaceName }: { accountId: string; workspaceId: string; workspaceName: string }) {
  const profile = useWorkspaceLogo(accountId, workspaceId);
  const save = useReplaceWorkspaceLogo(accountId, workspaceId);

  if (profile.isPending) return <p role="status">Laster profilering …</p>;
  if (profile.isError) {
    const denied = 'code' in profile.error && profile.error.code === '42501';
    return (
      <Panel title={denied ? 'Tilgang kreves' : 'Kunne ikke hente profilering'}
        subtitle={denied ? 'Bare arbeidsflatens eiere og administratorer kan endre logoen.' : undefined}>
        <button className="button button--secondary" type="button" onClick={() => void profile.refetch()}>Prøv igjen</button>
      </Panel>
    );
  }
  const isFirstLogo = !profile.data;
  const branding = profile.data ?? { displayName: workspaceName, accentColor: '#345b4b', logoSrc: '', isActive: false, revision: 0 };

  return (
    <Panel title={isFirstLogo ? 'Last opp deres første logo' : 'Arbeidsflatens logo'} action={!isFirstLogo ? (
      <span className={`status-pill status-pill--${branding.isActive ? 'active' : 'draft'}`}>
        {branding.isActive ? 'Aktiv' : 'Inaktiv'}
      </span>
    ) : undefined}>
      {isFirstLogo ? <p>Profilering er tillatt. Når du lagrer logoen, vises den på arbeidsflatens åpne skjemaer.</p>
        : !branding.isActive ? <p>Profileringen er inaktiv. Du kan lagre en ny logo, og Svario kan aktivere profilen.</p> : null}
      <WorkspaceLogoForm key={branding.revision} profile={branding} isSaving={save.isPending}
        onEdit={() => save.reset()}
        onSave={(logo) => save.mutate({ logo, revision: branding.revision })} />
      {save.isSuccess ? <p className="form-alert form-alert--success" role="status">Logoen er lagret.</p> : null}
      {save.isError ? (
        <div className="form-alert form-alert--error" role="alert">
          <p>{save.error.message}</p>
          <button className="button button--secondary" type="button" onClick={() => { save.reset(); void profile.refetch(); }}>
            Last inn lagret profil
          </button>
        </div>
      ) : null}
    </Panel>
  );
}

function WorkspaceLogoForm({ profile, isSaving, onSave, onEdit }: {
  profile: WorkspaceRespondentBranding;
  isSaving: boolean;
  onSave: (file: File) => void;
  onEdit: () => void;
}) {
  const logo = useBrandingLogo();
  const busy = isSaving || logo.isValidating;
  function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (logo.file && !logo.error && !busy) onSave(logo.file);
  }

  return (
    <form className="form-stack" onSubmit={handleSave}>
      <fieldset className="branding-admin-fields" disabled={busy}>
        <label>
          {profile.revision === 0 ? 'Velg logo' : 'Bytt logo'}
          <input type="file" accept="image/png,image/webp,.png,.webp" aria-describedby="workspace-logo-help"
            onChange={(event) => { onEdit(); void logo.selectFile(event.target.files?.[0]); }} />
        </label>
        <p id="workspace-logo-help" className="branding-admin-help">
          PNG eller WebP, maks 1 MiB og 2048 × 2048 piksler. Bruk en logo som er godkjent for arbeidsflaten.
        </p>
      </fieldset>
      {logo.isValidating ? <p role="status">Kontrollerer logo …</p> : null}
      {logo.error ? <p className="form-alert form-alert--error" role="alert">{logo.error}</p> : null}
      <h3>Forhåndsvisning</h3>
      <RespondentBrandingPreview branding={{ ...profile, logoSrc: logo.previewUrl ?? profile.logoSrc }} />
      {logo.file ? <p>Forhåndsvisningen viser en ulagret logo.</p> : null}
      <div className="form-actions">
        <button className="button button--primary" type="submit" disabled={busy || !logo.file || Boolean(logo.error)}>
          {isSaving ? 'Lagrer …' : 'Lagre logo'}
        </button>
      </div>
    </form>
  );
}
