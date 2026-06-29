# Svario teknisk arkitektur

Dette dokumentet beskriver Svario slik applikasjonen er bygget i repoet: en React/Vite single page application med Supabase som backend for auth, database, RLS, RPC-er og Edge Functions.

Dokumentet er skrevet som en teknisk arkitekturtegning: bokser, piler, dataflyt, ansvarsgrenser og konkrete spesifikasjoner.

## 1. Systemkontekst

```mermaid
flowchart LR
  admin["Administrator<br/>nettleser"]
  respondent["Respondent<br/>nettleser/mobil"]
  pages["GitHub Pages<br/>statisk hosting<br/>svario.no"]
  spa["Svario SPA<br/>React + Vite"]

  supabase["Supabase-prosjekt"]
  auth["Supabase Auth"]
  api["PostgREST + RPC<br/>public schema"]
  edge["Edge Functions<br/>Deno runtime"]
  db["Postgres<br/>RLS + app_private"]
  storage["Supabase Storage<br/>ikke sentral i dagens app"]
  brreg["Brønnøysundregistrene<br/>ekstern API"]

  gha["GitHub Actions<br/>deploy-pages.yml"]
  repo["GitHub repo"]

  repo --> gha
  gha --> pages
  pages --> spa

  admin --> pages
  respondent --> pages

  spa --> auth
  spa --> api
  spa --> edge

  auth --> db
  api --> db
  edge --> db
  edge --> brreg
  supabase --> auth
  supabase --> api
  supabase --> edge
  supabase --> db
  supabase --> storage
```

Hovedideen er enkel:

- Frontend er en statisk bygget SPA som lastes fra GitHub Pages.
- All applikasjonsdata ligger i Supabase/Postgres.
- Nettleseren bruker kun Supabase publishable key.
- Hemmelige nøkler, spesielt service-role, skal bare brukes server-side i Edge Functions.
- Row Level Security bestemmer hva innloggede brukere og anonyme respondenter får lese og skrive.

## 2. Runtime-arkitektur

```mermaid
flowchart TB
  subgraph browser["Browser runtime"]
    main["src/main.tsx<br/>React root"]
    app["src/app/SvarioApp.tsx<br/>QueryClientProvider<br/>AuthProvider<br/>RouterProvider"]
    router["src/app/router.tsx<br/>Hash router<br/>lazy routes"]
    shell["AppShell + RequireAuth<br/>admin rammeverk"]

    subgraph presentation["Presentation layer"]
      adminPages["Admin pages<br/>dashboard, surveys, editor,<br/>results, profile, workspace"]
      publicPages["Public pages<br/>landing, trust, privacy,<br/>respondent flow"]
      sharedUi["Shared UI<br/>components, layout, utils"]
    end

    subgraph application["Application layer"]
      authProvider["AuthProvider<br/>session + domain account"]
      hooks["React Query hooks<br/>useSurveyList, useSurveyEditor,<br/>useSurveyResults, useWorkspaces"]
      errorMapper["User-facing error mapper<br/>application/errors"]
    end

    subgraph domain["Domain layer"]
      surveyDomain["Survey domain types<br/>questions, sections, responses"]
      workspaceDomain["Workspace domain types"]
      profileDomain["Profile domain types"]
    end

    subgraph data["Data layer"]
      surveyRepo["surveyRepository.ts"]
      authRepo["authRepository.ts"]
      workspaceRepo["workspaceRepository.ts"]
      profileRepo["profileRepository.ts"]
      brregRepo["brregRepository.ts"]
      clients["supabase/client.ts<br/>supabase + publicSupabase"]
    end
  end

  subgraph supabase["Supabase backend"]
    supaAuth["Auth service"]
    postgrest["PostgREST"]
    rpc["Postgres RPC functions"]
    edgeFns["Edge Functions"]
    postgres["Postgres tables<br/>RLS policies<br/>app_private helpers"]
  end

  main --> app
  app --> router
  app --> authProvider
  router --> shell
  router --> adminPages
  router --> publicPages

  adminPages --> hooks
  publicPages --> hooks
  adminPages --> sharedUi
  publicPages --> sharedUi

  hooks --> surveyRepo
  hooks --> workspaceRepo
  hooks --> profileRepo
  authProvider --> authRepo
  hooks --> errorMapper
  authProvider --> errorMapper

  surveyRepo --> clients
  workspaceRepo --> clients
  profileRepo --> clients
  authRepo --> clients
  brregRepo --> clients

  surveyRepo --> surveyDomain
  workspaceRepo --> workspaceDomain
  profileRepo --> profileDomain
  hooks --> surveyDomain

  clients --> supaAuth
  clients --> postgrest
  clients --> rpc
  clients --> edgeFns

  supaAuth --> postgres
  postgrest --> postgres
  rpc --> postgres
  edgeFns --> postgres
```

## 3. Lagdeling i repoet

```mermaid
flowchart BT
  domain["src/domain<br/>Ren TypeScript<br/>forretningsmodeller og regler"]
  data["src/data<br/>Supabase repositories<br/>mapping mellom database og domain"]
  application["src/application<br/>hooks, providers, use cases,<br/>cache og feilhåndtering"]
  presentation["src/presentation<br/>React-sider, layout og komponenter"]
  app["src/app<br/>routing, app bootstrap og providers"]
  infra["src/infrastructure<br/>miljø/config og tekniske hjelpere"]
  styles["src/styles<br/>global CSS og design tokens"]
  supabaseDir["supabase<br/>migrations, functions, config"]

  app --> presentation
  app --> application
  presentation --> application
  presentation --> domain
  application --> data
  application --> domain
  application --> infra
  data --> domain
  data --> infra
  data --> supabaseDir

  styles --> presentation
```

Avhengighetsregelen er:

- `domain` skal ikke importere React, Supabase eller UI.
- `data` kjenner Supabase og oversetter databaseformat til domenemodeller.
- `application` orkestrerer brukerflyt, React Query-cache, auth-state og feilmeldinger.
- `presentation` viser skjermbilder og kaller hooks, men bør ikke gjøre direkte databasekall.
- `app` kobler sammen router, providers og globale rammer.
- `supabase/` er backendens kildekode: migrasjoner, RLS, SQL-funksjoner og Edge Functions.

## 4. Viktige mapper og ansvar

| Område | Ansvar | Typiske filer |
| --- | --- | --- |
| `src/app` | Starter appen, registrerer router og globale providers | `SvarioApp.tsx`, `router.tsx`, `routes.ts` |
| `src/presentation/admin` | Adminflater for innloggede brukere | dashboard, survey list, editor, results, profile |
| `src/presentation/public` | Offentlige sider og respondentflyt | landing, trust, privacy, respondent |
| `src/presentation/shared` | Gjenbrukbar UI og layout | `AppShell`, knapper, statuser, hjelpetekster |
| `src/application/auth` | Auth-session, domain account bootstrap og login/logout | `AuthProvider.tsx` |
| `src/application/surveys` | Survey use cases og React Query hooks | list, editor, public survey, results |
| `src/application/errors` | Sentral maskering av tekniske feil til brukertrygge meldinger | `userFacingError.ts` |
| `src/data/supabase` | Supabase browserklienter og genererte databasetyper | `client.ts`, `types.ts` |
| `src/data/*` | Repositories som gjør database-, RPC- og function-kall | survey, auth, workspace, profile, brreg |
| `src/domain/*` | Domenetyper, enums og rene regler | survey, workspace, profile, organization |
| `supabase/migrations` | Database, RLS, RPC-er og helper-funksjoner | SQL-migrasjoner |
| `supabase/functions` | Server-side kode med mulighet for hemmelige nøkler | `delete-account`, `lookup-organization` |
| `.github/workflows` | CI/deploy til GitHub Pages | `deploy-pages.yml` |

## 5. Routing og skjermtopologi

Svario bruker hash routing fordi appen hostes statisk på GitHub Pages. Det gjør at URL-er under samme statiske entry point kan rutes i klienten.

```mermaid
flowchart TB
  browser["Browser URL"]
  hashRouter["React Router<br/>createHashRouter"]

  browser --> hashRouter

  subgraph publicRoutes["Public routes"]
    home["/#/"]
    privacy["/#/privacy"]
    security["/#/security"]
    trust["/#/trust"]
    trustDoc["/#/trust/:documentSlug"]
    respondent["/#/s/:slug<br/>respondent flow"]
  end

  subgraph authBoundary["Admin auth boundary"]
    requireAuth["RequireAuth"]
    appShell["AppShell"]
  end

  subgraph adminRoutes["Admin routes"]
    dashboard["/#/dashboard"]
    surveys["/#/surveys"]
    createSurvey["/#/surveys/new"]
    editSurvey["/#/surveys/:id/edit"]
    results["/#/surveys/:id/results"]
    present["/#/surveys/:id/results/present"]
    profile["/#/profile"]
    join["/#/join/:token"]
  end

  hashRouter --> publicRoutes
  hashRouter --> requireAuth
  requireAuth --> appShell
  appShell --> adminRoutes
```

Teknisk konsekvens:

- Public respondent route kan lastes uten innlogging.
- Admin routes krever Supabase-session og ferdig initialisert domain account.
- GitHub Pages trenger bare å levere `index.html` og statiske assets.

## 6. Auth, identitet og domain account

Svario skiller mellom Supabase Auth-brukeren og Svarios eget konto-/brukerbegrep. Dette er viktig fordi appens eierskap og RLS skal peke mot domain account, ikke direkte mot `auth.users.id`.

```mermaid
sequenceDiagram
  autonumber
  actor User as Administrator
  participant Login as LoginPage
  participant AuthProvider as AuthProvider
  participant AuthRepo as authRepository
  participant SupaAuth as Supabase Auth
  participant RPC as Postgres RPC
  participant DB as Postgres/RLS
  participant Router as RequireAuth/Router

  User->>Login: Skriver e-post/passord
  Login->>SupaAuth: signInWithPassword()
  SupaAuth-->>AuthProvider: auth state change med session
  AuthProvider->>AuthRepo: bootstrapDomainAccount(session)
  AuthRepo->>RPC: ensure_account_initialized_v2()
  RPC->>DB: Opprett/les account, app_user og kobling
  AuthRepo->>RPC: sync_my_identity()
  RPC->>DB: Synkroniser auth metadata til domain identity
  AuthRepo->>DB: Les account via RLS
  DB-->>AuthProvider: Domain account
  AuthProvider-->>Router: status = authenticated, isAdminReady = true
  Router-->>User: Adminflate vises
```

Identitetsmodellen kan leses slik:

```mermaid
erDiagram
  AUTH_USERS ||--o{ ACCOUNT_AUTH_USERS : "auth_user_id"
  ACCOUNTS ||--o{ ACCOUNT_AUTH_USERS : "account_id"
  APP_USERS ||--o{ ACCOUNT_AUTH_USERS : "user_id"
  APP_USERS ||--o{ USER_IDENTITIES : "user_id"
  APP_USERS ||--o| PROFILES : "user_id"
  ACCOUNTS ||--o{ SURVEYS : "owner_account_id"

  AUTH_USERS {
    uuid id PK
    text email
  }

  ACCOUNTS {
    uuid id PK
    text display_name
    timestamptz created_at
  }

  APP_USERS {
    uuid id PK
    text email
    timestamptz created_at
  }

  ACCOUNT_AUTH_USERS {
    uuid account_id FK
    uuid auth_user_id FK
    uuid user_id FK
  }

  USER_IDENTITIES {
    uuid user_id FK
    text provider
    text provider_subject
  }

  PROFILES {
    uuid user_id FK
    text full_name
    text organization_name
  }

  SURVEYS {
    uuid id PK
    uuid owner_account_id FK
    text title
  }
```

Konsekvens for ny kode:

- Bruk `account.id` som Svario-eierskap i appen.
- Ikke bruk `auth.users.id` som direkte eier av surveys, workspaces eller andre forretningsobjekter.
- La databasefunksjoner hente gjeldende konto via `app_private.current_account_id()` eller tilsvarende helper.

## 7. Respondentflyt og offentlig datatilgang

Respondentflyten bruker en separat Supabase-klient uten persistent session. Det gjør at offentlig svarflyt ikke blander seg med en eventuell adminsession i samme nettleser.

```mermaid
sequenceDiagram
  autonumber
  actor Respondent as Respondent
  participant Page as RespondentPage
  participant Hook as usePublishedSurvey
  participant Repo as surveyRepository
  participant PublicClient as publicSupabase
  participant DB as Postgres/RLS
  participant SubmitHook as useSubmitSurveyResponse
  participant RPC as submit_survey_response()

  Respondent->>Page: Åpner /#/s/:slug
  Page->>Hook: Last publisert skjema
  Hook->>Repo: getPublishedSurvey(slug)
  Repo->>PublicClient: select survey + sections + questions + options
  PublicClient->>DB: RLS-sikret offentlig lesing
  DB-->>Page: Publisert survey-modell
  Respondent->>Page: Fyller ut svar
  Page->>SubmitHook: submitSurveyResponse(payload)
  SubmitHook->>Repo: submitSurveyResponse()
  Repo->>PublicClient: rpc('submit_survey_response')
  PublicClient->>RPC: Validering, rate limit og insert
  RPC->>DB: survey_responses, answers, answer_options
  DB-->>RPC: response id
  RPC-->>Page: Kvittering
  Page-->>Respondent: Takk / bekreftelse
```

Offentlig tilgang skal være smal:

- Lesing: kun publiserte surveys og data som trengs for å svare.
- Skriving: kun gjennom validerte RPC-er eller RLS-regler som er laget for respondentbruk.
- Ingen adminspørringer skal kunne kjøres anonymt.

## 8. Admin dataflyt for survey editor

```mermaid
flowchart LR
  page["SurveyEditorPage"]
  hook["useSurveyEditor<br/>React Query"]
  repo["surveyRepository"]
  client["supabase<br/>authenticated client"]
  db["Postgres<br/>surveys, sections,<br/>questions, options"]
  domain["SurveyEditor domain model"]
  cache["TanStack Query cache"]

  page --> hook
  hook --> repo
  repo --> client
  client --> db
  db --> repo
  repo --> domain
  domain --> hook
  hook --> cache
  cache --> page

  page -- "mutations<br/>create/update/delete/publish" --> hook
  hook -- "repository call" --> repo
  repo -- "table write/RPC" --> db
  hook -- "invalidate/refetch" --> cache
```

Arkitekturintensjonen er at editoren ikke skal vite hvordan databasekallet ser ut. Den skal jobbe mot application hooks og domenemodeller. Repository-laget tar seg av Supabase-format, joins, RPC-er, mapping og tekniske feil.

## 9. Resultater, eksport og presentasjon

```mermaid
flowchart TB
  resultsPage["ResultsPage"]
  presentPage["ResultsPresentationPage"]
  hook["useSurveyResults"]
  repo["surveyRepository"]
  db["Postgres/RLS"]
  analytics["Client-side analyse<br/>aggregering og visning"]
  exports["Client-side eksport<br/>CSV, PDF, DOCX, PPTX"]

  resultsPage --> hook
  presentPage --> hook
  hook --> repo
  repo --> db
  db --> repo
  repo --> hook
  hook --> analytics
  analytics --> resultsPage
  analytics --> presentPage
  resultsPage --> exports
```

Resultatsiden er en adminflate og skal derfor ligge bak `RequireAuth`. Datatilgang skal være RLS-sikret slik at bare eier eller autoriserte workspace-medlemmer kan hente resultater.

## 10. Feilhåndtering og brukertrygge meldinger

```mermaid
flowchart LR
  supabaseError["Supabase/Auth/Postgres error<br/>teknisk melding"]
  repository["Repository<br/>kaster eller returnerer error"]
  appHook["Application hook / AuthProvider<br/>try/catch eller mutation error"]
  mapper["getUserFacingErrorMessage()<br/>sentral allowlist/maskering"]
  ui["Presentation<br/>norsk brukerbeskjed"]
  logs["Konsoll/devtools<br/>teknisk kontekst ved behov"]

  supabaseError --> repository
  repository --> appHook
  appHook --> mapper
  mapper --> ui
  appHook -. "kan logges i utvikling" .-> logs
```

Prinsippet er:

- Tekniske databasefeil skal ikke vises direkte til brukeren.
- Kjente validerings- og auth-feil oversettes til forståelige norske meldinger.
- Ukjente feil får en rolig fallback, for eksempel at noe gikk galt og at brukeren kan prøve igjen.
- Repository-laget kan fortsatt bevare teknisk feilobjekt for debugging, men UI skal gå via `application/errors`.

## 11. Database- og RLS-arkitektur

```mermaid
flowchart TB
  browserClient["Browser Supabase client<br/>publishable key"]
  jwt["Supabase JWT<br/>anon/authenticated role"]
  postgrest["PostgREST / RPC"]
  rls["Row Level Security<br/>public schema"]
  helpers["app_private helpers<br/>current_account_id(), validation,<br/>audit, rate limit"]
  tables["App tables<br/>surveys, responses,<br/>workspaces, profiles"]

  browserClient --> jwt
  jwt --> postgrest
  postgrest --> rls
  rls --> helpers
  helpers --> tables
```

Databaseregler:

- RLS skal være aktiv på apptabeller som eksponeres via Supabase API.
- Policies bør være eksplisitte for `authenticated` og `anon`.
- Adminoperasjoner skal sjekke domain account eller workspace-medlemskap.
- Respondentoperasjoner skal være begrenset til publiserte skjemaer og validerte inserts.
- `app_private` brukes for interne hjelpefunksjoner og sikkerhetslogikk som ikke skal være direkte API-flate.

## 12. Survey-datamodell

```mermaid
erDiagram
  ACCOUNTS ||--o{ SURVEYS : owns
  WORKSPACES ||--o{ SURVEYS : contains
  SURVEYS ||--o{ SURVEY_SECTIONS : has
  SURVEY_SECTIONS ||--o{ QUESTIONS : has
  QUESTIONS ||--o{ QUESTION_OPTIONS : has
  SURVEYS ||--o{ SURVEY_RESPONSES : receives
  SURVEY_RESPONSES ||--o{ ANSWERS : has
  QUESTIONS ||--o{ ANSWERS : answered_by
  ANSWERS ||--o{ ANSWER_OPTIONS : selects
  QUESTION_OPTIONS ||--o{ ANSWER_OPTIONS : selected_option
  SURVEYS ||--o| SURVEY_PRIVACY_SETTINGS : privacy
  SURVEYS ||--o{ SURVEY_PRIVACY_EVENTS : privacy_events

  ACCOUNTS {
    uuid id PK
    text display_name
  }

  WORKSPACES {
    uuid id PK
    text name
  }

  SURVEYS {
    uuid id PK
    uuid owner_account_id FK
    uuid workspace_id FK
    text title
    text slug
    text status
    timestamptz published_at
  }

  SURVEY_SECTIONS {
    uuid id PK
    uuid survey_id FK
    text title
    integer position
  }

  QUESTIONS {
    uuid id PK
    uuid section_id FK
    text type
    text title
    boolean required
    integer position
  }

  QUESTION_OPTIONS {
    uuid id PK
    uuid question_id FK
    text label
    integer position
  }

  SURVEY_RESPONSES {
    uuid id PK
    uuid survey_id FK
    timestamptz submitted_at
  }

  ANSWERS {
    uuid id PK
    uuid response_id FK
    uuid question_id FK
    text text_value
    numeric number_value
  }

  ANSWER_OPTIONS {
    uuid answer_id FK
    uuid option_id FK
  }

  SURVEY_PRIVACY_SETTINGS {
    uuid survey_id FK
    boolean collect_ip
    boolean collect_user_agent
    integer retention_days
  }

  SURVEY_PRIVACY_EVENTS {
    uuid id PK
    uuid survey_id FK
    text event_type
    timestamptz created_at
  }
```

Denne modellen er normalisert rundt survey-strukturen:

- Survey eier seksjoner.
- Seksjoner eier spørsmål.
- Spørsmål kan ha alternativer.
- En survey mottar responses.
- En response eier answers.
- Answers kan peke til valgte alternativer via koblingstabell.

## 13. Workspace-modell

```mermaid
erDiagram
  ACCOUNTS ||--o{ WORKSPACE_MEMBERS : member_account
  WORKSPACES ||--o{ WORKSPACE_MEMBERS : has_members
  WORKSPACES ||--o{ WORKSPACE_INVITATIONS : has_invitations
  WORKSPACES ||--o{ SURVEYS : groups_surveys

  ACCOUNTS {
    uuid id PK
    text display_name
  }

  WORKSPACES {
    uuid id PK
    text name
    uuid created_by_account_id
  }

  WORKSPACE_MEMBERS {
    uuid workspace_id FK
    uuid account_id FK
    text role
  }

  WORKSPACE_INVITATIONS {
    uuid id PK
    uuid workspace_id FK
    text email
    text token
    timestamptz expires_at
  }

  SURVEYS {
    uuid id PK
    uuid workspace_id FK
    uuid owner_account_id FK
  }
```

Workspace gir en gruppeflate rundt surveys, men endrer ikke grunnregelen om at domain account er sentral identitet for eierskap og tilgang.

## 14. Supabase-klienter i frontend

```mermaid
flowchart LR
  env["Vite env<br/>VITE_SUPABASE_URL<br/>VITE_SUPABASE_PUBLISHABLE_KEY"]
  supabaseClient["supabase<br/>authenticated browser client<br/>persistSession = true"]
  publicClient["publicSupabase<br/>public respondent client<br/>persistSession = false"]
  authFlows["Admin auth flows"]
  adminData["Admin repositories"]
  respondentData["Respondent repositories"]
  backend["Supabase API"]

  env --> supabaseClient
  env --> publicClient
  supabaseClient --> authFlows
  supabaseClient --> adminData
  publicClient --> respondentData
  authFlows --> backend
  adminData --> backend
  respondentData --> backend
```

Klientene har ulike roller:

- `supabase` brukes der brukerens session skal følge med.
- `publicSupabase` brukes for offentlig respondentflyt uten persistent login-state.
- Ingen av klientene skal inneholde service-role key.

## 15. Edge Functions

```mermaid
flowchart TB
  browser["Browser"]
  invoke["supabase.functions.invoke()"]
  edge["Supabase Edge Function<br/>Deno"]
  authHeader["Authorization header<br/>bruker-JWT"]
  serviceRole["Service role client<br/>kun server-side"]
  postgres["Postgres"]
  brreg["Brønnøysundregistrene"]

  browser --> invoke
  invoke --> edge
  edge --> authHeader
  edge --> serviceRole
  serviceRole --> postgres
  edge --> brreg
```

Eksisterende funksjoner:

| Function | Ansvar | Sikkerhetsmodell |
| --- | --- | --- |
| `delete-account` | Slette kontodata og auth-bruker | Validerer bruker-JWT, bruker service-role server-side |
| `lookup-organization` | Slå opp organisasjon i Brønnøysundregistrene | Validerer innlogging, kaller ekstern API fra server-side |

Edge Functions brukes når nettleseren ikke bør eller ikke kan gjøre jobben direkte:

- hemmelige nøkler
- ekstern API-integrasjon
- administrative Supabase-operasjoner
- operasjoner som trenger ekstra server-side validering

## 16. Deploy- og buildflyt

```mermaid
flowchart LR
  dev["Utvikler"]
  repo["GitHub repo"]
  action["GitHub Actions<br/>deploy-pages.yml"]
  npmci["npm ci"]
  build["npm run build:pages<br/>vite build"]
  dist["dist/"]
  pages["GitHub Pages"]
  browser["Brukerens nettleser"]
  supabase["Supabase"]

  dev --> repo
  repo --> action
  action --> npmci
  npmci --> build
  build --> dist
  dist --> pages
  pages --> browser
  browser --> supabase
```

Build og deploy:

- Lokalt brukes vanligvis `npm run build` som verifikasjon.
- GitHub Pages bruker `npm run build:pages`.
- Produksjonsvariabler injiseres som Vite-variabler under build.
- Resultatet er statiske filer i `dist/`.

## 17. Teknisk spesifikasjon

| Del | Valg | Kommentar |
| --- | --- | --- |
| Frontend runtime | Browser SPA | Ingen egen Node-server i produksjon |
| UI framework | React 19 | Komponentbasert admin- og respondentflate |
| Build tool | Vite 7 | Rask dev-server og statisk produksjonsbuild |
| Språk | TypeScript 5.9 | Typing på tvers av UI, domain og data |
| Routing | React Router 7 + hash router | Passer statisk hosting på GitHub Pages |
| Server state | TanStack React Query 5 | Caching, mutations, invalidation og loading/error-state |
| Backend client | `@supabase/supabase-js` 2.x | Auth, PostgREST, RPC og Edge Functions |
| Database | Supabase Postgres | RLS, SQL-funksjoner, migrasjoner |
| Auth | Supabase Auth | Session i browser, domain account bootstrap i appen |
| Server-side funksjoner | Supabase Edge Functions | Deno runtime for hemmeligheter og eksterne API-er |
| Hosting | GitHub Pages | Statisk hosting av bygget SPA |
| Diagrammer | Mermaid i Markdown | Kan rendres av GitHub og mange Markdown-verktøy |
| Eksport | `papaparse`, `jspdf`, `docx`, `pptxgenjs` | Klient-side eksport fra resultater |
| Grafer | Recharts | Visualisering av surveyresultater |
| Ikoner | lucide-react | Lettvektige UI-ikoner |

## 18. Miljøvariabler og hemmeligheter

```mermaid
flowchart TB
  local[".env.local<br/>lokal utvikling"]
  example[".env.example<br/>trygge placeholders"]
  ghaSecrets["GitHub Secrets/Variables"]
  vite["Vite build"]
  browser["Browser bundle"]
  edgeEnv["Edge Function env<br/>server-side secrets"]

  local --> vite
  ghaSecrets --> vite
  vite --> browser
  example -. "dokumenterer forventede variabler" .-> local
  edgeEnv --> edgeFns["Supabase Edge Functions"]
```

Regler:

- `VITE_SUPABASE_URL` og `VITE_SUPABASE_PUBLISHABLE_KEY` kan bygges inn i frontend.
- Service-role keys skal aldri inn i Vite-variabler eller frontend-bundle.
- Lokale hemmeligheter hører hjemme i `.env.local`.
- `.env.example` skal bare inneholde placeholders.
- Edge Function secrets håndteres i Supabase-miljøet.

## 19. Cache- og invalidationmodell

```mermaid
flowchart LR
  page["Page/component"]
  queryHook["React Query hook"]
  queryKey["Query key"]
  repo["Repository"]
  mutation["Mutation"]
  invalidation["invalidateQueries()"]
  refetch["Refetch"]

  page --> queryHook
  queryHook --> queryKey
  queryHook --> repo
  page --> mutation
  mutation --> repo
  mutation --> invalidation
  invalidation --> queryKey
  queryKey --> refetch
  refetch --> repo
```

Typiske query keys:

- Survey list
- Survey editor
- Published survey
- Survey results
- Workspaces
- Profile

Retningslinje:

- Lesing skjer gjennom query hooks.
- Skriving skjer gjennom mutations.
- Mutations skal invalidere relevante query keys slik at UI-et henter ferske data.

## 20. Hvor ny kode bør plasseres

```mermaid
flowchart TB
  question["Hva bygger du?"]
  ui["Ny skjerm eller komponent"]
  usecase["Ny brukerflyt eller server-state logikk"]
  dbcall["Nytt Supabase-kall"]
  model["Ny forretningsmodell eller regel"]
  schema["Ny database-tabell, policy eller RPC"]
  secret["Kode som trenger hemmelig nøkkel"]

  question --> ui
  question --> usecase
  question --> dbcall
  question --> model
  question --> schema
  question --> secret

  ui --> presentation["src/presentation"]
  usecase --> application["src/application"]
  dbcall --> data["src/data"]
  model --> domain["src/domain"]
  schema --> migrations["supabase/migrations"]
  secret --> functions["supabase/functions"]
```

Praktisk tommelfingerregel:

| Behov | Plassering |
| --- | --- |
| Ny knapp, modal, side eller layout | `src/presentation` |
| Ny hook for lasting/lagring og UI-state | `src/application` |
| Ny databaseforespørsel, RPC-kall eller function invoke | `src/data` |
| Ny type, status, valideringsregel eller domenebegrep | `src/domain` |
| Ny tabell, indeks, RLS-policy eller SQL-funksjon | `supabase/migrations` |
| Ny operasjon med hemmelighet/service-role/ekstern serverintegrasjon | `supabase/functions` |
| Ny global stil/design token | `src/styles` |

## 21. Arkitekturmessige kvaliteter

| Kvalitet | Hvordan arkitekturen støtter det |
| --- | --- |
| Sikkerhet | RLS, domain account, service-role kun server-side, smal public client |
| Deploybarhet | Statisk Vite-build til GitHub Pages |
| Lesbarhet | Lagdelt repo med tydelig avhengighetsretning |
| Testbarhet | Domain/data/application kan testes mer målrettet enn store UI-flater |
| Robusthet | React Query håndterer loading, retry, invalidation og cache |
| Brukeropplevelse | Sentral feilmeldingsmapping hindrer tekniske databasefeil i UI |
| Evolusjon | Nye use cases kan legges vertikalt innenfor eksisterende lag |

## 22. Arkitekturprinsipper for videre utvikling

1. Hold databasekall i `src/data`.
2. Hold brukerflyt og caching i `src/application`.
3. Hold React-komponenter fri for Supabase-detaljer.
4. Hold domenemodeller rene og uavhengige.
5. Bruk migrasjoner for databaseendringer.
6. La RLS være den siste sikkerhetsgrensen, ikke bare UI-logikk.
7. Ikke vis rå database- eller auth-feil direkte til brukeren.
8. Ikke bland Supabase Auth-id med Svario domain account-id.
9. Ikke legg serverhemmeligheter i frontend.
10. Bruk Edge Functions når en operasjon krever service-role, hemmeligheter eller ekstern API-logikk.

