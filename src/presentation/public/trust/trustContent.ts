import type { LucideIcon } from 'lucide-react';
import {
  Database,
  FileCheck2,
  FileText,
  ListChecks,
  LockKeyhole,
  Scale,
  ShieldCheck,
} from 'lucide-react';

export type TrustDocumentSlug =
  | 'personvern'
  | 'vilkar'
  | 'databehandleravtale'
  | 'underdatabehandlere'
  | 'sikkerhetstiltak';

type TrustSection = {
  title: string;
  paragraphs?: string[];
  bullets?: string[];
  table?: {
    columns: string[];
    rows: string[][];
  };
};

export type TrustDocument = {
  slug: TrustDocumentSlug;
  title: string;
  shortTitle: string;
  eyebrow: string;
  updated: string;
  status: string;
  summary: string;
  icon: LucideIcon;
  sections: TrustSection[];
};

export const trustDocuments: TrustDocument[] = [
  {
    slug: 'personvern',
    title: 'Personvernerklæring for Svario',
    shortTitle: 'Personvern',
    eyebrow: 'Personvern',
    updated: '21. juni 2026',
    status: 'Arbeidsutkast for juridisk gjennomgang',
    summary:
      'Hvordan Svario behandler kontoopplysninger, spørreskjemadata, kontaktopplysninger og tekniske driftsdata.',
    icon: FileText,
    sections: [
      {
        title: 'Hvem er ansvarlig?',
        paragraphs: [
          'Svario leveres av Kapsdevelopment AS, org.nr. 937 284 624.',
          'For spørreskjemaer som en kunde oppretter, sender ut eller administrerer i Svario, er kunden/skjemaeieren behandlingsansvarlig for den konkrete innsamlingen.',
          'Kunden bestemmer formål, spørsmål, respondentgruppe, rettslig grunnlag, eventuell identifisering, informasjon til respondentene og hvor lenge svarene skal lagres. Svario er databehandler for besvarelsene og behandler dem innenfor kundens produktvalg og tjenestens dokumenterte rammer.',
          'For Svario-kontoer, drift, sikkerhet, avtaleoppfølging og administrasjon er Kapsdevelopment AS behandlingsansvarlig.',
        ],
      },
      {
        title: 'Hva kan Svario behandle?',
        paragraphs: [
          'Svario kan behandle informasjon som opprettes, sendes inn eller administreres i tjenesten, samt tekniske opplysninger som er nødvendige for å levere, sikre og drifte løsningen.',
          'Dette kan for eksempel omfatte konto- og arbeidsflateopplysninger, spørreskjemaer, spørsmål, svar, fritekst, respondentidentitet dersom skjemaeier velger identifiserte svar, personvernvalg og henvendelser via kontaktskjema.',
        ],
      },
      {
        title: 'Hva brukes opplysningene til?',
        bullets: [
          'Å levere spørreskjematjenesten.',
          'Å autentisere og administrere brukere.',
          'Å lagre og vise resultater til autoriserte brukere.',
          'Å eksportere rapporter etter brukerens valg.',
          'Å gjennomføre automatisk sletting etter valgt lagringstid.',
          'Å dokumentere relevante personvernhendelser.',
          'Å svare på henvendelser og sikre, drifte og feilrette tjenesten.',
        ],
        paragraphs: [
          'Svario bruker ikke spørreskjemabesvarelser til annonsering, profilering, salg av data eller trening av modeller.',
        ],
      },
      {
        title: 'IP-adresser og tekniske logger',
        paragraphs: [
          'Svario lagrer ikke IP-adresse på spørreskjemabesvarelser i appens besvarelsestabeller.',
          'Tekniske logger hos hosting-, database- eller sikkerhetsleverandører kan likevel forekomme for drift, sikkerhet og feilretting. Slike logger skal ikke brukes til analyse av respondenter, markedsføring eller salg av data.',
        ],
      },
      {
        title: 'Rettslig grunnlag og lagringstid',
        paragraphs: [
          'For kundens spørreskjemaer velger, vurderer og dokumenterer kunden rettslig grunnlag. Svario legger til rette for at kunden kan beskrive formål, rettslig grunnlag, kontaktpunkt og lagringstid for hvert skjema.',
          'Besvarelser lagres etter lagringstiden kunden velger for skjemaet. Kunden er ansvarlig for at valgt lagringstid ikke er lengre enn nødvendig for formålet. Når lagringstiden utløper, slettes svar automatisk når retention-jobben kjører.',
          'Dersom skjemaeier forlenger lagringstiden for et skjema med eksisterende svar, må skjemaeier oppgi en begrunnelse. Forlengelsen logges.',
        ],
      },
      {
        title: 'Rettigheter, kontakt og klage',
        paragraphs: [
          'Registrerte kan ha rett til innsyn, retting, sletting, begrensning, dataportabilitet og protest etter GDPR.',
          'For svar i et kundestyrt skjema skal henvendelser normalt rettes til skjemaeieren, fordi skjemaeieren bestemmer formål, innhold, rettslig grunnlag og lagringstid. Svario kan bistå skjemaeieren som databehandler ved behov.',
          'Hvis henvendelsen gjelder Svario-konto, drift, sikkerhet eller Kapsdevelopment AS sin egen behandling, kan kontaktskjemaet på kapsdevelopment.com brukes.',
          'Du kan også klage til Datatilsynet dersom du mener personopplysninger behandles i strid med regelverket.',
        ],
      },
    ],
  },
  {
    slug: 'vilkar',
    title: 'Tjenestevilkår for Svario',
    shortTitle: 'Tjenestevilkår',
    eyebrow: 'Vilkår',
    updated: '21. juni 2026',
    status: 'Arbeidsutkast for juridisk gjennomgang',
    summary:
      'Regler for bruk av Svario, kundens ansvar, tillatt bruk, tilgjengelighet, opphør og ansvarsbegrensning.',
    icon: Scale,
    sections: [
      {
        title: 'Hva gjelder vilkårene?',
        paragraphs: [
          'Disse vilkårene gjelder kundens tilgang til og bruk av Svario, inkludert adminflaten, respondentflater, offentlige nettsider, Trust Center og support- eller kontakttjenester.',
          'Svario leveres av Kapsdevelopment AS, org.nr. 937 284 624.',
          'Ved å bruke Svario aksepterer kunden disse vilkårene. Dersom kunden ikke aksepterer vilkårene, skal tjenesten ikke brukes.',
        ],
      },
      {
        title: 'Hvem kan bruke Svario?',
        paragraphs: [
          'Svario er laget for virksomheter, prosjekter, arrangører og andre som trenger en enkel spørreskjematjeneste.',
          'Den som oppretter en konto eller arbeidsflate på vegne av en organisasjon, må ha rett til å gjøre dette på vegne av organisasjonen.',
          'Respondenter trenger normalt ikke Svario-konto for å svare på publiserte spørreskjemaer.',
        ],
      },
      {
        title: 'Konto og tilgang',
        bullets: [
          'Kunden skal oppgi riktige konto- og profilopplysninger.',
          'Kunden er ansvarlig for å holde innloggingsmetoder og kontoer sikre.',
          'Kunden skal ikke bruke andres konto uten tillatelse.',
          'Kunden bør varsle Svario dersom det oppdages uautorisert tilgang eller mistanke om misbruk.',
        ],
      },
      {
        title: 'Kundens innhold og ansvar',
        paragraphs: [
          'Kunden er ansvarlig for spørreskjemaer, spørsmål, fritekstfelt, invitasjoner, respondentlister, besvarelser som kunden laster opp eller ber om, og resultatbruk.',
          'Kunden må ha nødvendig rettslig grunnlag, tillatelse, formålsvurdering, lagringsvurdering og respondentinformasjon på plass før personopplysninger samles inn gjennom Svario.',
          'Standardvalg, hjelpetekster og forslag i Svario er praktisk støtte. De er ikke juridisk rådgivning, og de flytter ikke ansvaret for kundens konkrete vurderinger fra kunden til Svario.',
          'Svario kan behandle kundens innhold i den grad det er nødvendig for å levere tjenesten, vise resultater, eksportere data, håndtere tilgang, sikre tjenesten og gjennomføre sletting.',
        ],
      },
      {
        title: 'Forbudt eller risikofylt bruk',
        bullets: [
          'Bruke Svario til ulovlige formål eller innhold som krenker andres rettigheter.',
          'Samle inn særlige kategorier personopplysninger eller data om barn uten særskilt vurdering, nødvendig rettslig grunnlag og eventuell avtale med Svario.',
          'Samle inn flere personopplysninger eller lagre dem lenger enn det kunden selv kan forsvare som nødvendig for formålet.',
          'Forsøke uautorisert tilgang til kontoer, data eller systemer.',
          'Omgå sikkerhetsmekanismer, misbruke offentlige respondentlenker eller skape urimelig belastning på tjenesten.',
          'Bruke Svario til spam, villedende innsamling, trakassering eller annen skadelig aktivitet.',
        ],
      },
      {
        title: 'Resultater, eksport og beslutninger',
        paragraphs: [
          'Svario gir verktøy for å samle inn, vise, visualisere og eksportere svar. Kunden er ansvarlig for tolkning av resultater og beslutninger som tas basert på svarene.',
          'Svario garanterer ikke at data er fullstendige, representative eller egnet som eneste beslutningsgrunnlag.',
        ],
      },
      {
        title: 'Tilgjengelighet og endringer',
        paragraphs: [
          'Svario tilbys som en praktisk digital tjeneste. Kapsdevelopment AS arbeider for stabil drift, men garanterer ikke uavbrutt tilgjengelighet, permanent lagring eller feilfri funksjon.',
          'Kapsdevelopment AS kan endre, begrense, suspendere eller avvikle hele eller deler av tjenesten når det er nødvendig av tekniske, sikkerhetsmessige, juridiske, økonomiske eller driftsmessige grunner.',
        ],
      },
      {
        title: 'Sletting, opphør og misbruk',
        paragraphs: [
          'Kunden kan slette skjemaer og konto der funksjonaliteten finnes i Svario. Automatisk sletting etter valgt lagringstid fortsetter uavhengig av om kunden har eksportert data.',
          'Svario kan begrense eller avslutte tilgang dersom tjenesten misbrukes, vilkårene brytes, sikkerheten settes i fare, eller lovpålagte krav gjør det nødvendig.',
          'Ved opphør kan data slettes eller anonymiseres, med mindre videre lagring er nødvendig for lov, sikkerhet, fakturering, revisjon eller tvisteløsning.',
        ],
      },
      {
        title: 'Tredjepartsleverandører',
        paragraphs: [
          'Svario er avhengig av leverandører for database, autentisering, hosting, deploy, drift og eventuelle kontaktskjemaer.',
          'Disse leverandørene kan ha egne vilkår, sikkerhetstiltak og personverndokumentasjon. Relevante underdatabehandlere beskrives i Trust Center.',
        ],
      },
      {
        title: 'Betaling og fremtidige betalte funksjoner',
        paragraphs: [
          'Dersom Svario senere tilbyr betalte funksjoner, kan egne pris-, faktura-, betalings- og refusjonsvilkår gjelde i tillegg til disse vilkårene.',
          'Svario skal ikke finansieres gjennom salg av spørreskjemabesvarelser, skjult markedsføring eller kommersiell datadeling.',
        ],
      },
      {
        title: 'Ansvarsbegrensning',
        paragraphs: [
          'Så langt loven tillater det, er Kapsdevelopment AS ikke ansvarlig for kundens spørreskjemaer, kundens rettslige grunnlag, respondentinnhold, feil bruk av eksporterte data, beslutninger basert på resultater eller indirekte tap.',
          'Denne ansvarsbegrensningen påvirker ikke rettigheter som ikke kan fraskrives etter ufravikelig lov.',
        ],
      },
      {
        title: 'Endringer og kontakt',
        paragraphs: [
          'Kapsdevelopment AS kan oppdatere disse vilkårene når tjenesten, leverandører, sikkerhetsrutiner eller lovkrav endres. Nyeste versjon skal være tilgjengelig i Trust Center.',
          'Spørsmål om vilkårene kan sendes via kontaktskjemaet på kapsdevelopment.com.',
        ],
      },
    ],
  },
  {
    slug: 'databehandleravtale',
    title: 'Databehandleravtale for Svario',
    shortTitle: 'Databehandleravtale',
    eyebrow: 'DPA',
    updated: '21. juni 2026',
    status: 'Arbeidsutkast for juridisk gjennomgang',
    summary:
      'Rollefordeling, produktvalg, sikkerhetstiltak, underdatabehandlere, avvik, revisjon og sletting.',
    icon: FileCheck2,
    sections: [
      {
        title: 'Parter',
        paragraphs: [
          'Behandlingsansvarlig er kunden som oppretter, sender ut og administrerer spørreskjema i Svario.',
          'Databehandler er Kapsdevelopment AS, org.nr. 937 284 624, som leverer Svario.',
          'Kontaktpunkt for personvern og sikkerhet er kontaktskjemaet på kapsdevelopment.com.',
        ],
      },
      {
        title: 'Rollefordeling',
        paragraphs: [
          'Kunden er behandlingsansvarlig for formål, spørsmål, respondentgruppe, rettslig grunnlag, lagringstid, informasjon til respondenter og vurderingen av om det er nødvendig å samle inn eller fortsette å lagre svar.',
          'Svario er databehandler for spørreskjemaer, besvarelser og respondentopplysninger som behandles på kundens vegne. Svario stiller teknisk løsning, lagring, tilgangsstyring, eksport og sletting til rådighet, men bestemmer ikke kundens konkrete formål eller lagringsbehov.',
          'Kapsdevelopment AS er selvstendig behandlingsansvarlig for egne konto-, sikkerhets-, drifts-, avtale- og kontaktopplysninger der Kapsdevelopment AS selv bestemmer formålet.',
        ],
      },
      {
        title: 'Produktvalg og tjenestens rammer',
        paragraphs: [
          'Svario behandler personopplysninger for å levere spørreskjematjenesten innenfor funksjonene, innstillingene og vilkårene som til enhver tid tilbys i Svario.',
          'Kunden styrer den konkrete behandlingen gjennom produktvalg i Svario, for eksempel om skjemaet er anonymt eller identifisert, hvilken respondenttekst som vises, hvilket rettslig grunnlag kunden oppgir og hvilken lagringstid som velges.',
          'Slike produktvalg gir ikke kunden rett til å kreve særskilt utvikling, manuell behandling, spesialrutiner eller andre avvik fra tjenestens dokumenterte funksjonalitet, med mindre dette er avtalt skriftlig med Kapsdevelopment AS.',
          'Svario kan avvise forespørsler eller valg som ligger utenfor tjenesten, er teknisk eller driftsmessig uforsvarlige, kan svekke sikkerheten eller er i strid med lov, vilkår eller personvernregelverk.',
          'Svario tilstreber å behandle data i tråd med kundens valgte innstillinger, men tjenesten leveres med de tilgjengelighets-, endrings- og ansvarsbegrensningene som følger av vilkårene.',
        ],
      },
      {
        title: 'Forslag og juridisk vurdering',
        paragraphs: [
          'Svario kan vise standardvalg, forslag og hjelpetekster for å gjøre produktet enklere å bruke. Slike forslag er ikke juridisk rådgivning og er ikke en vurdering av om kundens konkrete innsamling, rettslige grunnlag eller lagringstid er lovlig eller nødvendig.',
        ],
      },
      {
        title: 'Behandlingens art og formål',
        bullets: [
          'Opprettelse og administrasjon av spørreskjemaer.',
          'Innsamling, lagring, visning, filtrering og eksport av besvarelser.',
          'Tilgangsstyring for kunder og arbeidsflater.',
          'Automatisk sletting etter valgt lagringstid.',
          'Logging av relevante personvernhendelser.',
          'Drift, sikkerhet, feilretting og misbruksforebygging.',
        ],
      },
      {
        title: 'Svario sine plikter',
        bullets: [
          'Behandle personopplysninger konfidensielt.',
          'Sikre at personer med tilgang er underlagt taushetsplikt eller tilsvarende konfidensialitetsplikt.',
          'Iverksette egnede tekniske og organisatoriske tiltak.',
          'Bistå kunden med registrertrettigheter, avvik og relevante GDPR-vurderinger så langt det er rimelig.',
          'Slette eller tilbakelevere personopplysninger ved avtalens opphør, med mindre lov krever videre lagring.',
        ],
      },
      {
        title: 'Kundens plikter',
        bullets: [
          'Ha rettslig grunnlag for personopplysningene som samles inn.',
          'Gi respondentene forståelig informasjon om formål, ansvarlig virksomhet, kontaktpunkt, rettslig grunnlag og lagringstid.',
          'Velge en lagringstid som ikke er lengre enn nødvendig.',
          'Kontrollere at eventuelle forslag, standardtekster og produktvalg passer med kundens faktiske bruk før skjemaet publiseres.',
          'Ikke samle inn flere personopplysninger enn nødvendig.',
          'Ikke bruke Svario til særlige kategorier personopplysninger eller høyrisikobehandling uten særskilt vurdering og avtale.',
          'Håndtere henvendelser fra respondenter og vurdere eventuell varsling til respondenter eller Datatilsynet når kunden er behandlingsansvarlig.',
        ],
      },
      {
        title: 'Avvik, revisjon og sletting',
        paragraphs: [
          'Svario skal varsle kunden uten ugrunnet opphold dersom Svario blir kjent med et brudd på personopplysningssikkerheten som gjelder kundens personopplysninger.',
          'Svario skal gi kunden informasjon som er nødvendig for å dokumentere etterlevelse. Revisjon eller inspeksjon må avtales skriftlig på forhånd og gjennomføres slik at sikkerhet, konfidensialitet, driftsstabilitet og andre kunders data ikke settes i fare.',
          'Ved opphør av kundeforholdet skal Svario slette eller tilbakelevere personopplysninger som behandles på kundens vegne, med mindre lov krever videre lagring.',
        ],
      },
    ],
  },
  {
    slug: 'underdatabehandlere',
    title: 'Underdatabehandlere',
    shortTitle: 'Underdatabehandlere',
    eyebrow: 'Leverandører',
    updated: '21. juni 2026',
    status: 'Arbeidsutkast, regioner og avtaler må bekreftes før produksjon',
    summary:
      'Leverandører som kan behandle personopplysninger når Svario leveres til kunder.',
    icon: Database,
    sections: [
      {
        title: 'Oversikt',
        table: {
          columns: ['Leverandør', 'Formål', 'Datatyper', 'Region', 'Status'],
          rows: [
            [
              'Supabase',
              'Database, autentisering, Postgres API/RPC, edge functions og backend-drift.',
              'Kontoopplysninger, profiler, arbeidsflater, skjemaer, besvarelser, respondentopplysninger ved identifiserte skjemaer og tekniske driftsdata.',
              'Primary region er Supabase North EU, Stockholm. Backup- og supportimplikasjoner må bekreftes mot valgt Supabase-plan.',
              'Obligatorisk.',
            ],
            [
              'GitHub Pages',
              'Hosting av statiske frontend-filer for Svario.',
              'Normalt ikke spørreskjemabesvarelser. Tekniske webserverlogger kan forekomme hos GitHub.',
              'Må bekreftes.',
              'Obligatorisk dersom GitHub Pages brukes i produksjon.',
            ],
            [
              'GitHub Actions',
              'Bygg og deploy av frontend til GitHub Pages.',
              'Kildekode, build-artifakter og miljøvariabler som er nødvendige for deploy. Skal ikke inneholde service-role keys eller produksjonshemmeligheter.',
              'Må bekreftes.',
              'Obligatorisk dersom GitHub Actions brukes for deploy.',
            ],
          ],
        },
      },
      {
        title: 'Endringsrutine',
        bullets: [
          'Vurdere formål, datatyper, registrerte, region og tilgangsnivå.',
          'Kontrollere databehandleravtale eller tilsvarende vilkår.',
          'Vurdere sikkerhetstiltak og relevante sertifiseringer eller revisjonsrapporter.',
          'Vurdere overføringsgrunnlag ved behandling utenfor EU/EOS.',
          'Oppdatere listen før eller samtidig med endringen.',
          'Informere kunder ved vesentlige endringer.',
          'Gi kunden rimelig mulighet til å protestere dersom endringen har saklig betydning for behandlingen.',
        ],
      },
      {
        title: 'Prinsipper',
        paragraphs: [
          'Svario skal bruke færrest mulig underdatabehandlere for spørreskjemadata.',
          'Leverandører skal bare brukes når de er nødvendige for drift, sikkerhet, hosting, autentisering, database, deploy eller tilsvarende tjenesteleveranser.',
          'Svario skal ikke bruke underdatabehandlere til annonsering, kommersiell datadeling eller trening av modeller på kunders spørreskjemabesvarelser.',
        ],
      },
    ],
  },
  {
    slug: 'sikkerhetstiltak',
    title: 'Tekniske og organisatoriske tiltak',
    shortTitle: 'Sikkerhetstiltak',
    eyebrow: 'TOMs',
    updated: '21. juni 2026',
    status: 'Levende dokumentasjon, oppdateres ved vesentlige endringer',
    summary:
      'Praktisk sikkerhets- og personvernvedlegg for Svario, inkludert tilgang, RLS, kryptering, retention og hendelseshåndtering.',
    icon: ShieldCheck,
    sections: [
      {
        title: 'Status',
        paragraphs: [
          'Svario er ikke ISO 27001-sertifisert. Tiltakene beskriver Svario sitt eget kontrollnivå og relevante leverandørkontroller der Svario bruker underdatabehandlere.',
          'Kunden oppretter spørreskjema, velger om skjemaet er anonymt eller identifisert, bestemmer formål og lagringstid, og administrerer svarene. Svario har ansvar for den tekniske løsningen, teknisk lagring, tilgangsstyring, drift og sletting etter kundens produktvalg.',
        ],
      },
      {
        title: 'Dataminimering og personvern som standard',
        bullets: [
          'Anonyme skjemaer skal ikke lagre respondentnavn, e-postadresse eller Svario-konto-id.',
          'Identifiserte skjemaer krever personverninnstillinger før publisering.',
          'Skjemaeier må oppgi formål, kontaktpunkt, rettslig grunnlag og lagringstid når personopplysninger forventes.',
          'Skjemaeier er ansvarlig for å vurdere om personopplysninger faktisk er nødvendige for formålet.',
          'Svario lagrer ikke IP-adresse på spørreskjemabesvarelser i appens besvarelsestabeller.',
          'Respondenter får kort personverninformasjon før innsending.',
          'Samtykke må aktivt bekreftes når skjemaeier velger samtykke som rettslig grunnlag.',
        ],
      },
      {
        title: 'Tilgangsstyring og dataseparasjon',
        bullets: [
          'Adminbrukere autentiseres før de får tilgang til arbeidsflater og skjemaer.',
          'Svario skiller Supabase Auth-bruker fra Svario sin domenekonto.',
          'App-tabeller beskyttes med Row Level Security.',
          'Eierkontroller ligger i databasen og skal ikke bare håndheves i brukergrensesnittet.',
          'Service-role keys og databasepassord skal aldri eksponeres i frontend eller commits.',
        ],
      },
      {
        title: 'Kryptering og kommunikasjon',
        bullets: [
          'Trafikk mellom nettleser og Supabase går over kryptert transport.',
          'Supabase oppgir kryptering av kundedata ved lagring på plattformnivå.',
          'Hemmeligheter lagres i `.env.local`, GitHub secrets eller tilsvarende sikre miljøer.',
          'Browser-visible Supabase URL og publishable key behandles som publiserbare verdier, ikke hemmeligheter.',
        ],
        paragraphs: [
          'Svario tilbyr ikke ende-til-ende-kryptering av hvert enkelt svar, fordi tjenesten må kunne beregne resultater, visualiseringer og eksport for autoriserte brukere.',
        ],
      },
      {
        title: 'Retention-plan',
        paragraphs: [
          'Retention i Svario betyr hvordan svar får en beregnet lagringsfrist, hvordan fristen håndheves, og hvordan endringer dokumenteres. Planen gjelder først og fremst spørreskjemasvar der skjemaeier har valgt at personopplysninger behandles.',
          'Skjemaeier velger lagringstid og er ansvarlig for at perioden er nødvendig for formålet. Svario håndhever valgt lagringstid teknisk gjennom produktet.',
        ],
        bullets: [
          'Når et svar sendes inn, lagres et snapshot av personverninformasjonen som gjaldt på innsendelsestidspunktet.',
          'Svar som omfattes av retention får `retention_due_at` basert på innsendelsestidspunkt og valgt lagringstid.',
          'En daglig databasejobb behandler forfalte svar i kontrollerte batcher.',
          'Standardhandlingen er sletting av hele svaret og tilhørende svarrader.',
          'Dersom anonymisering brukes som retention-handling, fjernes respondentidentitet, konto-id og metadata før svaret beholdes som anonymt datagrunnlag.',
          'Retention-jobben bruker låsing for å unngå at samme svar behandles parallelt.',
          'Sletting, anonymisering og forlengelse av lagringstid logges som personvernhendelser.',
          'Skjemaeier må oppgi begrunnelse dersom lagringstiden forlenges for skjemaer med eksisterende svar.',
          'Skjemaeier varsles i appen når svar nærmer seg automatisk sletting.',
        ],
      },
      {
        title: 'Retention-begrensninger og kontroll',
        bullets: [
          'Automatisk sletting er ikke det samme som umiddelbar sletting fra alle underliggende backupkopier hos plattformleverandøren.',
          'Backup- og restore-forventninger følger valgt Supabase-plan og må dokumenteres for kunder som bruker Svario med reelle personopplysninger.',
          'Ved restore må Svario vurdere om personopplysninger som tidligere er slettet eller anonymisert kan reintroduseres, og eventuelt kjøre retention på nytt før data gjøres tilgjengelig.',
          'Retention-konfigurasjon, personverntekster og underdatabehandlerliste gjennomgås ved vesentlige produkt- eller leverandørendringer.',
          'Kunden kan fortsatt slette enkeltskjemaer eller hele kontoen før ordinær retention-frist.',
        ],
      },
      {
        title: 'Hendelseshåndtering',
        paragraphs: [
          'Svario skal håndtere sikkerhets- og personvernhendelser praktisk, raskt og dokumenterbart. Rutinen gjelder blant annet mistanke om feilsendt tilgang, eksponerte nøkler, RLS-feil, uautorisert innsyn, utilsiktet sletting, manglende retention eller mistenkelig aktivitet.',
          'Kunden er normalt behandlingsansvarlig for spørreskjemasvarene. Svario skal derfor gi kunden nødvendig informasjon for å vurdere egne plikter overfor respondenter og tilsynsmyndighet.',
        ],
        bullets: [
          'Oppdage og registrere hendelsen med tidspunkt, kilde, berørte systemer og foreløpig alvorlighetsgrad.',
          'Begrense skade, for eksempel ved å deaktivere tilgang, stoppe berørt funksjon, rotere nøkler eller tilbakekalle deploy.',
          'Undersøke hvilke data, brukere, arbeidsflater, skjemaer og respondenter som kan være berørt.',
          'Vurdere om hendelsen gjelder konfidensialitet, integritet, tilgjengelighet, sletting eller retention.',
          'Varsle berørte kunder uten ugrunnet opphold dersom kundedata kan være berørt.',
          'Gi kunden nok fakta til å vurdere eventuell varsling til respondenter eller Datatilsynet.',
          'Dokumentere tiltak, tidslinje, beslutninger, kommunikasjon og læringspunkter.',
          'Gjennomføre korrigerende tiltak før hendelsen lukkes, for eksempel policy-endring, migrering, test, dependency-oppdatering eller tilgangsrydding.',
        ],
      },
      {
        title: 'Hendelser som krever ekstra oppmerksomhet',
        bullets: [
          'Eksponert service-role key, databasepassord eller annen produksjonshemmelighet.',
          'Feil i RLS, RPC eller arbeidsflater som kan gi innsyn på tvers av kontoer, teams eller organisasjoner.',
          'Offentlig respondentlenke som viser mer data enn den skal.',
          'Eksport eller PDF som inneholder identifiserende data fra et anonymt skjema.',
          'Retention-jobb som ikke kjører, sletter feil data eller ikke sletter data som skulle vært slettet.',
          'Restore fra backup som kan gjeninnføre data som tidligere er slettet eller anonymisert.',
          'Mistanke om misbruk av admin-konto, invitasjonslenker eller GitHub/Supabase-tilgang.',
        ],
      },
      {
        title: 'Kontinuerlig oppfølging',
        bullets: [
          'Kontaktpunkt for personvern- og sikkerhetshenvendelser holdes oppdatert.',
          'Leverandør-, region- og databehandlerinformasjon gjennomgås ved endringer.',
          'Backup-, restore- og retention-forventninger dokumenteres for kunder.',
          'Admin-innlogging og tilgangskrav vurderes etter faktisk risikobilde.',
          'Tilgangsstyring og respondentflyter testes som del av releasearbeidet.',
          'Rutiner for innsyn, sletting, dataportabilitet og avvik holdes ved like.',
          'Juridiske tekster gjennomgås før de brukes som bindende avtalegrunnlag.',
        ],
      },
    ],
  },
];

export const trustReferences = [
  {
    label: 'Datatilsynet: behandlingsansvarlig og databehandler',
    href: 'https://www.datatilsynet.no/rettigheter-og-plikter/virksomhetenes-plikter/behandlingsansvarlig-og-databehandler/',
  },
  {
    label: 'Datatilsynet: databehandleravtale',
    href: 'https://www.datatilsynet.no/rettigheter-og-plikter/virksomhetenes-plikter/hvordan-lage-en-databehandleravtale/hva-ma-en-databehandleravtale-inneholde/',
  },
  {
    label: 'Kapsdevelopment',
    href: 'https://kapsdevelopment.com/',
  },
];

export const trustHighlights = [
  {
    icon: FileCheck2,
    title: 'Skjemaeier har behandlingsansvaret',
    text: 'Kunden bestemmer formål, innhold, rettslig grunnlag og lagringstid. Svario leverer teknisk løsning og behandler svar etter kundens valg.',
  },
  {
    icon: LockKeyhole,
    title: 'Dataminimering',
    text: 'Svario lagrer ikke IP-adresse på besvarelser i appens besvarelsestabeller og skiller anonyme og identifiserte skjemaer tydelig.',
  },
  {
    icon: ListChecks,
    title: 'Retention i produktet',
    text: 'Skjemaeier velger lagringstid, får varsel når svar nærmer seg sletting, og må begrunne forlengelse av lagringstid.',
  },
  {
    icon: ShieldCheck,
    title: 'RLS og domenekontoer',
    text: 'Tilgang kontrolleres i Postgres med Row Level Security og Svario sitt eget domenekonto-eierskap.',
  },
];

export function getTrustDocument(slug: string | undefined) {
  return trustDocuments.find((document) => document.slug === slug);
}
