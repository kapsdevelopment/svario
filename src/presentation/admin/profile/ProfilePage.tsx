import { Panel } from '../../shared/components/Panel';

export function ProfilePage() {
  return (
    <div className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Konto</p>
          <h1>Min profil</h1>
        </div>
      </header>

      <Panel title="Konto" subtitle="ken@example.com" />
    </div>
  );
}
