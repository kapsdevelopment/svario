import { type FormEvent, useState } from 'react';

import { useAuth } from '../../../application/auth/AuthProvider';
import { useRequestBranding } from '../../../application/workspaces/useBrandingRequests';
import { Panel } from '../../shared/components/Panel';

export function BrandingInterestForm({ accountId, workspaceId, previouslyClosed }: {
  accountId: string; workspaceId: string; previouslyClosed: boolean;
}) {
  const { user } = useAuth();
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState(user?.email ?? '');
  const [message, setMessage] = useState('');
  const request = useRequestBranding(accountId, workspaceId);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (contactName.trim() && contactEmail.trim()) request.mutate({ contactName, contactEmail, message });
  }

  return (
    <Panel className="branding-interest" title="Egen logo på skjemaene">
      <p>Profilering er en betalt tilleggsfunksjon. Bedriftskontoen kan fortsatt brukes gratis uten profilering.</p>
      <p>Meld interesse, så kontakter vi dere om pris og oppstart. Forespørselen er uforpliktende.</p>
      {previouslyClosed ? <p>Den forrige forespørselen er avsluttet. Dere kan melde interesse på nytt.</p> : null}
      <form className="form-stack" onSubmit={submit}>
        <fieldset className="branding-admin-fields" disabled={request.isPending}>
          <label>Kontaktperson<input autoComplete="name" value={contactName} maxLength={120} required onChange={(event) => setContactName(event.target.value)} /></label>
          <label>E-post<input type="email" autoComplete="email" value={contactEmail} maxLength={254} required onChange={(event) => setContactEmail(event.target.value)} /></label>
          <label>Kommentar (valgfritt)<textarea value={message} maxLength={2000} rows={3} onChange={(event) => setMessage(event.target.value)} /></label>
        </fieldset>
        {request.isError ? <p className="form-alert form-alert--error" role="alert">Kunne ikke sende forespørselen. Kontroller kontaktopplysningene og prøv igjen.</p> : null}
        <div className="form-actions">
          <button className="button button--primary" type="submit" disabled={request.isPending || !contactName.trim()}>
            {request.isPending ? 'Sender …' : 'Meld interesse'}
          </button>
        </div>
      </form>
    </Panel>
  );
}
