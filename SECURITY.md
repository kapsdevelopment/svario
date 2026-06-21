# Svario Security Overview

This document describes the main security and trust principles for Svario.
Detailed internal backlog items, risk decisions and operational runbooks should
live in private planning systems, not in this public repository.

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

Authentication requirements are reviewed as the product, customer usage and
risk model evolve. Stronger admin controls can be introduced when the risk
profile requires them.

## Privacy And Deletion

Svario supports practical deletion and export flows:

- Admins must be able to export survey results.
- Admins can delete a single survey, including its responses and
  results, after an explicit confirmation.
- Admins can delete their account, including all surveys,
  responses, results and profile data, after a stronger confirmation step.
- Retention rules should be documented when customers use Svario with real
  respondent data.
- Anonymous surveys must not store respondent-identifying fields.

Account deletion needs careful implementation because deleting a Supabase Auth
user does not automatically invalidate every existing access token immediately.
The app should sign the user out after deletion and keep token lifetimes
appropriate for the sensitivity of the product.

## Retention Routine

Svario has product-level retention support for survey responses:

- Survey owners choose a retention period when personal data is expected.
- Submitted responses get a calculated `retention_due_at` timestamp.
- A scheduled database job processes due responses in batches.
- The default action is to delete the full response tree.
- If anonymization is used, respondent identity, account reference and metadata
  are removed before the response is kept as anonymous aggregate data.
- Deletion, anonymization and retention extensions are logged as privacy events.
- Extending retention for existing responses requires a reason.

Operationally, backup and restore behavior must be checked against the selected
Supabase plan. A restore can reintroduce data that was previously deleted or
anonymized, so restored data must be reviewed before it is made available to
customers.

## Incident Response

Svario should handle security and privacy incidents through a simple documented
routine:

1. Register the incident with time, source, affected systems and initial severity.
2. Contain the issue by disabling access, stopping the affected flow, rotating
   secrets or rolling back a deploy when needed.
3. Investigate which accounts, workspaces, surveys, responses and providers may
   be affected.
4. Assess whether the issue affects confidentiality, integrity, availability,
   deletion or retention.
5. Notify affected customers without undue delay when customer data may be
   affected.
6. Give customers enough facts to assess their own duties toward respondents or
   supervisory authorities.
7. Document timeline, actions, communications and decisions.
8. Close only after corrective measures are completed and follow-up work is
   tracked.

High-attention incidents include exposed service-role keys or database
passwords, RLS/RPC mistakes, wrong cross-workspace access, anonymous exports
containing identifying data, retention failures, backup restore side effects and
suspicious admin or provider access.

## Operational Controls

Svario should maintain:

- Documented backup and restore expectations based on the selected Supabase
  plan.
- A security incident response routine for exposed keys, accidental data exposure,
  wrong access, suspicious activity and deletion mistakes.
- A clear owner for rotating Supabase keys and GitHub repository secrets.
- Periodic platform security reviews.
- Access-control checks for relevant user roles and anonymous flows.
- Manual browser checks for admin and respondent flows.

## Third Parties

Current planned providers:

- Supabase: Auth, Postgres, API/RPC and managed backend infrastructure.
- GitHub Pages: static frontend hosting and deployment.
- GitHub Actions: build and deployment automation.

Customer-facing third-party documentation should cover:

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
