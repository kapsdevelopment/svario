# Svario To-do

Arbeidsliste for MVP: React/Vite webapp med Supabase Auth, Postgres/RLS og GitHub Pages-hostet web.

## 1. Repo og prosjektoppsett

- [x] Opprette Supabase-prosjekt i North EU (Stockholm).
- [x] Legge lokale Supabase-hemmeligheter i `.env.local`.
- [x] Ignorere lokale env-filer og genererte filer i `.gitignore`.
- [x] Opprette `.env.example` med tomme, trygge variabelnavn.
- [x] Pivote fra Flutter til React/Vite/TypeScript.
- [x] Legge til basispakker: Supabase, routing, state/query, charts, CSV og PDF.
- [x] Sette opp grunnleggende horisontal mappe-/modulstruktur.

## 2. Supabase og database

- [x] Initialisere lokal Supabase CLI-struktur i repoet.
- [x] Koble Supabase CLI til prosjektet.
- [x] Lage første database-migration.
- [x] Modellere tabeller for profiler, skjemaer, seksjoner, spørsmål, alternativer, besvarelser og svar.
- [x] Modellere domenebruker separat fra Supabase Auth-bruker med `app_users`, `account_auth_users`, `accounts`, `profiles` og `user_identities`.
- [x] Legge inn enum/statusfelt for `draft`, `published` og `closed`.
- [x] Legge inn støtte for valgfri `starts_at` og `ends_at`.
- [x] Legge inn støtte for anonyme og identifiserte besvarelser.
- [x] Aktivere RLS på alle app-tabeller.
- [x] Lage policies for innlogget admin/eier.
- [x] Lage trygg offentlig lesing/innsending via RPC eller tilsvarende kontrollert API.

## 3. Sikkerhet, personvern og tillit

- [x] Lage første offentlige sikkerhetsside for Svario.
- [x] Lage første offentlig landingsside og koble sikkerhetssiden inn som underside.
- [x] Lage offentlig personvern-/databrukside for Svario sitt datalofte.
- [ ] Lage en lett `SECURITY.md`/trust-center-plan som forklarer sikkerhetsmodell, datalagring, RLS, tilgangsstyring, backup, logging, hendelseshåndtering og kundens/personvernansvarliges ansvar.
- [ ] Dokumentere Supabase-region, DPA, underleverandører, kryptering i transitt og kryptering av lagrede data før produksjonssetting.
- [ ] Avklare produksjonskrav for admin-auth: vurdere/aktivere MFA for adminer, e-postbekreftelse, secure password change og korrekte production redirect URLs. MFA skal ikke blokkere utviklingsløpet før produksjonssetting.
- [ ] Velge bevisst passordpolicy for adminer. Ikke stramme inn bare for strenghets skyld; vurder reell sikkerhetsgevinst opp mot magic link, MFA ved produksjon, rate limits og session-kontroller.
- [x] Lage passordbytte i profilskjermen for innloggede adminer.
- [ ] Vurdere/implementere Supabase Passkeys (beta) etter at Dashboard-konfig, RP ID/origins og fallback-flyt er avklart.
- [ ] Lage RLS-/tilgangstester for eier, ikke-eier og anonym bruker på identitet, skjema, spørsmål, svar og resultater.
- [ ] Kjøre Supabase advisors/security checks før produksjonssetting og følge opp funn.
- [ ] Lage slette-/eksport-/retention-plan for persondata og anonyme besvarelser.
- [ ] Lage enkel incident response-rutine for mistanke om datalekkasjer, feilsendt tilgang eller eksponerte nøkler.

## 4. Web app-skall

- [x] Sette opp Supabase-klient fra Vite-miljøverdier.
- [x] Sette opp routing for admin og offentlig respondentflyt.
- [x] Legge inn første sett med nordiske bakgrunnsbilder for login, respondentflyt og dashboard.
- [x] Lage auth-flyt med e-post/passord og magic link for admin.
- [ ] Lage felles layout for desktop, tablet og mobil.
- [ ] Lage nordisk, profesjonelt tema med dempede naturfarger.
- [ ] Lage navigasjon for dashboard, skjemaer, resultater og profil.

## 5. Admin og skjemabygger

- [x] Lage dashboard med nøkkeltall og siste aktivitet.
- [x] Lage oversikt over aktive, historiske og utkast-skjemaer.
- [x] Lage opprettelse av nytt spørreskjema.
- [x] Lage første redigeringsside for draft-skjema.
- [x] Støtte seksjoner i skjema.
- [x] Støtte spørsmålstypene flervalg, fritekst og konfigurerbar skala.
- [x] Støtte enkeltvalg og flervalg per flervalgsspørsmål.
- [x] Støtte anonymisert eller identifisert besvarelse per skjema.
- [x] Støtte valgfri tidsavgrensning.
- [x] Lage publiseringsflyt og delbar lenke.
- [ ] Låse strukturfelter etter publisering med innsendte svar.

## 6. Respondentflyt

- [x] Lage offentlig besvarelsesside via delbar lenke.
- [x] Vise skjema-seksjoner og spørsmål intuitivt på mobil og desktop.
- [x] Validere påkrevde spørsmål før innsending.
- [x] Kreve navn eller e-post for identifiserte skjemaer.
- [x] Ikke lagre respondentidentitet for anonyme skjemaer.
- [x] Håndtere utløpte, ikke-startede, lukkede og ukjente skjemaer.
- [x] Lagre svar samlet ved innsending.
- [x] Vise enkel kvittering etter innsending.

## 7. Resultater og visualisering

- [x] Lage resultatside for innlogget admin.
- [x] Vise totaler, svarvolum og status.
- [x] Vise flervalg som stolpe- og/eller kakediagram.
- [x] Vise skalafordeling og snitt.
- [x] Vise fritekstsvar i liste.
- [x] Lage enkel wordcloud for fritekstsvar.
- [x] Sørge for at resultater kun er synlige for skjemaeier.

## 8. Eksport

- [x] Lage CSV-eksport av resultater.
- [x] Lage enkel PDF-rapport.
- [x] Sikre at anonym eksport ikke inneholder identifiserende respondentfelt.
- [ ] Teste eksport med norske tegn.

## 9. Deploy og drift

- [x] Sette opp GitHub Pages-build for Vite.
- [x] Konfigurere Vite base path for repo-hosting.
- [x] Bruke hash-ruting for stabile offentlige lenker.
- [x] Legge Supabase URL og publishable/anon key inn som GitHub repository variables/secrets.
- [ ] Justere GitHub Pages/Vite-build for custom domain `svario.no` når DNS er verifisert.
- [x] Dokumentere lokal kjøring og deploy i README.

## 10. Testing og kvalitet

- [x] Kjøre `npm run build`.
- [ ] Lage målrettede tester for validering og skjemalogikk.
- [ ] Teste RLS/policies for eier, ikke-eier og anonym bruker.
- [ ] Teste adminflyt manuelt på desktop web.
- [ ] Teste respondentflyt manuelt på mobil web.
- [x] Teste web build før deploy.

## Ikke i MVP

- [ ] Team/organisasjoner.
- [ ] Respondent-login.
- [ ] Invitasjonskoder.
- [ ] Live-modus under møter/foredrag.
- [ ] Autosave av delvise besvarelser.
- [ ] Offentlige resultater for respondenter.
