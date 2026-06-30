import {
  Building2,
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
import { getUserFacingErrorMessage as getErrorMessage } from '../../../application/errors/userFacingError';
import {
  useMyProfile,
  useUpdateMyProfile,
} from '../../../application/profiles/useMyProfile';
import { useCreateWorkspace } from '../../../application/workspaces/useCreateWorkspace';
import { useCreateWorkspaceInvitation } from '../../../application/workspaces/useCreateWorkspaceInvitation';
import { useDeleteWorkspace } from '../../../application/workspaces/useDeleteWorkspace';
import { useLookupOrganizationByNumber } from '../../../application/workspaces/useLookupOrganizationByNumber';
import { useRemoveWorkspaceMember } from '../../../application/workspaces/useRemoveWorkspaceMember';
import { useSetWorkspaceOrganizationNumber } from '../../../application/workspaces/useSetWorkspaceOrganizationNumber';
import { useWorkspaces } from '../../../application/workspaces/useWorkspaces';
import type {
  BusinessRegistryOrganization,
  WorkspaceMember,
  WorkspaceOwner,
  WorkspaceType,
  WorkspaceWithMembership,
} from '../../../domain/workspaces/workspace';
import { ConfirmDialog } from '../../shared/components/ConfirmDialog';
import { Panel } from '../../shared/components/Panel';

const minimumPasswordLength = 6;

export function ProfilePage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [profilePersonalName, setProfilePersonalName] = useState('');
  const [profilePersonalNameEdited, setProfilePersonalNameEdited] =
    useState(false);
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
  const [workspaceMessage, setWorkspaceMessage] = useState<string | null>(null);
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
  const myProfile = useMyProfile(auth.account?.id);
  const updateMyProfile = useUpdateMyProfile();
  const workspaces = useWorkspaces(auth.account?.id);
  const createWorkspace = useCreateWorkspace();
  const createWorkspaceInvitation = useCreateWorkspaceInvitation();
  const lookupOrganization = useLookupOrganizationByNumber();
  const removeWorkspaceMember = useRemoveWorkspaceMember();
  const deleteWorkspace = useDeleteWorkspace();

  useEffect(() => {
    if (!profilePersonalNameEdited) {
      setProfilePersonalName(myProfile.data?.personalName ?? '');
    }
  }, [myProfile.data?.personalName, profilePersonalNameEdited]);

  async function handleProfileUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setProfileMessage(null);
    setProfileError(null);

    if (!auth.account?.id) {
      setProfileError('Profilen er ikke klargjort ennå.');
      return;
    }

    const personalName = profilePersonalName.trim();

    try {
      const updatedProfile = await updateMyProfile.mutateAsync({
        accountId: auth.account.id,
        personalName: personalName || null,
      });
      setProfilePersonalName(updatedProfile.personalName ?? '');
      setProfilePersonalNameEdited(false);
      setProfileMessage(
        updatedProfile.personalName
          ? 'Navnet ditt er oppdatert.'
          : 'Navnet ditt er fjernet.',
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
    setWorkspaceMessage(null);
    setWorkspaceValidationError(null);

    const name = workspaceName.trim();
    const normalizedOrganizationNumber = organizationNumber.replace(/\D/g, '');
    const organizationNumberForWorkspace =
      workspaceType === 'business' && normalizedOrganizationNumber
        ? normalizedOrganizationNumber
        : null;

    if (!name) {
      setWorkspaceValidationError('Arbeidsflaten må ha et navn.');
      return;
    }

    if (
      workspaceType === 'business' &&
      organizationNumberForWorkspace &&
      !/^[0-9]{9}$/.test(organizationNumberForWorkspace)
    ) {
      setWorkspaceValidationError('Bedrift må ha et gyldig organisasjonsnummer.');
      return;
    }

    try {
      const workspaceId = await createWorkspace.mutateAsync({
        name,
        type: workspaceType,
        organizationNumber: organizationNumberForWorkspace,
      });
      const existingWorkspace = workspaces.data?.find(
        (workspace) => workspace.id === workspaceId,
      );

      if (existingWorkspace) {
        setWorkspaceMessage(
          `Du har allerede tilgang til arbeidsflaten "${existingWorkspace.name}".`,
        );
      }
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
    setWorkspaceMessage(null);
    setWorkspaceValidationError(null);
    lookupOrganization.reset();
  }

  function handleWorkspaceTypeChange(value: WorkspaceType) {
    setWorkspaceType(value);
    setWorkspaceMessage(null);
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

      <Panel
        title="Personlig profil"
        subtitle="Brukes når du lager og sender ut individuelle skjemaer."
      >
        <form className="form-stack" onSubmit={handleProfileUpdate}>
          <div className="profile-form-fields">
            <label>
              Ditt navn
              <input
                type="text"
                value={profilePersonalName}
                disabled={myProfile.isLoading || updateMyProfile.isPending}
                maxLength={120}
                placeholder="Legg til navnet ditt"
                onChange={(event) => {
                  setProfilePersonalName(event.target.value);
                  setProfilePersonalNameEdited(true);
                  setProfileMessage(null);
                  setProfileError(null);
                }}
              />
              <span className="field-help">
                Brukes som forslag til behandlingsansvarlig når skjemaet er
                individuelt.
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
        title="Organisasjoner og team"
        subtitle="Arbeidsflater brukes når skjemaer skal sendes ut i kontekst av en bedrift, organisasjon eller gruppe."
      >
        <form className="form-stack" onSubmit={handleCreateWorkspace}>
          <div className="workspace-create-grid">
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
            {workspaceType === 'business' ? (
              <div className="workspace-organization-field">
                <label htmlFor="workspace-organization-number">
                  Organisasjonsnummer
                </label>
                <div className="lookup-field">
                  <input
                    id="workspace-organization-number"
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
                      createWorkspace.isPending ||
                      lookupOrganization.isPending ||
                      organizationNumber.replace(/\D/g, '').length === 0
                    }
                    onClick={handleLookupOrganization}
                  >
                    <Search size={18} aria-hidden="true" />
                    {lookupOrganization.isPending ? 'Henter...' : 'Hent fra BRREG'}
                  </button>
                </div>
              </div>
            ) : null}
            <label>
              Navn
              <input
                type="text"
                value={workspaceName}
                disabled={createWorkspace.isPending}
                placeholder={
                  workspaceType === 'business'
                    ? 'Bedriftsnavn'
                    : 'Teamnavn'
                }
                onChange={(event) => {
                  setWorkspaceName(event.target.value);
                  setWorkspaceMessage(null);
                }}
              />
            </label>
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
            <p className="form-alert form-alert--info">
              BRREG-oppslaget stoppet ikke opprettelsen:{' '}
              {getErrorMessage(
                lookupOrganization.error,
                'du kan fortsatt opprette arbeidsflaten manuelt.',
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

        {workspaceMessage ? (
          <p className="form-alert form-alert--info">{workspaceMessage}</p>
        ) : null}
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
              currentUserContact={profileContactEmail}
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

      <Panel title="Konto" subtitle={auth.user?.email ?? 'Innlogget admin'}>
        <div className="account-sections">
          <section className="account-section">
            <h3>Kontoinformasjon</h3>
            <dl className="definition-list">
              <div>
                <dt>Registrert e-post</dt>
                <dd>{auth.user?.email ?? 'Ingen e-post registrert'}</dd>
              </div>
              <div>
                <dt>Status</dt>
                <dd>{auth.account?.status ?? 'Ukjent'}</dd>
              </div>
              <div>
                <dt>Svario-konto</dt>
                <dd>{auth.account?.id ?? 'Ikke klargjort'}</dd>
              </div>
              <div>
                <dt>Innlogging</dt>
                <dd>{auth.user?.id ?? 'Ukjent'}</dd>
              </div>
            </dl>
          </section>

          <section className="account-section account-section--danger">
            <h3>Permanent sletting av konto</h3>
            <div className="danger-zone">
              <p>
                Sletter kontoen din, alle spørreundersøkelser, innsendte svar
                og resultater. Dette kan ikke angres.
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
          </section>
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
  currentUserContact,
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
  currentUserContact: string;
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
  const canAddOrganizationNumber =
    workspace.type === 'business' &&
    !workspace.organizationNumber &&
    canManageMembers;
  const externalOwners = workspace.owners.filter(
    (owner) => owner.accountId !== accountId,
  );
  const [isAddingOrganizationNumber, setIsAddingOrganizationNumber] =
    useState(false);
  const [organizationNumberDraft, setOrganizationNumberDraft] = useState('');
  const [organizationNumberError, setOrganizationNumberError] = useState<
    string | null
  >(null);
  const lookupWorkspaceOrganization = useLookupOrganizationByNumber();
  const setWorkspaceOrganizationNumber = useSetWorkspaceOrganizationNumber();

  async function handleLookupWorkspaceOrganization() {
    setOrganizationNumberError(null);

    const normalizedOrganizationNumber = organizationNumberDraft.replace(/\D/g, '');

    if (!/^[0-9]{9}$/.test(normalizedOrganizationNumber)) {
      setOrganizationNumberError('Organisasjonsnummeret må være 9 siffer.');
      return;
    }

    try {
      const organization = await lookupWorkspaceOrganization.mutateAsync(
        normalizedOrganizationNumber,
      );
      setOrganizationNumberDraft(organization.organizationNumber);
    } catch {
      return;
    }
  }

  async function handleSetWorkspaceOrganizationNumber(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();
    setOrganizationNumberError(null);

    const normalizedOrganizationNumber = organizationNumberDraft.replace(/\D/g, '');

    if (!/^[0-9]{9}$/.test(normalizedOrganizationNumber)) {
      setOrganizationNumberError('Organisasjonsnummeret må være 9 siffer.');
      return;
    }

    try {
      await setWorkspaceOrganizationNumber.mutateAsync({
        workspaceId: workspace.id,
        organizationNumber: normalizedOrganizationNumber,
      });
      setOrganizationNumberDraft('');
      setIsAddingOrganizationNumber(false);
      lookupWorkspaceOrganization.reset();
    } catch {
      return;
    }
  }

  function handleCancelWorkspaceOrganizationNumber() {
    setOrganizationNumberDraft('');
    setOrganizationNumberError(null);
    setIsAddingOrganizationNumber(false);
    lookupWorkspaceOrganization.reset();
  }

  return (
    <article className="workspace-card">
      <div className="workspace-card__header">
        <div>
          <h3>{workspace.name}</h3>
          <p>
            {workspaceTypeLabel[workspace.type]} · {workspace.members.length} medlem
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
          <span>
            {workspace.verifiedAt
              ? 'BRREG-verifisert'
              : 'Ikke BRREG-verifisert'}
          </span>
        </div>
      ) : workspace.type === 'business' ? (
        <div className="status-row">
          <span>Orgnummer ikke registrert ennå</span>
        </div>
      ) : null}

      {canAddOrganizationNumber && !isAddingOrganizationNumber ? (
        <div className="inline-actions">
          <button
            className="button button--secondary"
            type="button"
            onClick={() => setIsAddingOrganizationNumber(true)}
          >
            <Building2 size={18} aria-hidden="true" />
            Legg til orgnummer
          </button>
        </div>
      ) : null}

      {canAddOrganizationNumber && isAddingOrganizationNumber ? (
        <form
          className="workspace-organization-update"
          onSubmit={handleSetWorkspaceOrganizationNumber}
        >
          <label htmlFor={`workspace-org-number-${workspace.id}`}>
            Organisasjonsnummer
          </label>
          <div className="lookup-field">
            <input
              id={`workspace-org-number-${workspace.id}`}
              type="text"
              value={organizationNumberDraft}
              disabled={setWorkspaceOrganizationNumber.isPending}
              inputMode="numeric"
              placeholder="999888777"
              onChange={(event) => {
                setOrganizationNumberDraft(event.target.value);
                setOrganizationNumberError(null);
                lookupWorkspaceOrganization.reset();
              }}
            />
            <button
              className="button button--secondary"
              type="button"
              disabled={
                lookupWorkspaceOrganization.isPending ||
                setWorkspaceOrganizationNumber.isPending
              }
              onClick={handleLookupWorkspaceOrganization}
            >
              <Search size={18} aria-hidden="true" />
              {lookupWorkspaceOrganization.isPending
                ? 'Henter...'
                : 'Sjekk BRREG'}
            </button>
          </div>

          {lookupWorkspaceOrganization.isSuccess ? (
            <div className="lookup-result lookup-result--success">
              <CheckCircle2 size={20} aria-hidden="true" />
              <div>
                <strong>{lookupWorkspaceOrganization.data.name}</strong>
                <span>
                  {formatBrregOrganizationMeta(lookupWorkspaceOrganization.data)}
                </span>
              </div>
            </div>
          ) : null}

          {lookupWorkspaceOrganization.isError ? (
            <p className="form-alert form-alert--info">
              BRREG-oppslaget stoppet ikke lagringen:{' '}
              {getErrorMessage(
                lookupWorkspaceOrganization.error,
                'du kan fortsatt lagre organisasjonsnummeret manuelt.',
              )}
            </p>
          ) : null}

          {organizationNumberError ? (
            <p className="form-alert form-alert--error">{organizationNumberError}</p>
          ) : null}

          {setWorkspaceOrganizationNumber.isError ? (
            <p className="form-alert form-alert--error">
              {getErrorMessage(
                setWorkspaceOrganizationNumber.error,
                'Kunne ikke lagre organisasjonsnummer.',
              )}
            </p>
          ) : null}

          <div className="form-actions form-actions--split">
            <button
              className="button button--secondary"
              type="button"
              disabled={setWorkspaceOrganizationNumber.isPending}
              onClick={handleCancelWorkspaceOrganizationNumber}
            >
              Avbryt
            </button>
            <button
              className="button button--primary"
              type="submit"
              disabled={setWorkspaceOrganizationNumber.isPending}
            >
              <Save size={18} aria-hidden="true" />
              {setWorkspaceOrganizationNumber.isPending
                ? 'Lagrer...'
                : 'Lagre orgnummer'}
            </button>
          </div>
        </form>
      ) : null}

      {externalOwners.length > 0 ? (
        <div className="workspace-owner-summary">
          <span>Eier av arbeidsflaten</span>
          <div className="workspace-owner-list">
            {externalOwners.map((owner) => {
              const ownerContact = formatWorkspaceOwnerContact(owner);

              return (
                <div key={owner.accountId}>
                  <strong>{formatWorkspaceOwnerName(owner)}</strong>
                  {ownerContact ? <small>{ownerContact}</small> : null}
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      <div className="workspace-role-summary">
        <span>Du har rollen som</span>
        <strong>{roleLabel[workspace.myRole]}</strong>
      </div>

      {invitationLink ? (
        <label className="copy-field">
          Invitasjonslenke
          <input readOnly value={invitationLink} onFocus={(event) => event.target.select()} />
        </label>
      ) : null}

      <div className="workspace-members">
        <h4>Medlemmer</h4>
        {workspace.members.map((member) => {
          const canRemove =
            canManageMembers &&
            member.accountId !== accountId &&
            (member.role !== 'owner' || workspace.myRole === 'owner');
          const memberIsCurrentUser = member.accountId === accountId;

          return (
            <div className="workspace-member-row" key={member.accountId}>
              <div>
                <strong>
                  {formatWorkspaceMemberName(member, accountId)}
                </strong>
                <span>
                  {memberIsCurrentUser
                    ? formatCurrentWorkspaceMemberContact(currentUserContact)
                    : roleLabel[member.role]}
                </span>
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
    ? 'Du'
    : `Medlem ${member.accountId.slice(0, 8)}`;
}

function formatCurrentWorkspaceMemberContact(contact: string) {
  return contact.trim() || 'Innlogget konto';
}

function formatWorkspaceOwnerName(owner: WorkspaceOwner) {
  return (
    owner.personalName?.trim() ||
    owner.contactEmail?.trim() ||
    `Medlem ${owner.accountId.slice(0, 8)}`
  );
}

function formatWorkspaceOwnerContact(owner: WorkspaceOwner) {
  const contactEmail = owner.contactEmail?.trim();
  const personalName = owner.personalName?.trim();

  if (!contactEmail || contactEmail === personalName) {
    return null;
  }

  return contactEmail;
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
