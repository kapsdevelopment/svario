# Agents Guide

Svario is a React, Vite and Supabase questionnaire app. The backend is Supabase/Postgres with Row Level Security, and the web app is expected to be deployable to GitHub Pages.

## Working Rules

- Keep changes scoped to the current task and follow existing project patterns as they appear.
- Follow the layered architecture notes in `architecture.md`.
- Do not commit secrets, database passwords, service-role keys or real production credentials.
- Use `.env.local` for local secrets and keep `.env.example` safe and placeholder-only.
- Use Supabase migrations for database schema changes.
- Keep RLS enabled on app tables and prefer explicit policies over broad public access.
- Keep the Svario domain user/account id separate from `auth.users.id`; app ownership should point at the domain account id, not the raw Supabase Auth id.
- This is now a React/Vite web app, not a Flutter app; do not run `dart format`.

## Verification

- Prefer `npm run build` for TypeScript and production-build checks.
- Add targeted tests when changing validation, routing, survey logic or database-facing behavior.
- For Supabase changes, verify migrations and RLS behavior for owner, non-owner and anonymous access.

## Product And Design Direction

- Build a professional, Scandinavian clean interface with muted Nordic nature colors.
- Prioritize practical admin workflows over marketing-style pages.
- Respondent flows should feel simple, mobile-friendly and calm.
