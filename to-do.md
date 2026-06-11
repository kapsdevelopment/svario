# Svario To-do

Arbeidsliste for MVP: Flutter-app for iOS, Android og web med Supabase Auth, Postgres/RLS og GitHub Pages-hostet web.

## 1. Repo og prosjektoppsett

- [x] Opprette Supabase-prosjekt i North EU (Stockholm).
- [x] Legge lokale Supabase-hemmeligheter i `.env.local`.
- [x] Ignorere lokale env-filer og genererte filer i `.gitignore`.
- [x] Opprette `.env.example` med tomme, trygge variabelnavn.
- [x] Scaffold Flutter-prosjekt i repoet.
- [x] Legge til basispakker: Supabase, routing, state management, charts, CSV og PDF.
- [ ] Sette opp grunnleggende mappe-/modulstruktur.

## 2. Supabase og database

- [ ] Koble Supabase CLI til prosjektet.
- [ ] Lage første database-migration.
- [ ] Modellere tabeller for profiler, skjemaer, seksjoner, spørsmål, alternativer, besvarelser og svar.
- [ ] Legge inn enum/statusfelt for `draft`, `published` og `closed`.
- [ ] Legge inn støtte for valgfri `starts_at` og `ends_at`.
- [ ] Legge inn støtte for anonyme og identifiserte besvarelser.
- [ ] Aktivere RLS på alle app-tabeller.
- [ ] Lage policies for innlogget admin/eier.
- [ ] Lage trygg offentlig lesing/innsending via RPC eller tilsvarende kontrollert API.

## 3. Flutter app-skall

- [ ] Sette opp Supabase-initiering fra miljøverdier.
- [ ] Sette opp routing for admin og offentlig respondentflyt.
- [ ] Lage auth-flyt med e-post/passord for admin.
- [ ] Lage felles layout for desktop, tablet og mobil.
- [ ] Lage nordisk, profesjonelt tema med dempede naturfarger.
- [ ] Lage navigasjon for dashboard, skjemaer, resultater og profil.

## 4. Admin og skjemabygger

- [ ] Lage dashboard med nøkkeltall og siste aktivitet.
- [ ] Lage oversikt over aktive, historiske og utkast-skjemaer.
- [ ] Lage opprettelse av nytt spørreskjema.
- [ ] Støtte seksjoner i skjema.
- [ ] Støtte spørsmålstypene flervalg, fritekst og Likert 1-5.
- [ ] Støtte enkeltvalg og flervalg per flervalgsspørsmål.
- [ ] Støtte anonymisert eller identifisert besvarelse per skjema.
- [ ] Støtte valgfri tidsavgrensning.
- [ ] Lage publiseringsflyt og delbar lenke.
- [ ] Låse strukturfelter etter publisering med innsendte svar.

## 5. Respondentflyt

- [ ] Lage offentlig besvarelsesside via delbar lenke.
- [ ] Vise skjema-seksjoner og spørsmål intuitivt på mobil og desktop.
- [ ] Validere påkrevde spørsmål før innsending.
- [ ] Kreve navn eller e-post for identifiserte skjemaer.
- [ ] Ikke lagre respondentidentitet for anonyme skjemaer.
- [ ] Håndtere utløpte, ikke-startede, lukkede og ukjente skjemaer.
- [ ] Lagre svar samlet ved innsending.
- [ ] Vise enkel kvittering etter innsending.

## 6. Resultater og visualisering

- [ ] Lage resultatside for innlogget admin.
- [ ] Vise totaler, svarvolum og status.
- [ ] Vise flervalg som stolpe- og/eller kakediagram.
- [ ] Vise Likert-fordeling og snitt.
- [ ] Vise fritekstsvar i liste.
- [ ] Lage enkel wordcloud for fritekstsvar.
- [ ] Sørge for at resultater kun er synlige for skjemaeier.

## 7. Eksport

- [ ] Lage CSV-eksport av resultater.
- [ ] Lage enkel PDF-rapport.
- [ ] Sikre at anonym eksport ikke inneholder identifiserende respondentfelt.
- [ ] Teste eksport med norske tegn.

## 8. Deploy og drift

- [ ] Sette opp GitHub Pages-build for Flutter web.
- [ ] Konfigurere base-href for repo-hosting.
- [ ] Bruke hash-ruting for stabile offentlige lenker.
- [ ] Legge Supabase URL og anon key inn som GitHub repository variables/secrets.
- [ ] Dokumentere lokal kjøring og deploy i README.

## 9. Testing og kvalitet

- [ ] Kjøre `flutter analyze`.
- [ ] Lage målrettede tester for validering og skjemalogikk.
- [ ] Teste RLS/policies for eier, ikke-eier og anonym bruker.
- [ ] Teste adminflyt manuelt på desktop web.
- [ ] Teste respondentflyt manuelt på mobil web.
- [ ] Teste web build før deploy.

## Ikke i MVP

- [ ] Team/organisasjoner.
- [ ] Respondent-login.
- [ ] Invitasjonskoder.
- [ ] Live-modus under møter/foredrag.
- [ ] Autosave av delvise besvarelser.
- [ ] Offentlige resultater for respondenter.
