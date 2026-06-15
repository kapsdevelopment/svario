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
- [ ] Lage trygg offentlig lesing/innsending via RPC eller tilsvarende kontrollert API.

## 3. Sikkerhet, personvern og tillit

- [x] Lage første offentlige sikkerhetsside for Svario.
- [x] Lage første offentlig landingsside og koble sikkerhetssiden inn som underside.
- [ ] Lage en lett `SECURITY.md`/trust-center-plan som forklarer sikkerhetsmodell, datalagring, RLS, tilgangsstyring, backup, logging, hendelseshåndtering og kundens/personvernansvarliges ansvar.
- [ ] Dokumentere Supabase-region, DPA, underleverandører, kryptering i transitt og kryptering av lagrede data før produksjonssetting.
- [ ] Avklare produksjonskrav for admin-auth: vurdere/aktivere MFA for adminer, e-postbekreftelse, secure password change og korrekte production redirect URLs. MFA skal ikke blokkere utviklingsløpet før produksjonssetting.
- [ ] Velge bevisst passordpolicy for adminer. Ikke stramme inn bare for strenghets skyld; vurder reell sikkerhetsgevinst opp mot magic link, MFA ved produksjon, rate limits og session-kontroller.
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
- [ ] Støtte seksjoner i skjema.
- [x] Støtte spørsmålstypene flervalg, fritekst og Likert 1-5.
- [x] Støtte enkeltvalg og flervalg per flervalgsspørsmål.
- [x] Støtte anonymisert eller identifisert besvarelse per skjema.
- [x] Støtte valgfri tidsavgrensning.
- [ ] Lage publiseringsflyt og delbar lenke.
- [ ] Låse strukturfelter etter publisering med innsendte svar.

## 6. Respondentflyt

- [ ] Lage offentlig besvarelsesside via delbar lenke.
- [ ] Vise skjema-seksjoner og spørsmål intuitivt på mobil og desktop.
- [ ] Validere påkrevde spørsmål før innsending.
- [ ] Kreve navn eller e-post for identifiserte skjemaer.
- [ ] Ikke lagre respondentidentitet for anonyme skjemaer.
- [ ] Håndtere utløpte, ikke-startede, lukkede og ukjente skjemaer.
- [ ] Lagre svar samlet ved innsending.
- [ ] Vise enkel kvittering etter innsending.

## 7. Resultater og visualisering

- [ ] Lage resultatside for innlogget admin.
- [ ] Vise totaler, svarvolum og status.
- [ ] Vise flervalg som stolpe- og/eller kakediagram.
- [ ] Vise Likert-fordeling og snitt.
- [ ] Vise fritekstsvar i liste.
- [ ] Lage enkel wordcloud for fritekstsvar.
- [ ] Sørge for at resultater kun er synlige for skjemaeier.

## 8. Eksport

- [ ] Lage CSV-eksport av resultater.
- [ ] Lage enkel PDF-rapport.
- [ ] Sikre at anonym eksport ikke inneholder identifiserende respondentfelt.
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
