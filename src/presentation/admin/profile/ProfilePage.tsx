import { useAuth } from '../../../application/auth/AuthProvider';
import { Panel } from '../../shared/components/Panel';

export function ProfilePage() {
  const auth = useAuth();

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
    </div>
  );
}
