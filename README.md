# Svario

Svario is a React, Vite and Supabase questionnaire app.

## Local Development

Install dependencies:

```bash
npm install
```

Create `.env.local` from `.env.example` and fill in the browser-safe Supabase values:

```env
VITE_AUTH_REDIRECT_URL=http://localhost:5173/
VITE_SUPABASE_URL=https://PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=
```

For email confirmation and magic links, set Supabase Auth Site URL to the
deployed app URL, and add both local and deployed app URLs in Supabase Auth
Redirect URLs. During local development that is typically:

```text
http://localhost:5173
http://localhost:5173/**
http://127.0.0.1:5173
http://127.0.0.1:5173/**
```

If Vite chooses another local port, add that port too. For the deployed custom
domain, set Site URL to `https://svario.no` and add both `https://svario.no`
and `https://svario.no/**` as Redirect URLs.

If Supabase email templates are customized, make sure confirmation and magic
link templates use `{{ .RedirectTo }}` or `{{ .ConfirmationURL }}` rather than
hard-coding `{{ .SiteURL }}` into the user-facing link.

Start the dev server:

```bash
npm run dev
```

Build for production:

```bash
npm run build
```

## Customer packages (C pilot)

The same product can be built with a versioned instance profile from the
separate `svario-deploy` repository. Use the exact Node version in `.node-version`
for customer packaging. Customer packages contain the static web build,
database migrations and a provenance manifest; they do not contain the
platform, credentials or customer data, and do not deploy themselves.

See [the v0.0.103 C-pilot release notes](docs/releases/v0.0.103.md) for scope,
tagged build instructions and the separation from B-workspace branding.

## GitHub Pages build

Build the GitHub Pages variant locally:

```bash
npm run build:pages
```

## GitHub Pages

The repository deploys the web app from `.github/workflows/deploy-pages.yml`.
The Pages site uses the custom domain `svario.no`, so Vite builds with root
base path `/`.

In GitHub, configure:

- Settings -> Pages -> Build and deployment -> Source: GitHub Actions
- Settings -> Secrets and variables -> Actions -> Variables:
  - `VITE_AUTH_REDIRECT_URL=https://svario.no/`
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_PUBLISHABLE_KEY`

In Supabase Auth URL Configuration, set Site URL to `https://svario.no` and add:

```text
https://svario.no
https://svario.no/**
```

## Live survey pilot

Choose **Liveøkt** under **Varighet** and add anonymous single-select or scale
questions. **Start liveøkt** opens the QR lobby directly from the editor.
You can also start a live session from a published survey with ordinary duration.
Use **Vis første spørsmål** and **Neste spørsmål** to control the mobile screens.
Finished sessions are under **Tidligere liveøkter** on the survey editor. The QR code stays the same
throughout the session. Live responses are summarized separately. A room
closes after eight hours or when the survey ends, whichever comes first.
Session data is kept for up to 30 days, or less if the survey specifies a
shorter retention period.

To simulate a room, start a local Supabase instance with the migrations applied
and email confirmations disabled (the repository's local default). Use the
local publishable or anon key from `supabase status`:

```bash
SVARIO_LIVE_TEST_KEY='<local public key>' npm run test:live
```

Set `SVARIO_LIVE_TEST_URL` if the local API uses a different port. The test
creates temporary users and a survey, runs 50 clients against the same room
and checks the results, retry behavior, host permissions and the race between
closing a question and submitting answers. It also verifies withdrawing and
republishing a survey, closing with preserved answers, and the race between
withdrawing and receiving the first response. It reports local request timings.
For a manual rehearsal, put the host on a large screen and join from five
phones on shared Wi-Fi. Include a late join, a phone that temporarily loses
its connection and a scan of the QR code from the back of the room.
