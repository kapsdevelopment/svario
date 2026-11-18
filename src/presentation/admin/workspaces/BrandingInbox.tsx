import { useState } from 'react';

import { useBrandingInbox, useBrandingRequestCount, useReviewBrandingRequest } from '../../../application/workspaces/useBrandingRequests';
import { brandingRequestStatusLabel, type BrandingRequest, type BrandingRequestStatus } from '../../../domain/workspaces/brandingRequest';
import { Panel } from '../../shared/components/Panel';

export function BrandingInbox({ accountId }: { accountId: string }) {
  const [status, setStatus] = useState<BrandingRequestStatus | ''>('new');
  const [offset, setOffset] = useState(0);
  const [feedback, setFeedback] = useState('');
  const inbox = useBrandingInbox(accountId, status || null, offset);
  const count = useBrandingRequestCount(true);
  const review = useReviewBrandingRequest(accountId);

  function update(request: BrandingRequest, nextStatus: Exclude<BrandingRequestStatus, 'new'>) {
    setFeedback('');
    review.mutate({ requestId: request.id, revision: request.revision, status: nextStatus }, {
      onSuccess: () => {
        if (status !== '') {
          setStatus(nextStatus);
          setOffset(0);
        }
        setFeedback(nextStatus === 'approved'
          ? `Profilering er tillatt for ${request.workspaceName}. Kunden kan nå laste opp sin første logo.`
          : nextStatus === 'in_review'
            ? `Du følger nå opp ${request.workspaceName}. Avklar pris og oppstart med kunden, og trykk «Tillat profilering» når de skal få tilgang til logoopplasting.`
            : `Forespørselen fra ${request.workspaceName} er avsluttet.`);
      },
    });
  }

  return (
    <Panel className="branding-inbox" title="Innboks for profilering" subtitle="Følg opp interesse og avklar pris og oppstart før du gir tilgang."
      action={count.data !== undefined ? <span className="status-pill status-pill--draft" aria-live="polite">{count.data} {count.data === 1 ? 'ny' : 'nye'}</span> : undefined}>
      <div className="branding-inbox-controls">
        <label>Vis forespørsler
          <select value={status} onChange={(event) => { setStatus(event.target.value as BrandingRequestStatus | ''); setOffset(0); }}>
            <option value="">Alle</option>
            {Object.entries(brandingRequestStatusLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <button className="button button--secondary" type="button" disabled={inbox.isFetching} onClick={() => { void inbox.refetch(); void count.refetch(); }}>Oppdater innboks</button>
      </div>
      {feedback ? <p className="form-alert form-alert--success" role="status">{feedback}</p> : null}
      {review.isError ? <p className="form-alert form-alert--error" role="alert">
        {'code' in review.error && review.error.code === 'P0001'
          ? 'Forespørselen ble endret av en annen. Innboksen er oppdatert; kontroller status før du prøver igjen.'
          : 'Kunne ikke endre forespørselen. Oppdater innboksen og prøv igjen.'}
      </p> : null}
      {inbox.isPending ? <p role="status">Laster forespørsler …</p> : null}
      {inbox.isError ? <p className="form-alert form-alert--error" role="alert">Kunne ikke hente innboksen.</p> : null}
      {!inbox.isError && inbox.data?.length === 0 ? <p>Ingen forespørsler i denne visningen.</p> : null}
      {!inbox.isError ? <div className="branding-inbox-list">
        {inbox.data?.slice(0, 50).map((request) => (
          <article className="branding-request" key={request.id}>
            <div className="branding-request-heading">
              <h3>{request.workspaceName}</h3>
              <span className={`status-pill status-pill--${request.status === 'approved' ? 'active' : 'draft'}`}>{brandingRequestStatusLabel[request.status]}</span>
            </div>
            <p>{request.organizationNumber ? `Org.nr. ${request.organizationNumber} · ` : ''}
              <time dateTime={request.requestedAt}>{new Date(request.requestedAt).toLocaleString('nb-NO', { dateStyle: 'short', timeStyle: 'short' })}</time>
            </p>
            <p>{request.contactName} · <a href={`mailto:${request.contactEmail}`}>{request.contactEmail}</a></p>
            {request.message ? <p className="branding-request-message">{request.message}</p> : null}
            <div className="inline-actions">
              {request.status === 'new' || request.status === 'closed' ? <button className="button button--secondary" type="button" disabled={review.isPending} onClick={() => update(request, 'in_review')}>Ta til behandling</button> : null}
              {request.status === 'new' || request.status === 'in_review' ? <>
                <button className="button button--primary" type="button" disabled={review.isPending} onClick={() => update(request, 'approved')}>Tillat profilering</button>
                <button className="button button--secondary" type="button" disabled={review.isPending} onClick={() => update(request, 'closed')}>Avslutt forespørsel</button>
              </> : null}
              {request.status === 'approved' ? <p>Kunden har tilgang til profilering.</p> : null}
            </div>
          </article>
        ))}
      </div> : null}
      {offset > 0 || (inbox.data?.length ?? 0) > 50 ? <div className="form-actions">
        <button className="button button--secondary" type="button" disabled={offset === 0 || inbox.isFetching} onClick={() => setOffset(Math.max(0, offset - 50))}>Forrige</button>
        <span>Side {offset / 50 + 1}</span>
        <button className="button button--secondary" type="button" disabled={(inbox.data?.length ?? 0) <= 50 || inbox.isFetching} onClick={() => setOffset(offset + 50)}>Neste</button>
      </div> : null}
    </Panel>
  );
}
