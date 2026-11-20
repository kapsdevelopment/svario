import { useEffect, useState, type FormEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useInstanceAdmin, useInstanceUsers, useRegistrationPolicy } from '../../../application/instance/useInstanceAdministration';
import { updateRegistrationPolicy } from '../../../application/instance/useInstanceAdministration';
import { normalizeEmailDomains, type RegistrationMode, type RegistrationPolicy } from '../../../domain/instance/registrationPolicy';
import { Panel } from '../../shared/components/Panel';
import './instanceAdmin.css';

const pageSize = 50;

export function InstanceAdminPage() {
  const admin = useInstanceAdmin();
  const policy = useRegistrationPolicy();
  const queryClient = useQueryClient();
  const [offset, setOffset] = useState(0);
  const users = useInstanceUsers(offset, admin.isInstanceAdmin);
  const [draft, setDraft] = useState<RegistrationPolicy | null>(null);
  const [domains, setDomains] = useState('');
  const [openConfirmed, setOpenConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const currentPage = offset / pageSize + 1;
  const pageCount = users.data ? Math.max(1, Math.ceil(users.data.total / pageSize)) : null;
  useEffect(() => {
    if (!draft && policy.data) { setDraft(policy.data); setDomains(policy.data.allowedDomains.join('\n')); }
  }, [draft, policy.data]);
  if (admin.isLoading) return <p>Laster administratorrettigheter…</p>;
  if (!admin.isInstanceAdmin) return <Panel title="Administrasjon"><p>Du har ikke tilgang til denne siden.</p></Panel>;

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft) return;
    setBusy(true); setMessage(''); setError('');
    try {
      if (draft.mode === 'open' && !openConfirmed) throw new Error('Bekreft at alle som når instansen, kan registrere seg.');
      const next = await updateRegistrationPolicy(draft.mode, draft.mode === 'domains' ? normalizeEmailDomains(domains) : [], draft.version);
      setDraft(next); setDomains(next.allowedDomains.join('\n')); setOpenConfirmed(false);
      await queryClient.invalidateQueries({ queryKey: ['instance-registration-policy'] });
      setMessage('Registreringsreglene er lagret. Endringen gjelder nye registreringer.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kunne ikke lagre. Reglene kan ha blitt endret av en annen administrator. Last inn på nytt.');
    } finally { setBusy(false); }
  }
  return <div className="instance-admin">
    <header><h1>Administrasjon</h1><p>Brukere og registrering for denne lokale installasjonen.</p></header>
    <p className="form-alert form-alert--info">Administratorrollen gir ikke tilgang til andre brukeres spørreskjemaer eller svar. Domeneregler gjelder nye kontoer, ikke tilbakevirkende sperring av eksisterende brukere.</p>
    <Panel title="Registreringsregler">
      {policy.isError && <p role="alert">Kunne ikke hente registreringsreglene.</p>}
      {draft && <form className="form-stack" onSubmit={save}>
        <label>Hvem kan opprette konto?<select value={draft.mode} disabled={busy} onChange={(e) => { setDraft({ ...draft, mode: e.target.value as RegistrationMode }); setOpenConfirmed(false); }}>
          <option value="closed">Ingen – selvregistrering stengt</option>
          <option value="domains">Bare angitte e-postdomener</option>
          <option value="open">Alle som har tilgang til instansen</option>
        </select></label>
        {draft.mode === 'domains' && <label>Tillatte e-postdomener<textarea rows={4} placeholder="nordvik.example.test" value={domains} onChange={(e) => setDomains(e.target.value)} /><small>Hele domener, ett per linje. Ingen @ eller jokertegn. Underdomener må angis separat.</small></label>}
        {draft.mode === 'open' && <label className="instance-admin__check"><input type="checkbox" checked={openConfirmed} onChange={(e) => setOpenConfirmed(e.target.checked)} />Jeg ønsker å tillate registrering fra alle e-postdomener.</label>}
        <p>E-postbekreftelse er påkrevd. Nye brukere blir vanlige skjemabrukere, aldri administratorer.</p>
        <div className="instance-admin__actions">
          <button className="button button--primary" disabled={busy || (draft.mode === 'open' && !openConfirmed)}>Lagre regler</button>
          <button type="button" className="button button--secondary" disabled={busy} onClick={async () => { const result = await policy.refetch(); if (result.data) { setDraft(result.data); setDomains(result.data.allowedDomains.join('\n')); } }}>Last inn på nytt</button>
        </div>
      </form>}
      {message && <p role="status" className="form-alert form-alert--success">{message}</p>}
      {error && <p role="alert" className="form-alert form-alert--error">{error}</p>}
    </Panel>
    <Panel title="Registrerte brukere" subtitle={`${users.data?.total ?? '…'} kontoer, inkludert ubekreftede`}>
      <button className="button button--secondary" type="button" onClick={() => void users.refetch()}>Oppdater brukerliste</button>
      {users.isError && <p role="alert">Kunne ikke hente brukerne.</p>}
      <div className="instance-admin__table"><table><thead><tr><th>E-post</th><th>Rolle</th><th>Status</th><th>Opprettet</th><th>Sist innlogget</th></tr></thead><tbody>
        {users.data?.users.map((user) => <tr key={user.authUserId}>
          <td>{user.email ?? 'Ingen e-post'}</td><td>{user.isAdmin ? 'Administrator' : 'Skjemabruker'}</td>
          <td>{!user.confirmedAt ? 'Venter på e-postbekreftelse' : !user.accountId ? 'Bekreftet – venter på første innlogging' : user.accountStatus === 'active' ? 'Aktiv' : user.accountStatus}</td>
          <td>{date(user.createdAt)}</td><td>{date(user.lastSignInAt)}</td>
        </tr>)}
      </tbody></table></div>
      <nav className="instance-admin__pagination" aria-label="Sider med registrerte brukere">
        <button type="button" className="button button--secondary" disabled={!offset} onClick={() => setOffset(offset - pageSize)}>Forrige</button>
        <span className="instance-admin__page-status" aria-live="polite" aria-atomic="true">
          Side {currentPage}{pageCount !== null ? ` av ${pageCount}` : ''}
        </span>
        <button type="button" className="button button--secondary" disabled={!users.data || offset + pageSize >= users.data.total} onClick={() => setOffset(offset + pageSize)}>Neste</button>
      </nav>
    </Panel>
  </div>;
}
function date(value: string | null) { return value ? new Date(value).toLocaleString('nb-NO') : '–'; }
