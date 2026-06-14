# Svario

Svario is a React, Vite and Supabase questionnaire app.

## Local Development

Install dependencies:

```bash
npm install
```

Create `.env.local` from `.env.example` and fill in the browser-safe Supabase values:

```env
VITE_SUPABASE_URL=https://PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=
```

For email confirmation and magic links, add your local and deployed app URLs in
Supabase Auth Redirect URLs. During local development that is typically:

```text
http://localhost:5173/**
http://127.0.0.1:5173/**
```

If Vite chooses another local port, add that port too. For GitHub Pages, add the
final `https://<user>.github.io/<repo>/**` URL.

Start the dev server:

```bash
npm run dev
```

Build for production:

```bash
npm run build
```
