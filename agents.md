# Agents Guide

Svario is a Flutter and Supabase questionnaire app for iOS, Android and web. The backend is Supabase/Postgres with Row Level Security, and the web app is expected to be deployable to GitHub Pages.

## Working Rules

- Keep changes scoped to the current task and follow existing project patterns as they appear.
- Follow the layered architecture notes in `architecture.md`.
- Do not commit secrets, database passwords, service-role keys or real production credentials.
- Use `.env.local` for local secrets and keep `.env.example` safe and placeholder-only.
- Use Supabase migrations for database schema changes.
- Keep RLS enabled on app tables and prefer explicit policies over broad public access.
- Do not run `dart format` unless the user explicitly asks for it.

## Verification

- Prefer `flutter analyze` for quick static checks.
- Add targeted tests when changing validation, routing, survey logic or database-facing behavior.
- For Supabase changes, verify migrations and RLS behavior for owner, non-owner and anonymous access.

## Product And Design Direction

- Build a professional, Scandinavian clean interface with muted Nordic nature colors.
- Prioritize practical admin workflows over marketing-style pages.
- Respondent flows should feel simple, mobile-friendly and calm.
