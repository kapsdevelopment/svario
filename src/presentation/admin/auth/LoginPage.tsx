import { Panel } from '../../shared/components/Panel';

export function LoginPage() {
  return (
    <main className="auth-page image-page image-page--pine">
      <Panel title="Logg inn" subtitle="Svario admin">
        <form className="form-stack">
          <label>
            E-post
            <input type="email" autoComplete="email" />
          </label>
          <label>
            Passord
            <input type="password" autoComplete="current-password" />
          </label>
          <button className="button button--primary" type="button">
            Fortsett
          </button>
        </form>
      </Panel>
    </main>
  );
}
