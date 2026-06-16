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
