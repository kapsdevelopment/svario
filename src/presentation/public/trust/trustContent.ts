import type { LucideIcon } from 'lucide-react';
import {
  Database,
  FileCheck2,
  FileText,
  ListChecks,
  LockKeyhole,
  ShieldCheck,
} from 'lucide-react';

export type TrustDocumentSlug =
  | 'personvern'
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
          'For spørreskjemaer er det vanligvis skjemaeieren som er behandlingsansvarlig for formål, innhold, rettslig grunnlag og lagringstid. Svario er databehandler for besvarelsene.',
          'For Svario-kontoer, drift, sikkerhet, avtaleoppfølging og administrasjon er Kapsdevelopment AS behandlingsansvarlig.',
        ],
      },
      {
        title: 'Hva kan Svario behandle?',
        bullets: [
          'Kontoopplysninger for administratorer.',
          'Profil- og arbeidsflateopplysninger.',
          'Spørreskjemaer, spørsmål og svar.',
          'Respondentnavn, e-postadresse eller lignende dersom skjemaeier velger identifisert skjema.',
          'Fritekst som respondenter skriver inn.',
          'Samtykke- og personvernvalg der skjemaet krever det.',
          'Tekniske opplysninger som er nødvendige for drift, sikkerhet og feilretting.',
          'Henvendelser sendt via kontaktskjema.',
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
          'For kundens spørreskjemaer velger og dokumenterer kunden rettslig grunnlag. Svario legger til rette for at kunden kan beskrive formål, rettslig grunnlag, kontaktpunkt og lagringstid for hvert skjema.',
          'Besvarelser lagres etter lagringstiden skjemaeier velger for skjemaet. Når lagringstiden utløper, slettes svar automatisk når retention-jobben kjører.',
          'Dersom skjemaeier forlenger lagringstiden for et skjema med eksisterende svar, må skjemaeier oppgi en begrunnelse. Forlengelsen logges.',
        ],
      },
      {
        title: 'Rettigheter, kontakt og klage',
        paragraphs: [
          'Registrerte kan ha rett til innsyn, retting, sletting, begrensning, dataportabilitet og protest etter GDPR.',
          'For svar i et kundestyrt skjema bør henvendelser normalt rettes til skjemaeieren, fordi skjemaeieren bestemmer formål og lagringstid. Svario kan bistå skjemaeieren ved behov.',
          'Hvis henvendelsen gjelder Svario-konto, drift, sikkerhet eller Kapsdevelopment AS sin egen behandling, kan kontaktskjemaet på kapsdevelopment.com brukes.',
          'Du kan også klage til Datatilsynet dersom du mener personopplysninger behandles i strid med regelverket.',
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
      'Rollefordeling, instrukser, sikkerhetstiltak, underdatabehandlere, avvik, revisjon og sletting.',
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
          'Kunden er behandlingsansvarlig for formål, spørsmål, rettslig grunnlag, lagringstid, informasjon til respondenter og vurderingen av om det er nødvendig å fortsette å lagre svar.',
          'Svario er databehandler for spørreskjemaer, besvarelser og respondentopplysninger som behandles på kundens vegne.',
          'Kapsdevelopment AS er selvstendig behandlingsansvarlig for egne konto-, sikkerhets-, drifts-, avtale- og kontaktopplysninger der Kapsdevelopment AS selv bestemmer formålet.',
        ],
      },
      {
        title: 'Kundens instrukser',
        bullets: [
          'Innstillingene kunden velger i Svario.',
          'Databehandleravtalen.',
          'Dokumenterte skriftlige henvendelser fra kunden.',
          'Eventuelle supplerende avtalevilkår.',
        ],
        paragraphs: [
          'Svario skal bare behandle personopplysninger etter dokumenterte instrukser fra kunden, med mindre lov krever noe annet.',
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
          'Ikke samle inn flere personopplysninger enn nødvendig.',
          'Ikke bruke Svario til særlige kategorier personopplysninger eller høyrisikobehandling uten særskilt vurdering og avtale.',
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
    status: 'Arbeidsutkast, må kvalitetssikres mot faktisk produksjonsoppsett',
    summary:
      'Praktisk sikkerhets- og personvernvedlegg for Svario, inkludert tilgang, RLS, kryptering, retention og hendelseshåndtering.',
    icon: ShieldCheck,
    sections: [
      {
        title: 'Status',
        paragraphs: [
          'Svario er ikke ISO 27001-sertifisert. Tiltakene beskriver Svario sitt eget kontrollnivå og relevante leverandørkontroller der Svario bruker underdatabehandlere.',
          'Kunden oppretter spørreskjema, velger om skjemaet er anonymt eller identifisert, bestemmer formål og lagringstid, og administrerer svarene.',
        ],
      },
      {
        title: 'Dataminimering og personvern som standard',
        bullets: [
          'Anonyme skjemaer skal ikke lagre respondentnavn, e-postadresse eller Svario-konto-id.',
          'Identifiserte skjemaer krever personverninnstillinger før publisering.',
          'Skjemaeier må oppgi formål, kontaktpunkt, rettslig grunnlag og lagringstid når personopplysninger forventes.',
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
        title: 'Lagringstid, sletting og logging',
        bullets: [
          'Skjemaeier velger lagringstid for persondata i skjemaet.',
          'Besvarelser får beregnet slettefrist.',
          'En daglig retention-jobb sletter svar når fristen er passert.',
          'Skjemaeier varsles i appen når svar nærmer seg automatisk sletting.',
          'Dersom skjemaeier forlenger lagringstid for eksisterende svar, kreves begrunnelse.',
          'Forlengelser logges som personvernhendelser.',
        ],
      },
      {
        title: 'Åpne punkter før produksjon',
        bullets: [
          'Endelig kontakt-URL for personvern- og sikkerhetshenvendelser.',
          'Supabase-plan, backupnivå og restore-rutine.',
          'Endelig GitHub Pages/GitHub Actions-rolle.',
          'Endelig underdatabehandlerliste og regioner.',
          'Krav til MFA for administratorer.',
          'RLS-testdekning for eier, ikke-eier og anonym respondent.',
          'Rutine for innsyn, sletting, dataportabilitet og avvik.',
          'Juridisk gjennomgang av databehandleravtale og personvernerklæring.',
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
    label: 'Questback Trust Center',
    href: 'https://www.questback.com/trust-center/',
  },
  {
    label: 'Netigate Legal',
    href: 'https://www.netigate.net/legal/',
  },
  {
    label: 'Kapsdevelopment',
    href: 'https://kapsdevelopment.com/',
  },
];

export const trustHighlights = [
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
