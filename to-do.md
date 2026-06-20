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
- [x] Modellere arbeidsflater for individuell bruk, teams og organisasjoner.
- [x] Knytte skjemaer til valgfri arbeidsflate med `private` eller `workspace` synlighet.

## 3. Sikkerhet, personvern og tillit

- [x] Lage første offentlige sikkerhetsside for Svario.
- [x] Lage første offentlig landingsside og koble sikkerhetssiden inn som underside.
- [x] Lage offentlig personvern-/databrukside for Svario sitt datalofte.
- [x] Lage en lett `SECURITY.md`/trust-center-plan som forklarer sikkerhetsmodell, datalagring, RLS, tilgangsstyring, backup, logging, hendelseshåndtering og kundens/personvernansvarliges ansvar.
- [ ] Dokumentere Supabase-region, DPA, underleverandører, kryptering i transitt og kryptering av lagrede data før produksjonssetting.
- [ ] Avklare produksjonskrav for admin-auth: vurdere/aktivere MFA for adminer, e-postbekreftelse, secure password change og korrekte production redirect URLs. MFA skal ikke blokkere utviklingsløpet før produksjonssetting.
- [ ] Velge bevisst passordpolicy for adminer. Ikke stramme inn bare for strenghets skyld; vurder reell sikkerhetsgevinst opp mot magic link, MFA ved produksjon, rate limits og session-kontroller.
- [x] Lage passordbytte i profilskjermen for innloggede adminer.
- [ ] Vurdere/implementere Supabase Passkeys (beta) etter at Dashboard-konfig, RP ID/origins og fallback-flyt er avklart.
- [ ] Lage RLS-/tilgangstester for eier, ikke-eier og anonym bruker på identitet, skjema, spørsmål, svar og resultater.
- [ ] Lage RLS-/tilgangstester for workspace-medlem, workspace-admin, workspace-owner og ikke-medlem.
- [ ] Kjøre Supabase advisors/security checks før produksjonssetting og følge opp funn.
- [ ] Lage slette-/eksport-/retention-plan for persondata og anonyme besvarelser.
- [x] Lage "slett min konto" i profilskjermen, inkludert alle spørreskjemaer, svar/resultater og profildata, med ekstra bekreftelsesdialog.
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
- [x] Gjøre grunninfo redigerbar etter at skjemaet er opprettet.
- [x] Støtte seksjoner i skjema.
- [x] Støtte spørsmålstypene flervalg, fritekst og konfigurerbar skala.
- [x] Støtte 1-5 stjerner som rating-variant av skala.
- [x] Støtte Net Promoter Score 0-10 som skala-variant.
- [x] Støtte enkeltvalg og flervalg per flervalgsspørsmål.
- [x] Støtte anonymisert eller identifisert besvarelse per skjema.
- [x] Støtte valgfri tidsavgrensning.
- [x] Lage publiseringsflyt og delbar lenke.
- [ ] Støtte enkel branding per konto eller skjema: logo, primærfarge, aksentfarge og respondenttema som kan matche kundens profil.
- [x] Lage manuell "repeter undersøkelse" / "repeat once"-handling som kopierer seksjoner, spørsmål og innstillinger til en ny lik undersøkelse uten å kopiere svar, og knytter kopien til originalen for senere sammenligning over tid.
- [x] Slette enkeltstående spørreundersøkelser med tydelig bekreftelsesdialog og trygg sletting av tilhørende svar/resultater.
- [x] Låse strukturfelter etter publisering med innsendte svar.

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
- [x] Vise flervalg som stolpediagram.
- [x] Legge til kakediagram som visualiseringsvalg for flervalg og skala.
- [x] Vise skalafordeling og snitt.
- [x] Vise NPS-score med promotører, passive og kritikere.
- [x] Vise fritekstsvar i liste.
- [x] Lage enkel wordcloud for fritekstsvar.
- [x] Sørge for at resultater kun er synlige for skjemaeier.

## 8. Eksport

- [x] Lage CSV-eksport av resultater.
- [x] Lage enkel PDF-rapport.
- [x] Sikre at anonym eksport ikke inneholder identifiserende respondentfelt.
- [x] Teste eksport med norske tegn.
- [x] Merke stjerner/NPS i PDF-rapport og vise NPS-oppsummering.

## 9. Deploy og drift

- [x] Sette opp GitHub Pages-build for Vite.
- [x] Konfigurere Vite base path for repo-hosting.
- [x] Bruke hash-ruting for stabile offentlige lenker.
- [x] Legge Supabase URL og publishable/anon key inn som GitHub repository variables/secrets.
- [x] Justere GitHub Pages/Vite-build for custom domain `svario.no` når DNS er verifisert.
- [x] Dokumentere lokal kjøring og deploy i README.

## 10. Testing og kvalitet

- [x] Kjøre `npm run build`.
- [ ] Lage målrettede tester for validering og skjemalogikk.
- [ ] Teste RLS/policies for eier, ikke-eier og anonym bruker.
- [ ] Teste adminflyt manuelt på desktop web.
- [ ] Teste respondentflyt manuelt på mobil web.
- [x] Teste web build før deploy.

## 11. Design, interaksjon og presentasjon

### Designsystem og visuell polish

- [ ] Revidere bruk av bakgrunnsbilder og bestemme hvilke bilder som skal brukes hvor: plateau i app-skall, landscape i dashboard, pine i login/personvern, fjord i landing/respondent/feilside og coastal i sikkerhetsside.
- [x] Gjøre Svario-brandfeltet i sidebaren til en tydelig lenke/knapp som tar brukeren til hovedsiden.
- [ ] Standardisere admin-kontroller for knapper, lenker, menyer, skjemaelementer, fokus, hover og disabled states.
- [ ] Avklare hvilke popup-/menykomponenter som kan være native, og hvilke som bør byttes til egne designede komponenter.
- [x] Finpusse `datetime-local` med en roligere feltstil som passer Svario-designet bedre.

### Visualiseringer

- [x] Legge til valg for flerfargede stolper i stolpediagrammer, med en dempet nordisk palett.
- [x] Legge til kakediagram som alternativ visning for relevante resultater.
- [x] Lagre per-spørsmål valg av foretrukket visualisering og fargemodus på `survey_questions`.
- [ ] Sikre at visuelle valg også kan brukes konsistent i PDF-rapport.

### Presentasjonsmodus

- [x] Lage presentasjonsmodus for resultater der admin kan bla gjennom ett spørsmål av gangen.
- [x] Flytte presentasjonsmodus til egen admin-beskyttet side uten app-shell/sidebar.
- [x] Vise ordsky for fritekstspørsmål i presentasjonsmodus, uten rå tekstsvar.
- [x] Vise valgt diagramtype for flervalg/skala i presentasjonsmodus.
- [x] Støtte tastaturnavigasjon med piltaster, Home/End og Escape.
- [ ] Støtte tastatur-/klikk-navigasjon, stor visning og rolig møte-/workshop-layout.
- [ ] Vurdere eksport fra presentasjonsmodus til PDF eller bildefiler senere.

### Flere spørsmålstyper og maler

- [ ] Legge til Net Promoter Score (NPS) som egen spørsmålstype eller hurtigvalg basert på 0-10 skala.
- [ ] Vurdere CSAT/tilfredshet og CES/innsats-score som forhåndsoppsett.
- [ ] Vurdere ja/nei-spørsmål som hurtigvalg for flervalg.
- [ ] Vurdere matrise-/gridspørsmål for flere likert-påstander i samme blokk.
- [ ] Vurdere rangering/prioritering som spørsmålstype.
- [ ] Vurdere numerisk svar, dato-svar og e-post/telefon-felt dersom skjemaene trenger mer strukturert innsamling.
- [ ] Lage skjema-/spørsmålsmaler for vanlige bruksområder: medarbeiderpuls, kursfeedback, kundeundersøkelse og workshop-retrospektiv.

## 12. Arbeidsflater, teams og organisasjoner

- [x] Lage databasemodell for `team` og `business` workspaces.
- [x] Lage medlemskap med rollene owner, admin og member.
- [x] Første person som oppretter workspace blir owner.
- [x] Lage invitasjonslenke som owner/admin kan kopiere og sende videre.
- [x] La inviterte brukere bli medlem av samme workspace via lenke.
- [x] La owner/admin fjerne medlemmer fra workspace.
- [x] La owner slette hele workspace med ekstra bekreftelse.
- [x] La nye skjemaer opprettes enten individuelt eller i en workspace.
- [x] Dele workspace-skjemaer med aktive medlemmer i samme workspace.
- [x] Lage BRREG-oppslag for business-organisasjoner basert på organisasjonsnummer.
- [ ] Lage server-side BRREG-verifisering før business-workspaces kan brukes som faktureringsgrunnlag.
- [ ] Lage tydelig faktureringsmodell for business-workspaces, mens individuell bruk og teams kan forbli gratis.
- [ ] Lage mer fullverdig medlemsadministrasjon med navn/e-post i stedet for tekniske konto-id-er.
- [ ] Lage revisjons-/hendelseslogg for kritiske workspace-handlinger.
- [ ] Vurdere overgang fra invitasjonslenke til e-postinvitasjoner når e-postoppsett er klart.

## Ikke i MVP

- [ ] Respondent-login.
- [ ] Avansert branding/white-label: skjule eller tilpasse "Powered by Svario", egne domener per kunde og flere brand-profiler.
- [ ] Live-modus med sanntidsoppdatering under møter/foredrag.
- [ ] Autosave av delvise besvarelser.
- [ ] Offentlige resultater for respondenter.
