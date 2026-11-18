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

If Supabase email templates are customized, use `{{ .ConfirmationURL }}` for
confirmation and magic links so Supabase verifies the token before redirecting
to the app. A plain `{{ .RedirectTo }}` or `{{ .SiteURL }}` link skips verification.

### Password recovery

The login page links to `/#/forgot-password`. Supabase Auth sends the recovery
email through the project's configured SMTP provider. The return URL is the
configured `VITE_AUTH_REDIRECT_URL` (or the current origin) with `?auth=recovery`,
for example `https://svario.no/?auth=recovery`. Allow this URL in Supabase Auth
Redirect URLs; the `https://svario.no/**` entry above also covers it. Add the
equivalent URL for local development and each customer installation.

Keep `{{ .ConfirmationURL }}` as the link in Supabase's Reset Password email
template so Supabase verifies the recovery token before returning to the app.
The app consumes the auth fragment before starting its hash router, removes
tokens from the address, then opens `/#/reset-password`. Expired or malformed
links offer a new recovery email. An authenticated session is required
to save the new password; account bootstrap does not block recovery.

Run `npm run test:auth` for password validation, callback routing, Auth requests,
and form behavior. For a full SMTP check, use a test account: request recovery,
open the email, save matching passwords, sign out, and check that only the new
password works. Also check an expired/reused link and refresh the reset page.

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

## Workspace branding (B)

There are two administration levels in the shared Svario app:

- `#/admin/profilering`: Svario admins can find workspaces across companies,
  follow up interest in the inbox, allow branding, create profiles, edit display
  name/color/logo, and activate or deactivate them. Access is checked against the
  private Svario-admin role on the server. A notification in the admin area counts
  new requests and refreshes every 30 seconds while the app is open.
- **Min profil → workspace → Profilering** (`#/workspaces/:id/profilering`):
  active workspace owners and admins can send a non-binding **Meld interesse**
  request with contact details and an optional comment. Repeated submissions
  produce one request per workspace. They see **Interesse meldt** until reviewed.
  This page is scoped to that workspace; changing the URL does not grant access
  to another company's profile or request.

The inbox supports New, In review, Approved and Closed. **Tillat profilering**
approves the request and grants permission atomically, without requiring a logo.
The customer can then upload their first logo. It creates an active profile with
the workspace name and the default accent color. Existing profiles retain their
permission; their logos, names, colors and publication status are preserved.
Closed requests can be reopened by the customer. Revision checks prevent stale
admin decisions and simultaneous first uploads from overwriting newer changes.
The request and permission tables are private, with RLS enabled and no direct
client access. All operations check current domain account roles on the server.

Unbranded workspaces remain free. Price and startup are agreed manually before
granting permission. This MVP has in-app notifications only, with no email,
Stripe, billing or payment processing. Both Business and Team workspaces can
request branding; personal surveys do not acquire workspace branding.

Both pages upload PNG/WebP through `save-workspace-branding`. The function
verifies the signed-in user, validates/decodes the image, strips metadata and
stores normalized PNG bytes privately. The database rechecks the domain account
and role at save time. Subsequent tenant uploads preserve name, accent color and activation.
Revision checks prevent overwriting newer edits from either administration level.
Only an active profile on an answerable public survey is exposed to respondents.
These B-branding pages are excluded from customer C builds.

Local checks: run the SQL files in `supabase/tests` against a local database and
serve the Edge Function locally before running the API test:

```bash
SVARIO_BRANDING_TEST_URL='http://127.0.0.1:54321' \
SVARIO_BRANDING_TEST_KEY='<local browser key>' \
SVARIO_BRANDING_TEST_ADMIN_EMAIL='<local Svario admin>' \
SVARIO_BRANDING_TEST_ADMIN_PASSWORD='<local test password>' \
node --test tests/workspace-branding.test.mjs
```

The test refuses remote hosts. Run these automated checks against a local
Supabase instance; deployment verification must not create customer test data.

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
