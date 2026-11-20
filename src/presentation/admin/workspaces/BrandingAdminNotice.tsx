import { Link } from 'react-router-dom';

import { routes } from '../../../app/routes';
import { useBrandingRequestCount } from '../../../application/workspaces/useBrandingRequests';
import { useSvarioAdminAccess } from '../../../application/workspaces/useWorkspaceBrandingAdmin';
import './workspaceBrandingAdmin.css';

export function BrandingAdminNotice() {
  const access = useSvarioAdminAccess();
  const count = useBrandingRequestCount(access.data === true && !access.isError);
  if (!access.data || access.isError) return null;
  return (
    <div className="branding-admin-notice">
      <Link to={routes.workspaceBrandingAdmin}>
        Svario-admin · Profilering
        {count.data !== undefined && !count.isError ? <span className="status-pill status-pill--draft" aria-live="polite">
          {count.data} {count.data === 1 ? 'ny forespørsel' : 'nye forespørsler'}
        </span> : null}
      </Link>
      {count.isError ? <span role="status">Varsel er utilgjengelig. Åpne innboksen for å prøve igjen.</span> : null}
    </div>
  );
}
