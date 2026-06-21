# Tekniske og organisatoriske tiltak for Svario

Status: arbeidsutkast. Må kvalitetssikres mot faktisk produksjonsoppsett før publisering.

Sist oppdatert: 21. juni 2026

Dette dokumentet beskriver planlagte og implementerte sikkerhets- og personverntiltak for Svario. Dokumentet er ment som et praktisk vedlegg til databehandleravtalen og som grunnlag for et senere offentlig Trust Center.

Svario er ikke ISO 27001-sertifisert. Tiltakene under beskriver Svario sitt eget kontrollnivå og relevante leverandørkontroller der Svario bruker underdatabehandlere.

## 1. Tjeneste og behandlingsmodell

Svario er en spørreskjematjeneste levert av Kapsdevelopment AS.

Kunden oppretter spørreskjema, velger om skjemaet er anonymt eller identifisert, bestemmer formål og lagringstid, og administrerer svarene.

Svario har ansvar for den tekniske løsningen, teknisk lagring, tilgangsstyring, drift og sletting etter kundens produktvalg. Kunden har ansvar for den konkrete datainnsamlingen, rettslig grunnlag, respondentinformasjon og vurderingen av hvor lenge svarene skal lagres.

Svario behandler besvarelser på vegne av kunden og skal ikke bruke besvarelser til annonsering, profilering, salg av data eller trening av modeller.

## 2. Dataminimering og personvern som standard

Svario skal samle inn minst mulig data for å levere tjenesten.

Tiltak:

- anonyme skjemaer skal ikke lagre respondentnavn, e-postadresse eller Svario-konto-id,
- identifiserte skjemaer krever personverninnstillinger før publisering,
- skjemaeier må oppgi formål, kontaktpunkt, rettslig grunnlag og lagringstid når personopplysninger forventes,
- skjemaeier er ansvarlig for å vurdere om personopplysninger faktisk er nødvendige for formålet,
- Svario lagrer ikke IP-adresse på spørreskjemabesvarelser i appens besvarelsestabeller,
- respondenter får kort personverninformasjon før innsending,
- samtykke må aktivt bekreftes når skjemaeier velger samtykke som rettslig grunnlag.

## 3. Tilgangsstyring

Svario bruker Supabase Auth for innlogging av administratorer.

Tiltak:

- adminbrukere autentiseres før de får tilgang til arbeidsflater og skjemaer,
- Svario skiller Supabase Auth-bruker fra Svario sin domenekonto,
- eierskap i applikasjonen peker på Svario sin domenekonto, ikke direkte på auth.users.id,
- app-tabeller beskyttes med Row Level Security,
- eierkontroller ligger i databasen og skal ikke bare håndheves i brukergrensesnittet,
- service-role keys og databasepassord skal aldri eksponeres i frontend eller commits.

Før produksjon må krav til MFA, passordpolicy og e-postbekreftelse avklares.

## 4. Kryptering og kommunikasjon

Tiltak:

- trafikk mellom nettleser og Supabase går over kryptert transport,
- Supabase oppgir kryptering av kundedata ved lagring på plattformnivå,
- hemmeligheter lagres i `.env.local`, GitHub secrets eller tilsvarende sikre miljøer,
- browser-visible Supabase URL og publishable key behandles som publiserbare verdier, ikke hemmeligheter.

Svario tilbyr ikke ende-til-ende-kryptering av hvert enkelt svar. Tjenesten må kunne beregne resultater, visualiseringer og eksport for autoriserte brukere.

## 5. Dataseparasjon

Tiltak:

- kundedata separeres logisk gjennom workspace-, eier- og RLS-regler,
- autentiserte brukere skal bare lese og endre data de har rett til,
- offentlige respondentflyter skal ha smale rettigheter og bare åpne for publiserte skjemaer,
- innsending av svar skal skje gjennom kontrollerte databasefunksjoner eller tilsvarende smale API-flater.

RLS-regler skal testes for eier, ikke-eier og anonym respondenttilgang før produksjon.

## 6. Lagringstid og sletting

Tiltak:

- skjemaeier velger lagringstid for persondata i skjemaet og er ansvarlig for at lagringstiden kan begrunnes,
- besvarelser får beregnet slettefrist,
- en daglig retention-jobb sletter svar når fristen er passert, basert på kundens valgte lagringstid,
- skjemaeier varsles i appen når svar nærmer seg automatisk sletting,
- dersom skjemaeier forlenger lagringstid for eksisterende svar, kreves begrunnelse,
- forlengelser logges som personvernhendelser.

Svario skal gjøre det praktisk for kunden å velge kort lagringstid, men kunden er ansvarlig for vurderingen av hvor lenge data må lagres for formålet.

## 7. Logging og sporbarhet

Svario logger relevante personvernhendelser der logging er nødvendig for etterlevelse og kontroll.

Eksempler:

- sletting eller anonymisering etter retention,
- forlenget lagringstid,
- kundens begrunnelse ved forlenget lagringstid.

Loggene skal ikke brukes til profilering av respondenter eller kommersiell databruk.

## 8. Backup, tilgjengelighet og gjenoppretting

Svario bruker administrert infrastruktur hos Supabase.

Før produksjon må følgende bekreftes mot valgt Supabase-plan:

- backupfrekvens,
- hvor lenge backups beholdes,
- region og eventuell behandling utenfor primærregion,
- gjenopprettingstid og praktisk restore-rutine,
- hvem som kan be om restore,
- hvordan restore påvirker slettede personopplysninger.

## 9. Sårbarhetshåndtering og endringskontroll

Tiltak:

- produksjonsbuild kjøres med TypeScript/Vite før deploy,
- avhengigheter holdes oppdatert gjennom ordinær vedlikeholdsrutine,
- Supabase security advisors og relevante databasekontroller skal gjennomgås før produksjon,
- endringer i database og RLS gjøres via migrasjoner,
- service-role keys, databasepassord og produksjonshemmeligheter skal ikke committes.

Før produksjon bør det etableres en enkel rutine for periodisk dependency review, RLS-test og manuell sikkerhetssjekk av sentrale flyter.

## 10. Hendelseshåndtering

Svario skal ha en praktisk rutine for sikkerhets- og personvernhendelser.

Rutinen bør dekke:

- feil tilgang til data,
- eksponerte nøkler eller hemmeligheter,
- feil i RLS eller respondenttilgang,
- utilsiktet sletting eller manglende sletting,
- mistenkelig aktivitet,
- varsling til berørte kunder uten ugrunnet opphold.

Kunden er ansvarlig for eventuell varsling til respondenter eller Datatilsynet når kunden er behandlingsansvarlig, men Svario skal bistå med relevant informasjon.

## 11. Underdatabehandlere

Svario bruker underdatabehandlere for nødvendig drift, database, autentisering, hosting og deploy.

Gjeldende liste finnes i `underdatabehandlere.md`.

Svario skal vurdere underdatabehandlernes formål, datatyper, region, sikkerhetstiltak og overføringsgrunnlag før de tas i bruk for produksjonsdata.

## 12. Organisatoriske tiltak

Tiltak:

- tilgang til produksjonssystemer skal begrenses til personer som trenger det,
- sikkerhets- og personvernhenvendelser skal følges opp via definert kontaktpunkt,
- endringer som påvirker persondata skal vurderes før deploy,
- juridiske dokumenter skal versjoneres og oppdateres ved vesentlige endringer,
- kunden skal få forståelig informasjon om eget ansvar i produktet.

## 13. Åpne punkter før produksjon

Følgende må avklares før dokumentet kan publiseres som endelig:

- endelig kontakt-URL for personvern- og sikkerhetshenvendelser,
- Supabase-plan, backupnivå og restore-rutine,
- endelig GitHub Pages/GitHub Actions-rolle,
- endelig underdatabehandlerliste og regioner,
- krav til MFA for administratorer,
- RLS-testdekning for eier, ikke-eier og anonym respondent,
- rutine for innsyn, sletting, dataportabilitet og avvik,
- juridisk gjennomgang av databehandleravtale og personvernerklæring.
