import { type FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';

import { routes } from '../../../app/routes';
import { useAuth } from '../../../application/auth/AuthProvider';
import { useBrandingLogo } from '../../../application/workspaces/useBrandingLogo';
import {
  useBrandingWorkspaces,
  useSetWorkspaceBrandingActive,
  useSvarioAdminAccess,
  useWorkspaceBrandingProfile,
  useSaveWorkspaceBranding,
} from '../../../application/workspaces/useWorkspaceBrandingAdmin';
import type { WorkspaceRespondentBranding } from '../../../domain/workspaces/workspace';
import { Panel } from '../../shared/components/Panel';
import { RespondentBrandingPreview } from '../../shared/components/RespondentBranding';
import { BrandingInbox } from './BrandingInbox';
import './workspaceBrandingAdmin.css';

export function WorkspaceBrandingAdminPage() {
  const { account } = useAuth();
  const access = useSvarioAdminAccess();

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Svario-admin</p>
          <h1>B-profiler</h1>
        </div>
        <Link to={routes.profile} className="button button--secondary">Min profil</Link>
      </header>

      {access.isPending ? <p role="status">Sjekker tilgang …</p> : null}
      {access.isError ? (
        <Panel title="Kunne ikke sjekke tilgang">
          <button className="button button--secondary" type="button" onClick={() => void access.refetch()}>
            Prøv igjen
          </button>
        </Panel>
      ) : null}
      {!access.isError && access.data === false ? (
        <Panel title="Tilgang kreves" subtitle="Denne siden krever rollen Svario-admin." />
      ) : null}
      {!access.isError && access.data && account ? (
        <div className="form-stack" key={account.id}>
          <BrandingInbox accountId={account.id} />
          <WorkspaceBrandingAdmin accountId={account.id} />
        </div>
      ) : null}
    </div>
  );
}

function WorkspaceBrandingAdmin({ accountId }: { accountId: string }) {
  const [search, setSearch] = useState('');
  const [workspaceId, setWorkspaceId] = useState('');
  const workspaces = useBrandingWorkspaces(accountId, search);
  const selectedWorkspace = workspaces.isError ? undefined : workspaces.data?.find(({ id }) => id === workspaceId);

  return (
    <div className="branding-admin-grid">
      <Panel title="Arbeidsflate">
        <div className="form-stack">
          <label>
            Søk etter arbeidsflate
            <input
              type="search"
              placeholder="Søk på navn"
              maxLength={120}
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setWorkspaceId('');
              }}
            />
          </label>
          <label>
            Velg arbeidsflate
            <select
              value={selectedWorkspace?.id ?? ''}
              disabled={workspaces.isPending || workspaces.isError || !workspaces.data?.length}
              onChange={(event) => setWorkspaceId(event.target.value)}
            >
              <option value="">Velg arbeidsflate</option>
              {workspaces.data?.map((workspace) => (
                <option key={workspace.id} value={workspace.id}>{workspace.name} · {workspace.slug}</option>
              ))}
            </select>
          </label>
          {workspaces.isPending ? <p role="status">Laster arbeidsflater …</p> : null}
          {workspaces.isError ? (
            <p className="form-alert form-alert--error" role="alert">Kunne ikke hente arbeidsflater.</p>
          ) : null}
          {workspaces.data?.length === 0 ? <p role="status">Fant ingen arbeidsflater.</p> : null}
          {workspaces.data?.length === 50 ? <p>Viser opptil 50 arbeidsflater. Søk for å finne flere.</p> : null}
        </div>
      </Panel>

      {selectedWorkspace ? (
        <BrandingProfile key={selectedWorkspace.id} accountId={accountId} workspaceId={selectedWorkspace.id} />
      ) : (
        <Panel title="Forhåndsvisning" subtitle="Velg en arbeidsflate for å se profilen." />
      )}
    </div>
  );
}

function BrandingProfile({ accountId, workspaceId }: { accountId: string; workspaceId: string }) {
  const profile = useWorkspaceBrandingProfile(accountId, workspaceId);

  if (profile.isPending) {
    return <Panel title="Forhåndsvisning"><p role="status">Laster B-profil …</p></Panel>;
  }

  if (profile.isError) {
    return <Panel title="Forhåndsvisning"><p role="alert">Kunne ikke hente B-profilen.</p></Panel>;
  }

  return <BrandingProfileEditor
    key={profile.data?.revision ?? 0}
    accountId={accountId}
    workspaceId={workspaceId}
    profile={profile.data}
    reload={() => void profile.refetch()}
  />;
}

function BrandingProfileEditor({ accountId, workspaceId, profile, reload }: {
  accountId: string;
  workspaceId: string;
  profile: WorkspaceRespondentBranding | null;
  reload: () => void;
}) {
  const [displayName, setDisplayName] = useState(profile?.displayName ?? '');
  const [accentColor, setAccentColor] = useState(profile?.accentColor ?? '#345b4b');
  const [validationError, setValidationError] = useState<string | null>(null);
  const logo = useBrandingLogo();
  const update = useSetWorkspaceBrandingActive(accountId, workspaceId);
  const save = useSaveWorkspaceBranding(accountId, workspaceId);
  const isActive = profile?.isActive ?? false;
  const validColor = /^#[0-9a-f]{6}$/i.test(accentColor);
  const preview = {
    displayName: displayName.trim() || 'Visningsnavn',
    accentColor: validColor ? accentColor : '#345b4b',
    logoSrc: logo.previewUrl ?? profile?.logoSrc ?? '',
  };
  const isDirty = displayName !== (profile?.displayName ?? '')
    || accentColor !== (profile?.accentColor ?? '#345b4b') || Boolean(logo.file);
  const busy = update.isPending || save.isPending || logo.isValidating;

  function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setValidationError(null);
    if (!displayName.trim() || Array.from(displayName.trim()).length > 80 || !validColor) {
      setValidationError('Fyll inn visningsnavn og en farge på formen #345b4b.');
      return;
    }
    if (!logo.file && !profile) {
      setValidationError('Velg en godkjent logo før du oppretter profilen.');
      return;
    }
    save.mutate({ displayName: displayName.trim(), accentColor, logo: logo.file, revision: profile?.revision ?? 0 });
  }

  return (
    <Panel title={profile ? 'Rediger B-profil' : 'Opprett B-profil'} action={(
      <span className={`status-pill status-pill--${isActive ? 'active' : 'draft'}`} role="status">
        {isActive ? 'Aktiv' : 'Inaktiv'}
      </span>
    )}>
      <form className="form-stack" onSubmit={handleSave}>
        <fieldset className="branding-admin-fields" disabled={busy}>
          <label>
            Visningsnavn
            <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} maxLength={80} required />
          </label>
          <label htmlFor="branding-accent">Aksentfarge</label>
          <div className="branding-admin-color">
            <input type="color" aria-label="Velg aksentfarge" value={validColor ? accentColor : '#345b4b'}
              onChange={(event) => setAccentColor(event.target.value)} />
            <input id="branding-accent" value={accentColor} maxLength={7} pattern="#[0-9a-fA-F]{6}" required
              onChange={(event) => setAccentColor(event.target.value)} />
          </div>
          <label>
            {profile ? 'Bytt godkjent logo' : 'Godkjent logo'}
            <input type="file" accept="image/png,image/webp,.png,.webp" aria-describedby="branding-logo-help"
              onChange={(event) => void logo.selectFile(event.target.files?.[0])} />
          </label>
          <p id="branding-logo-help" className="branding-admin-help">
            PNG eller WebP, maks 1 MiB og 2048 × 2048 piksler. Bruk en logo som er godkjent for arbeidsflaten.
          </p>
        </fieldset>
        {logo.isValidating ? <p role="status">Kontrollerer logo …</p> : null}
        {logo.error ? <p className="form-alert form-alert--error" role="alert">{logo.error}</p> : null}
        <h3>Forhåndsvisning</h3>
        <RespondentBrandingPreview branding={preview} />
        <p>{isDirty ? 'Forhåndsvisningen viser ulagrede endringer.' : (isActive ? 'Åpne skjemaer viser denne profilen.' : 'Åpne skjemaer viser standard Svario.')}</p>
        {validationError ? <p className="form-alert form-alert--error" role="alert">{validationError}</p> : null}
        {save.isError ? (
          <div className="form-alert form-alert--error" role="alert">
            <p>{save.error.message}</p>
            <button className="button button--secondary" type="button" onClick={reload}>Last inn lagret profil</button>
          </div>
        ) : null}
        {update.isError ? (
          <p className="form-alert form-alert--error" role="alert">Kunne ikke endre status. Prøv igjen.</p>
        ) : null}
        <div className="form-actions">
          <button className="button button--primary" type="submit" disabled={busy || Boolean(logo.error) || !isDirty}>
            {save.isPending ? 'Lagrer …' : (profile ? 'Lagre endringer' : 'Opprett profil')}
          </button>
          {profile ? (
          <button
            className="button button--secondary"
            type="button"
            disabled={busy || isDirty || Boolean(logo.error)}
            onClick={() => update.mutate(!isActive)}
          >
            {isActive ? 'Deaktiver B-profil' : 'Aktiver B-profil'}
          </button>
          ) : null}
        </div>
      </form>
    </Panel>
  );
}
