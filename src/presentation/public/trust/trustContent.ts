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
    status: 'Levende dokumentasjon, oppdateres ved vesentlige endringer',
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
          'Svario lagrer ikke IP-adresse på spørreskjemabesvarelser.',
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
    status: 'Levende dokumentasjon, oppdateres ved vesentlige endringer',
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
        title: 'Gratis bruk og lavrisiko',
        paragraphs: [
          'Svario er en standardisert gratis spørreskjematjeneste for lavrisiko bruk.',
          'Tjenesten tilbyr innebygde personvernvalg, sletting, eksport og åpen dokumentasjon.',
          'Svario gir ikke juridisk rådgivning, inngår ikke individuelle databehandlerforhandlinger i gratisversjonen, og støtter ikke høyrisiko eller sensitive behandlingsformål uten særskilt avtale.',
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
          'Svario kan senere innføre betalingsplaner, begrense gratisversjonen eller flytte enkelte funksjoner til betalte planer.',
          'Dette kan blant annet gjelde identifiserte skjemaer, organisasjonsarbeidsflater, flere medlemmer, større datamengder, eksport, rapportering, support eller andre avanserte funksjoner.',
          'Eksisterende brukere vil ikke bli belastet automatisk. Betaling krever at kunden aktivt velger eller aksepterer en betalt plan.',
          'Ved vesentlige endringer i gratisversjonen vil Svario så langt det er praktisk mulig gi rimelig forhåndsvarsel. Kunden kan da velge å fortsette på tilgjengelig gratisfunksjonalitet, oppgradere, eksportere egne data der eksport finnes, slette innhold eller avslutte bruken av tjenesten.',
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
    status: 'Levende dokumentasjon, oppdateres ved vesentlige endringer',
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
          'Svario tilstreber å behandle data i tråd med kundens valgte innstillinger, men dette er ikke en garanti for feilfri funksjonalitet, uavbrutt tilgjengelighet, permanent lagring eller at alle produktvalg alltid kan gjennomføres uten tekniske feil.',
          'Tjenesten leveres med de tilgjengelighets-, endrings- og ansvarsbegrensningene som følger av vilkårene, så langt loven tillater det.',
        ],
      },
      {
        title: 'Forslag og juridisk vurdering',
        paragraphs: [
          'Svario kan vise standardvalg, forslag og hjelpetekster for å gjøre produktet enklere å bruke. Slike forslag er ikke juridisk rådgivning og er ikke en vurdering av om kundens konkrete innsamling, rettslige grunnlag eller lagringstid er lovlig eller nødvendig.',
        ],
      },
      {
        title: 'Databehandlingens art og formål',
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
          'Gjøre tilgjengelig relevante standardfunksjoner og informasjon som kunden trenger for å håndtere rettigheter for personer opplysningene gjelder, avvik og egne GDPR-vurderinger, så langt det er mulig ut fra tjenestens art og informasjonen Svario har tilgjengelig.',
          'Varsle kunden uten ugrunnet opphold dersom Svario blir kjent med et personvernbrudd som gjelder kundens personopplysninger.',
          'Slette eller gjøre tilgjengelig eksport av personopplysninger ved opphør der funksjonaliteten finnes i Svario, med mindre lov krever videre lagring.',
          'Gjøre det mulig for kunden å slette skjemaer, svar og konto i produktet der slik funksjonalitet er tilgjengelig.',
        ],
        paragraphs: [
          'Svario gir ikke juridisk rådgivning og vurderer ikke kundens konkrete rettslige grunnlag, varslingsplikt eller personvernkonsekvenser.',
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
          'Kunden kan selv eksportere og slette skjemaer, svar og konto der slik funksjonalitet finnes i Svario. Ved avsluttet bruk forventes kunden normalt å bruke disse selvbetjente funksjonene. Automatisk sletting etter valgt lagringstid fortsetter uavhengig av om kunden har eksportert data.',
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
          columns: ['Leverandør', 'Brukes til', 'Region'],
          rows: [
            [
              'Supabase',
              'Database, autentisering og backend-drift for Svario.',
              'EU-region. Primær region er North EU, Stockholm.',
            ],
            [
              'GitHub',
              'Hosting av statisk frontend, bygg og deploy.',
              'Region og eventuell overføring følger GitHub sine vilkår og dokumentasjon.',
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
          'Svario bruker ikke underdatabehandlere til annonsering, kommersiell datadeling eller trening av modeller på kunders spørreskjemabesvarelser.',
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
      'Praktisk sikkerhets- og personvernvedlegg for Svario, inkludert tilgangsstyring, kryptering, retention og hendelseshåndtering.',
    icon: ShieldCheck,
    sections: [
      {
        title: 'Ansvarsdeling',
        paragraphs: [
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
          'Svario lagrer ikke IP-adresse på spørreskjemabesvarelser.',
          'Respondenter får kort personverninformasjon før innsending.',
          'Samtykke må aktivt bekreftes når skjemaeier velger samtykke som rettslig grunnlag.',
        ],
      },
      {
        title: 'Tilgangsstyring',
        bullets: [
          'Administratorer må være innlogget før de får tilgang til arbeidsflater og skjemaer.',
          'Data beskyttes med tilgangsstyring.',
          'Tilgang til skjemaer, resultater og arbeidsflater begrenses til brukere som har rett til å se dem.',
          'Tilgang for drift, sikkerhet og feilretting skal begrenses til det som er nødvendig.',
        ],
      },
      {
        title: 'Kryptering og kommunikasjon',
        bullets: [
          'Trafikk mellom nettleser og Supabase går over kryptert transport.',
          'Supabase oppgir kryptering av kundedata ved lagring på plattformnivå.',
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
          'Svar som omfattes av begrenset lagringstid får automatisk slettetidspunkt satt basert på innsendelsestidspunkt og valgt lagringstid.',
          'Sletting og forlengelse av lagringstid logges som personvernhendelser.',
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
          'Svario har som mål å håndtere sikkerhets- og personvernhendelser på en strukturert og dokumenterbar måte. Rutinen kan omfatte mistanke om feil tilgang, uautorisert innsyn, utilsiktet sletting, manglende sletting, eksponerte nøkler eller annen mistenkelig aktivitet.',
          'Kunden er normalt behandlingsansvarlig for spørreskjemasvarene. Ved relevante hendelser kan Svario dele produkt- og hendelsesinformasjon innenfor rammene av tjenesten, slik at kunden kan gjøre egne vurderinger. Svario gir ikke juridisk rådgivning.',
        ],
        bullets: [
          'Registrere og vurdere hendelsen basert på tilgjengelig informasjon.',
          'Begrense skade der det er mulig og rimelig.',
          'Undersøke hvilke data, brukere, arbeidsflater, skjemaer eller respondenter som kan være berørt.',
          'Varsle berørte kunder når kundedata kan være berørt, i tråd med gjeldende krav og tilgjengelig informasjon.',
          'Dokumentere relevante tiltak, beslutninger og læringspunkter.',
        ],
      },
      {
        title: 'Kontinuerlig oppfølging',
        bullets: [
          'Kontaktpunkt for personvern- og sikkerhetshenvendelser holdes oppdatert.',
          'Leverandør-, region- og databehandlerinformasjon gjennomgås ved endringer.',
          'Tilgangsstyring og respondentflyter testes som del av releasearbeidet.',
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
    text: 'Svario lagrer ikke IP-adresse på besvarelser og skiller anonyme og identifiserte skjemaer tydelig.',
  },
  {
    icon: ListChecks,
    title: 'Retention i produktet',
    text: 'Skjemaeier velger lagringstid, får varsel når svar nærmer seg sletting, og må begrunne forlengelse av lagringstid.',
  },
  {
    icon: ShieldCheck,
    title: 'Tilgangsstyring',
    text: 'Tilgang til skjemaer og resultater begrenses til brukere som har rett til å se dem.',
  },
];

export function getTrustDocument(slug: string | undefined) {
  return trustDocuments.find((document) => document.slug === slug);
}
