# Svario Security And Trust Plan

Svario is pre-production. This document is a working security and trust plan for
the product, the codebase and future customer-facing documentation.

## Current Architecture

- Frontend: React/Vite web app, deployed as a static site on GitHub Pages.
- Backend: Supabase hosted Postgres, Auth, Data API and controlled RPC
  functions.
- Primary region: Supabase North EU, Stockholm.
- Authentication: Supabase Auth with email/password and magic link for admin
  users.
- Authorization model: Svario keeps the domain account/user separate from the
  Supabase Auth user id. Application ownership points at the Svario domain
  account id.

## Data Categories

Svario currently stores:

- Admin account data: email, profile fields and auth identity mappings.
- Survey data: survey title, description, status, time window, response mode,
  sections, questions, options and scale configuration.
- Response data: submitted answers, timestamps and optional respondent identity
  for identified surveys.
- Anonymous survey responses: stored without respondent name, respondent email
  or domain account reference.

Secrets, service-role keys, database passwords and production credentials must
never be committed to the repository. Local secrets belong in `.env.local`.

## Access Control

- Row Level Security must remain enabled on all app-owned public tables.
- Authenticated admins should only read and mutate data owned by their Svario
  domain account.
- Public respondent access should stay narrow: published surveys can be read
  through explicit public policies, and response submission should go through
  controlled RPC logic.
- Security-definer functions must stay in the private `app_private` schema, not
  in an exposed schema.
- The browser app may use only browser-safe Supabase values, such as the project
  URL and publishable key. Service-role keys must never be exposed client-side.

## Survey Integrity

- Survey structure is locked after the first submitted response.
- The database enforces this with triggers on sections, questions and question
  options.
- Survey identity fields that affect result interpretation or public links are
  locked after responses exist.
- Status and time-window operations can remain available when they do not alter
  historical response meaning.

## Authentication Controls

Implemented:

- Email/password login for admins.
- Magic link login for admins.
- Password change from the profile screen.
- Production redirect URL configuration for `https://svario.no`.

Before production:

- Verify email confirmation behavior.
- Decide whether MFA is required for admins.
- Decide final password policy based on actual risk, magic link usage, rate
  limits and MFA.
- Revisit Supabase Passkeys when beta limitations, RP ID, allowed origins and
  fallback flow are understood.

## Privacy And Deletion

Svario supports practical deletion and export flows:

- Admins must be able to export survey results.
- Admins can delete a single survey, including its responses and
  results, after an explicit confirmation.
- Admins can delete their account, including all surveys,
  responses, results and profile data, after a stronger confirmation step.
- Retention rules must be documented before production use with real customers.
- Anonymous surveys must not store respondent-identifying fields.

Account deletion needs careful implementation because deleting a Supabase Auth
user does not automatically invalidate every existing access token immediately.
The app should sign the user out after deletion and keep token lifetimes
appropriate for the sensitivity of the product.

## Operational Controls

Before production, Svario should have:

- A documented backup and restore expectation based on the selected Supabase
  plan.
- A basic incident response routine for exposed keys, accidental data exposure,
  wrong access, suspicious activity and deletion mistakes.
- A clear owner for rotating Supabase keys and GitHub repository secrets.
- Supabase security advisors/checks run and reviewed.
- RLS tests for owner, non-owner and anonymous access.
- Manual browser checks for admin and respondent flows.

## Third Parties

Current planned providers:

- Supabase: Auth, Postgres, API/RPC and managed backend infrastructure.
- GitHub Pages: static frontend hosting and deployment.
- GitHub Actions: build and deployment automation.

Before production, confirm and document:

- Supabase DPA status.
- Supabase subprocessors.
- GitHub/GitHub Pages role in processing and hosting.
- Region and backup implications.
- Customer responsibilities when they collect respondent data.

## Public Trust Page Direction

The public security/trust page should remain practical and specific:

- Explain what Svario stores and what it deliberately does not store.
- Explain anonymous versus identified surveys in plain language.
- Explain that browser-visible frontend code and publishable keys are not
  secrets.
- Explain that access control is enforced in Postgres/RLS, not only in the UI.
- Avoid claiming certifications, guarantees or compliance until they are
  verified.

## Reference Links

- Supabase product security guide:
  https://supabase.com/docs/guides/security/product-security
- Supabase production checklist:
  https://supabase.com/docs/guides/deployment/going-into-prod
- Supabase Row Level Security:
  https://supabase.com/docs/guides/database/postgres/row-level-security
- Supabase Auth password security:
  https://supabase.com/docs/guides/auth/password-security
