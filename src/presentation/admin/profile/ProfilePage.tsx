import {
  Building2,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  KeyRound,
  Link2,
  Save,
  Search,
  Trash2,
  UserMinus,
  Users,
} from 'lucide-react';
import { type FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { routes } from '../../../app/routes';
import { useAuth } from '../../../application/auth/AuthProvider';
import {
  useMyProfile,
  useUpdateMyProfile,
} from '../../../application/profiles/useMyProfile';
import { useCreateWorkspace } from '../../../application/workspaces/useCreateWorkspace';
import { useCreateWorkspaceInvitation } from '../../../application/workspaces/useCreateWorkspaceInvitation';
import { useDeleteWorkspace } from '../../../application/workspaces/useDeleteWorkspace';
import { useLookupOrganizationByNumber } from '../../../application/workspaces/useLookupOrganizationByNumber';
import { useRemoveWorkspaceMember } from '../../../application/workspaces/useRemoveWorkspaceMember';
import { useWorkspaces } from '../../../application/workspaces/useWorkspaces';
import type {
  BusinessRegistryOrganization,
  WorkspaceMember,
  WorkspaceType,
  WorkspaceWithMembership,
} from '../../../domain/workspaces/workspace';
import { ConfirmDialog } from '../../shared/components/ConfirmDialog';
import { Panel } from '../../shared/components/Panel';

const minimumPasswordLength = 6;

export function ProfilePage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [profileDisplayName, setProfileDisplayName] = useState('');
  const [profileDisplayNameEdited, setProfileDisplayNameEdited] = useState(false);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [deleteAccountError, setDeleteAccountError] = useState<string | null>(
    null,
  );
  const [workspaceName, setWorkspaceName] = useState('');
  const [workspaceType, setWorkspaceType] = useState<WorkspaceType>('team');
  const [organizationNumber, setOrganizationNumber] = useState('');
  const [workspaceValidationError, setWorkspaceValidationError] = useState<
    string | null
  >(null);
  const [invitationLinks, setInvitationLinks] = useState<Record<string, string>>(
    {},
  );
  const [deleteAccountDialogOpen, setDeleteAccountDialogOpen] = useState(false);
  const [memberRemovalTarget, setMemberRemovalTarget] = useState<{
    workspace: WorkspaceWithMembership;
    member: WorkspaceMember;
  } | null>(null);
  const [workspaceToDelete, setWorkspaceToDelete] =
    useState<WorkspaceWithMembership | null>(null);
  const [showAccountDetails, setShowAccountDetails] = useState(false);
  const myProfile = useMyProfile(auth.account?.id);
  const updateMyProfile = useUpdateMyProfile();
  const workspaces = useWorkspaces(auth.account?.id);
  const createWorkspace = useCreateWorkspace();
  const createWorkspaceInvitation = useCreateWorkspaceInvitation();
  const lookupOrganization = useLookupOrganizationByNumber();
  const removeWorkspaceMember = useRemoveWorkspaceMember();
  const deleteWorkspace = useDeleteWorkspace();

  useEffect(() => {
    if (!profileDisplayNameEdited) {
      setProfileDisplayName(myProfile.data?.displayName ?? '');
    }
  }, [myProfile.data?.displayName, profileDisplayNameEdited]);

  async function handleProfileUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setProfileMessage(null);
    setProfileError(null);

    if (!auth.account?.id) {
      setProfileError('Profilen er ikke klargjort ennå.');
      return;
    }

    const displayName = profileDisplayName.trim();

    try {
      const updatedProfile = await updateMyProfile.mutateAsync({
        accountId: auth.account.id,
        displayName: displayName || null,
      });
      setProfileDisplayName(updatedProfile.displayName ?? '');
      setProfileDisplayNameEdited(false);
      setProfileMessage(
        updatedProfile.displayName
          ? 'Profilnavnet er oppdatert.'
          : 'Profilnavnet er fjernet.',
      );
    } catch (error) {
      setProfileError(getErrorMessage(error, 'Kunne ikke lagre profilen.'));
    }
  }

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
      setPasswordError(getErrorMessage(error, 'Kunne ikke oppdatere passordet.'));
    } finally {
      setIsUpdatingPassword(false);
    }
  }

  function handleDeleteAccount() {
    setDeleteAccountError(null);
    setDeleteAccountDialogOpen(true);
  }

  async function confirmDeleteAccount() {
    setIsDeletingAccount(true);

    try {
      await auth.deleteCurrentAccount();
      navigate(routes.home, { replace: true });
    } catch (error) {
      setDeleteAccountError(getErrorMessage(error, 'Kunne ikke slette kontoen.'));
    } finally {
      setIsDeletingAccount(false);
      setDeleteAccountDialogOpen(false);
    }
  }

  async function handleCreateWorkspace(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setWorkspaceValidationError(null);

    const name = workspaceName.trim();
    const normalizedOrganizationNumber = organizationNumber.replace(/\D/g, '');

    if (!name) {
      setWorkspaceValidationError('Arbeidsflaten må ha et navn.');
      return;
    }

    if (
      workspaceType === 'business' &&
      !/^[0-9]{9}$/.test(normalizedOrganizationNumber)
    ) {
      setWorkspaceValidationError('Bedrift må ha et gyldig organisasjonsnummer.');
      return;
    }

    if (
      workspaceType === 'business' &&
      lookupOrganization.data?.organizationNumber !== normalizedOrganizationNumber
    ) {
      setWorkspaceValidationError(
        'Hent bedriften fra BRREG før du oppretter arbeidsflaten.',
      );
      return;
    }

    try {
      await createWorkspace.mutateAsync({
        name,
        type: workspaceType,
        organizationNumber:
          workspaceType === 'business' ? normalizedOrganizationNumber : null,
      });
    } catch {
      return;
    }

    setWorkspaceName('');
    setOrganizationNumber('');
    setWorkspaceType('team');
    lookupOrganization.reset();
  }

  async function handleLookupOrganization() {
    setWorkspaceValidationError(null);

    const normalizedOrganizationNumber = organizationNumber.replace(/\D/g, '');

    if (!/^[0-9]{9}$/.test(normalizedOrganizationNumber)) {
      setWorkspaceValidationError('Organisasjonsnummeret må være 9 siffer.');
      return;
    }

    try {
      const organization = await lookupOrganization.mutateAsync(
        normalizedOrganizationNumber,
      );
      setOrganizationNumber(organization.organizationNumber);
      setWorkspaceName(organization.name);
    } catch {
      return;
    }
  }

  function handleOrganizationNumberChange(value: string) {
    setOrganizationNumber(value);
    setWorkspaceValidationError(null);
    lookupOrganization.reset();
  }

  function handleWorkspaceTypeChange(value: WorkspaceType) {
    setWorkspaceType(value);
    setWorkspaceValidationError(null);

    if (value === 'team') {
      setOrganizationNumber('');
      lookupOrganization.reset();
    }
  }

  async function handleCreateInvitation(workspace: WorkspaceWithMembership) {
    try {
      const token = await createWorkspaceInvitation.mutateAsync({
        workspaceId: workspace.id,
        role: 'member',
      });
      const invitationLink = createInvitationLink(token);
      setInvitationLinks((currentLinks) => ({
        ...currentLinks,
        [workspace.id]: invitationLink,
      }));
      await navigator.clipboard?.writeText(invitationLink);
    } catch {
      return;
    }
  }

  function handleRemoveMember(
    workspace: WorkspaceWithMembership,
    member: WorkspaceMember,
  ) {
    setMemberRemovalTarget({ workspace, member });
  }

  async function confirmRemoveMember() {
    if (!memberRemovalTarget) {
      return;
    }

    try {
      await removeWorkspaceMember.mutateAsync({
        workspaceId: memberRemovalTarget.workspace.id,
        accountId: memberRemovalTarget.member.accountId,
      });
    } catch {
      return;
    } finally {
      setMemberRemovalTarget(null);
    }
  }

  function handleDeleteWorkspace(workspace: WorkspaceWithMembership) {
    setWorkspaceToDelete(workspace);
  }

  async function confirmDeleteWorkspace() {
    if (!workspaceToDelete) {
      return;
    }

    try {
      await deleteWorkspace.mutateAsync(workspaceToDelete.id);
    } catch {
      return;
    } finally {
      setWorkspaceToDelete(null);
    }
  }

  const profileContactEmail = myProfile.data?.contactEmail ?? auth.user?.email ?? '';

  return (
    <div className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Konto</p>
          <h1>Min profil</h1>
        </div>
      </header>

      <Panel title="Profil">
        <form className="form-stack" onSubmit={handleProfileUpdate}>
          <div className="profile-form-fields">
            <label>
              Navn
              <input
                type="text"
                value={profileDisplayName}
                disabled={myProfile.isLoading || updateMyProfile.isPending}
                maxLength={120}
                placeholder="Legg til navn eller organisasjon"
                onChange={(event) => {
                  setProfileDisplayName(event.target.value);
                  setProfileDisplayNameEdited(true);
                  setProfileMessage(null);
                  setProfileError(null);
                }}
              />
              <span className="field-help">
                Brukes som forslag til behandlingsansvarlig for individuelle
                skjemaer.
              </span>
            </label>
            <label>
              Registrert e-post
              <input
                aria-readonly="true"
                placeholder="Ingen e-post registrert"
                readOnly
                value={profileContactEmail}
              />
              <span className="field-help">
                Brukes som forslag til personvernkontakt. Kan overstyres per
                skjema.
              </span>
            </label>
          </div>

          <div className="form-actions">
            <button
              className="button button--primary"
              disabled={
                myProfile.isLoading ||
                updateMyProfile.isPending ||
                !auth.account?.id
              }
              type="submit"
            >
              <Save size={18} aria-hidden="true" />
              {updateMyProfile.isPending ? 'Lagrer...' : 'Lagre profil'}
            </button>
          </div>
        </form>

        {myProfile.isError ? (
          <p className="form-alert form-alert--error" role="alert">
            {getErrorMessage(myProfile.error, 'Kunne ikke hente profilen.')}
          </p>
        ) : null}
        {profileMessage ? (
          <p className="form-alert form-alert--success" role="status">
            {profileMessage}
          </p>
        ) : null}
        {profileError ? (
          <p className="form-alert form-alert--error" role="alert">
            {profileError}
          </p>
        ) : null}
      </Panel>

      <Panel
        title="Konto"
        subtitle={auth.user?.email ?? 'Innlogget admin'}
        action={
          <button
            className="button button--secondary"
            type="button"
            aria-expanded={showAccountDetails}
            onClick={() => setShowAccountDetails((isOpen) => !isOpen)}
          >
            {showAccountDetails ? (
              <ChevronUp size={18} aria-hidden="true" />
            ) : (
              <ChevronDown size={18} aria-hidden="true" />
            )}
            {showAccountDetails ? 'Skjul detaljer' : 'Vis mer'}
          </button>
        }
      >
        {showAccountDetails ? (
          <dl className="definition-list">
            <div>
              <dt>Svario-konto</dt>
              <dd>{auth.account?.id ?? 'Ikke klargjort'}</dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>{auth.account?.status ?? 'Ukjent'}</dd>
            </div>
            <div>
              <dt>Innlogging</dt>
              <dd>{auth.user?.id ?? 'Ukjent'}</dd>
            </div>
          </dl>
        ) : (
          <p className="field-help">
            Tekniske konto-ID-er er skjult i vanlig bruk.
          </p>
        )}
      </Panel>

      <Panel
        title="Arbeidsflater"
        subtitle="Opprett en type arbeidsflate som gjenspeiler hva slags gruppe du / dere er. Studentgruppe, eller organisasjon."
      >
        <form className="form-stack" onSubmit={handleCreateWorkspace}>
          <div className="form-grid">
            <label>
              Type
              <select
                value={workspaceType}
                disabled={createWorkspace.isPending}
                onChange={(event) =>
                  handleWorkspaceTypeChange(event.target.value as WorkspaceType)
                }
              >
                <option value="team">Team</option>
                <option value="business">Bedrift</option>
              </select>
            </label>
            <label>
              Navn
              <input
                type="text"
                value={workspaceName}
                disabled={createWorkspace.isPending}
                placeholder={
                  workspaceType === 'business'
                    ? 'Svario AS'
                    : 'Mastergruppe vår 2026'
                }
                onChange={(event) => setWorkspaceName(event.target.value)}
              />
            </label>
            {workspaceType === 'business' ? (
              <label>
                Organisasjonsnummer
                <div className="lookup-field">
                  <input
                    type="text"
                    value={organizationNumber}
                    disabled={createWorkspace.isPending}
                    inputMode="numeric"
                    placeholder="999888777"
                    onChange={(event) =>
                      handleOrganizationNumberChange(event.target.value)
                    }
                  />
                  <button
                    className="button button--secondary"
                    type="button"
                    disabled={
                      createWorkspace.isPending || lookupOrganization.isPending
                    }
                    onClick={handleLookupOrganization}
                  >
                    <Search size={18} aria-hidden="true" />
                    {lookupOrganization.isPending ? 'Henter...' : 'Hent fra BRREG'}
                  </button>
                </div>
              </label>
            ) : null}
          </div>

          {workspaceType === 'business' && lookupOrganization.isSuccess ? (
            <div className="lookup-result lookup-result--success">
              <CheckCircle2 size={20} aria-hidden="true" />
              <div>
                <strong>{lookupOrganization.data.name}</strong>
                <span>{formatBrregOrganizationMeta(lookupOrganization.data)}</span>
              </div>
            </div>
          ) : null}

          {workspaceType === 'business' && lookupOrganization.isError ? (
            <p className="form-alert form-alert--error">
              {getErrorMessage(
                lookupOrganization.error,
                'Kunne ikke hente bedriften fra BRREG.',
              )}
            </p>
          ) : null}

          <div className="form-actions">
            <button
              className="button button--primary"
              type="submit"
              disabled={createWorkspace.isPending}
            >
              {workspaceType === 'business' ? (
                <Building2 size={18} aria-hidden="true" />
              ) : (
                <Users size={18} aria-hidden="true" />
              )}
              {createWorkspace.isPending ? 'Oppretter...' : 'Opprett arbeidsflate'}
            </button>
          </div>
        </form>

        {workspaceValidationError ? (
          <p className="form-alert form-alert--error">{workspaceValidationError}</p>
        ) : null}
        {createWorkspace.isError ? (
          <p className="form-alert form-alert--error">
            {getErrorMessage(createWorkspace.error, 'Kunne ikke opprette arbeidsflate.')}
          </p>
        ) : null}

        <div className="workspace-list">
          {workspaces.isLoading ? (
            <div className="empty-state">Laster arbeidsflater...</div>
          ) : null}
          {workspaces.isError ? (
            <p className="form-alert form-alert--error">
              {getErrorMessage(workspaces.error, 'Kunne ikke hente arbeidsflater.')}
            </p>
          ) : null}
          {workspaces.data?.length === 0 ? (
            <div className="empty-state">
              <Users size={28} aria-hidden="true" />
              <p>Du har ingen arbeidsflater ennå.</p>
            </div>
          ) : null}
          {workspaces.data?.map((workspace) => (
            <WorkspaceCard
              accountId={auth.account?.id ?? null}
              invitationLink={invitationLinks[workspace.id] ?? null}
              isDeleting={deleteWorkspace.isPending}
              isInviting={createWorkspaceInvitation.isPending}
              isRemovingMember={removeWorkspaceMember.isPending}
              key={workspace.id}
              workspace={workspace}
              onCreateInvitation={handleCreateInvitation}
              onDeleteWorkspace={handleDeleteWorkspace}
              onRemoveMember={handleRemoveMember}
            />
          ))}
        </div>

        {createWorkspaceInvitation.isError ? (
          <p className="form-alert form-alert--error">
            {getErrorMessage(
              createWorkspaceInvitation.error,
              'Kunne ikke lage invitasjon.',
            )}
          </p>
        ) : null}
        {removeWorkspaceMember.isError ? (
          <p className="form-alert form-alert--error">
            {getErrorMessage(
              removeWorkspaceMember.error,
              'Kunne ikke fjerne medlem.',
            )}
          </p>
        ) : null}
        {deleteWorkspace.isError ? (
          <p className="form-alert form-alert--error">
            {getErrorMessage(deleteWorkspace.error, 'Kunne ikke slette arbeidsflate.')}
          </p>
        ) : null}
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

      <Panel title="Slett konto" subtitle="Permanent sletting">
        <div className="danger-zone">
          <p>
            Sletter kontoen din, alle spørreundersøkelser, innsendte svar og
            resultater. Dette kan ikke angres.
          </p>
          <div className="form-actions">
            <button
              className="button button--danger"
              disabled={isDeletingAccount}
              type="button"
              onClick={handleDeleteAccount}
            >
              <Trash2 size={18} aria-hidden="true" />
              {isDeletingAccount ? 'Sletter...' : 'Slett min konto'}
            </button>
          </div>
        </div>

        {deleteAccountError ? (
          <p className="form-alert form-alert--error">{deleteAccountError}</p>
        ) : null}
      </Panel>

      <ConfirmDialog
        open={memberRemovalTarget !== null}
        title="Fjerne medlem?"
        description={`${formatWorkspaceMemberName(
          memberRemovalTarget?.member ?? null,
          auth.account?.id ?? null,
        )} mister tilgang til arbeidsflaten "${
          memberRemovalTarget?.workspace.name ?? ''
        }".`}
        confirmLabel="Fjern medlem"
        isPending={removeWorkspaceMember.isPending}
        variant="danger"
        onCancel={() => setMemberRemovalTarget(null)}
        onConfirm={confirmRemoveMember}
      />

      <ConfirmDialog
        open={workspaceToDelete !== null}
        title="Slette arbeidsflaten?"
        description={`Dette sletter "${
          workspaceToDelete?.name ?? ''
        }", alle skjemaer i arbeidsflaten og alle svar permanent.`}
        confirmLabel="Slett arbeidsflate"
        confirmationLabel={`Skriv ${
          workspaceToDelete?.name ?? ''
        } for å bekrefte`}
        confirmationText={workspaceToDelete?.name}
        isPending={deleteWorkspace.isPending}
        variant="danger"
        onCancel={() => setWorkspaceToDelete(null)}
        onConfirm={confirmDeleteWorkspace}
      />

      <ConfirmDialog
        open={deleteAccountDialogOpen}
        title="Slette kontoen din?"
        description="Dette sletter kontoen din, alle spørreundersøkelser, svar og resultater permanent. Handlingen kan ikke angres."
        confirmLabel="Slett min konto"
        confirmationLabel="Skriv SLETT for å bekrefte"
        confirmationPlaceholder="SLETT"
        confirmationText="SLETT"
        isPending={isDeletingAccount}
        variant="danger"
        onCancel={() => setDeleteAccountDialogOpen(false)}
        onConfirm={confirmDeleteAccount}
      />
    </div>
  );
}

function WorkspaceCard({
  accountId,
  invitationLink,
  isDeleting,
  isInviting,
  isRemovingMember,
  onCreateInvitation,
  onDeleteWorkspace,
  onRemoveMember,
  workspace,
}: {
  accountId: string | null;
  invitationLink: string | null;
  isDeleting: boolean;
  isInviting: boolean;
  isRemovingMember: boolean;
  onCreateInvitation: (workspace: WorkspaceWithMembership) => void;
  onDeleteWorkspace: (workspace: WorkspaceWithMembership) => void;
  onRemoveMember: (
    workspace: WorkspaceWithMembership,
    member: WorkspaceMember,
  ) => void;
  workspace: WorkspaceWithMembership;
}) {
  const canManageMembers =
    workspace.myRole === 'owner' || workspace.myRole === 'admin';
  const canDeleteWorkspace = workspace.myRole === 'owner';

  return (
    <article className="workspace-card">
      <div className="workspace-card__header">
        <div>
          <h3>{workspace.name}</h3>
          <p>
            {workspaceTypeLabel[workspace.type]} · {roleLabel[workspace.myRole]} ·{' '}
            {workspace.members.length} medlem
            {workspace.members.length === 1 ? '' : 'mer'}
          </p>
        </div>
        <div className="inline-actions">
          {canManageMembers ? (
            <button
              className="button button--secondary"
              type="button"
              disabled={isInviting}
              onClick={() => onCreateInvitation(workspace)}
            >
              <Link2 size={18} aria-hidden="true" />
              Inviter
            </button>
          ) : null}
          {canDeleteWorkspace ? (
            <button
              className="button button--danger"
              type="button"
              disabled={isDeleting}
              onClick={() => onDeleteWorkspace(workspace)}
            >
              <Trash2 size={18} aria-hidden="true" />
              Slett
            </button>
          ) : null}
        </div>
      </div>

      {workspace.organizationNumber ? (
        <div className="status-row">
          <span>Org.nr. {workspace.organizationNumber}</span>
        </div>
      ) : null}

      {invitationLink ? (
        <label className="copy-field">
          Invitasjonslenke
          <input readOnly value={invitationLink} onFocus={(event) => event.target.select()} />
        </label>
      ) : null}

      <div className="workspace-members">
        {workspace.members.map((member) => {
          const canRemove =
            canManageMembers &&
            member.accountId !== accountId &&
            (member.role !== 'owner' || workspace.myRole === 'owner');

          return (
            <div className="workspace-member-row" key={member.accountId}>
              <div>
                <strong>
                  {formatWorkspaceMemberName(member, accountId)}
                </strong>
                <span>{roleLabel[member.role]}</span>
              </div>
              {canRemove ? (
                <button
                  className="icon-button icon-button--danger"
                  type="button"
                  disabled={isRemovingMember}
                  aria-label={`Fjern ${formatWorkspaceMemberName(member, accountId)}`}
                  onClick={() => onRemoveMember(workspace, member)}
                >
                  <UserMinus size={18} aria-hidden="true" />
                </button>
              ) : null}
            </div>
          );
        })}
      </div>
    </article>
  );
}

function createInvitationLink(token: string) {
  return `${window.location.origin}${window.location.pathname}#${routes.joinWorkspace(
    token,
  )}`;
}

function formatWorkspaceMemberName(
  member: WorkspaceMember | null,
  currentAccountId: string | null,
) {
  if (!member) {
    return 'Medlem';
  }

  return member.accountId === currentAccountId
    ? 'Deg'
    : `Medlem ${member.accountId.slice(0, 8)}`;
}

function formatBrregOrganizationMeta(organization: BusinessRegistryOrganization) {
  const details = [`Org.nr. ${organization.organizationNumber}`];

  if (
    organization.organizationFormDescription ||
    organization.organizationFormCode
  ) {
    details.push(
      [
        organization.organizationFormDescription,
        organization.organizationFormCode
          ? `(${organization.organizationFormCode})`
          : null,
      ]
        .filter(Boolean)
        .join(' '),
    );
  }

  const place = [organization.postalPlace, organization.municipality]
    .filter(Boolean)
    .join(', ');

  if (place) {
    details.push(place);
  }

  if (organization.isDeleted) {
    details.push('Slettet i BRREG');
  }

  if (organization.isBankrupt) {
    details.push('Konkurs');
  }

  if (organization.isUnderLiquidation) {
    details.push('Under avvikling');
  }

  return details.join(' · ');
}

const workspaceTypeLabel = {
  business: 'Bedrift',
  team: 'Team',
} satisfies Record<WorkspaceType, string>;

const roleLabel = {
  admin: 'Admin',
  member: 'Medlem',
  owner: 'Eier',
} satisfies Record<WorkspaceWithMembership['myRole'], string>;

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
}
