import { useState, type FormEvent } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { routes } from '../../../app/routes';
import { useAuth } from '../../../application/auth/AuthProvider';
import { canResetPassword, finishPasswordRecovery, sendConfirmationAgain, sendPasswordRecovery } from '../../../application/auth/customerEmailFlow';
import { useRegistrationPolicy } from '../../../application/instance/useInstanceAdministration';
import { getUserFacingErrorMessage } from '../../../application/errors/userFacingError';
import { emailMatchesPolicy } from '../../../domain/instance/registrationPolicy';
import { getAuthRedirectUrl } from '../../../infrastructure/config/authRedirect';
import { instanceBrand, isCustomerBuild } from '../../../infrastructure/config/instanceBrand';
import { Panel } from '../../shared/components/Panel';
import { CustomerSurface } from '../../shared/layout/CustomerSurface';

export function CustomerAccountPage() {
  const auth = useAuth();
  const location = useLocation();
  const policy = useRegistrationPolicy();
  const registering = location.pathname === routes.register;
  const resetting = location.pathname === routes.resetPassword;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [repeat, setRepeat] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const resetAllowed = canResetPassword(auth.user?.id);
  const registrationAllowed = policy.data?.enabled && policy.data.mode !== 'closed';
  if (!isCustomerBuild || instanceBrand.presentationOnly) return <Navigate to={routes.login} replace />;

  async function action(work: () => Promise<void>) {
    setBusy(true); setError(''); setMessage('');
    try { await work(); } catch (e) { setError(getUserFacingErrorMessage(e, 'Kunne ikke fullføre. Prøv igjen senere.')); }
    finally { setBusy(false); }
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await action(async () => {
      if (registering || resetting) {
        if (password.length < 12 || password !== repeat) throw new Error('Bruk minst 12 tegn, og skriv samme passord i begge feltene.');
      }
      if (registering) {
        if (!policy.data || !emailMatchesPolicy(email, policy.data)) throw new Error('E-postadressen er ikke tillatt for registrering på denne instansen.');
        await auth.signUpWithPassword(email.trim(), password, getAuthRedirectUrl());
        setMessage('Hvis adressen kan registreres, mottar du en e-post. Åpne bekreftelseslenken før du logger inn.');
      } else if (resetting) {
        if (!resetAllowed) throw new Error('Åpne en gyldig lenke fra e-posten først.');
        await auth.updatePassword(password);
        finishPasswordRecovery();
        await auth.signOut();
        setDone(true); setMessage('Passordet er endret. Du kan nå logge inn med det nye passordet.');
      } else {
        await sendPasswordRecovery(email.trim());
        setMessage('Hvis adressen tilhører en konto, mottar du en e-post med en lenke for å velge nytt passord.');
      }
      setPassword(''); setRepeat('');
    });
  }
  return <main className="auth-page image-page image-page--pine">
    <CustomerSurface>
    <Panel title={registering ? 'Opprett konto' : resetting ? 'Velg nytt passord' : 'Glemt passord'} subtitle={instanceBrand.identity ? undefined : instanceBrand.name}>
      {instanceBrand.logoUrl && !instanceBrand.identity && <img alt="" className="auth-brand__logo" src={instanceBrand.logoUrl} />}
      {registering && <p>Opprett din egen konto for å lage spørreskjemaer. Kontoen gir ikke administratorrettigheter.</p>}
      {registering && !registrationAllowed && <p className="form-alert form-alert--info">
        {policy.isLoading ? 'Henter registreringsregler…' : policy.isError ? 'Kunne ikke hente registreringsreglene. Prøv igjen senere.' : 'Selvregistrering er stengt på denne instansen.'}
      </p>}
      {registering && policy.data?.mode === 'domains' && <p>Tillatte e-postdomener: {policy.data.allowedDomains.join(', ')}. Underdomener må være angitt separat.</p>}
      {resetting && !resetAllowed && !done && auth.status !== 'loading' && <p className="form-alert form-alert--info">Åpne lenken fra e-posten, eller <Link to={routes.forgotPassword}>be om en ny lenke</Link>.</p>}
      {!done && (!registering || registrationAllowed) && (!resetting || resetAllowed) && <form className="form-stack" onSubmit={submit}>
        {!resetting && <label>E-post<input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></label>}
        {(registering || resetting) && <>
          <label>Passord (minst 12 tegn)<input type="password" autoComplete="new-password" minLength={12} required value={password} onChange={(e) => setPassword(e.target.value)} /></label>
          <label>Gjenta passord<input type="password" autoComplete="new-password" minLength={12} required value={repeat} onChange={(e) => setRepeat(e.target.value)} /></label>
        </>}
        <button className="button button--primary" disabled={busy} type="submit">{busy ? 'Arbeider…' : registering ? 'Opprett konto' : resetting ? 'Lagre nytt passord' : 'Send lenke'}</button>
      </form>}
      {message && <p role="status" className="form-alert form-alert--success">{message}</p>}
      {error && <p role="alert" className="form-alert form-alert--error">{error}</p>}
      {registering && message && <button className="button button--secondary" disabled={busy} type="button" onClick={() => void action(async () => {
        await sendConfirmationAgain(email.trim()); setMessage('Hvis kontoen venter på bekreftelse, er en ny e-post sendt.');
      })}>Send bekreftelse på nytt</button>}
      <p><Link to={routes.login}>Til innlogging</Link></p>
    </Panel>
    </CustomerSurface>
  </main>;
}
