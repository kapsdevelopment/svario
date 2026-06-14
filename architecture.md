# Svario Architecture

Svario uses a horizontal layer structure in `src/`, but files inside each layer should stay vertical and use-case oriented where that makes the code clearer.

## Layered Folders

- `app/` wires the app together: routing, providers and root app components.
- `presentation/` contains React UI: pages, components, forms and layouts.
- `application/` contains app coordination: hooks, controllers and use cases.
- `domain/` contains business concepts and rules without React or Supabase dependencies.
- `data/` contains persistence concerns: repositories, DTOs, mappers and Supabase access.
- `infrastructure/` contains technical platform code such as config, logging and file helpers.
- `styles/` contains global styling and design tokens until a component style strategy emerges.

## Vertical Files Inside Horizontal Layers

The folder structure is horizontal, but files should usually be grouped around product areas and responsibilities:

```text
src/
  presentation/
    admin/
      surveys/
        SurveyListPage.tsx
        SurveyEditorPage.tsx
        QuestionEditorPanel.tsx

  application/
    surveys/
      useSurveyEditor.ts
      publishSurvey.ts
      useSurveyList.ts

  domain/
    surveys/
      survey.ts
      surveySection.ts
      surveyQuestion.ts
      surveyValidation.ts

  data/
    surveys/
      surveyRepository.ts
      surveyDto.ts
      surveyMapper.ts
```

This keeps the architecture readable without turning files into broad buckets like `allHooks.ts`, `models.ts` or `utils.ts`.

## Dependency Direction

- `presentation` may depend on `application` and `domain`.
- `application` may depend on `domain`.
- `data` maps external storage/API shapes into `domain`.
- `app` may wire layers together.
- `domain` should not import React, Supabase or UI code.

## Domain User And Auth User

Svario keeps the app's domain user separate from the Supabase Auth user.

Supabase Auth answers "who authenticated this request?". The domain user answers "which Svario account owns this data?". Those are related, but they are not the same identity.

The database model should use two explicit identity layers:

```text
auth.users.id
  -> account_auth_users.auth_user_id
  -> account_auth_users.account_id
  -> app_users.user_id
```

Recommended foundation tables:

- `app_users`
  The root domain principal. `app_users.user_id` is the durable app/domain id.
- `account_auth_users`
  Maps a Supabase Auth identity to a Svario domain account.
- `accounts`
  Stores account state such as `active`, `blocked`, `pending_delete` or `deleted`.
- `profiles`
  Stores display/profile data for the domain account.
- `user_identities`
  Stores observed provider identities, such as email/password or magic-link email identity, for the domain account.

Business tables should reference the domain account, not `auth.users.id`. For example:

- `surveys.owner_account_id -> app_users.user_id`
- `survey_responses.created_by_account_id -> app_users.user_id` when a response is intentionally user-identified
- `survey_responses.respondent_email` or similar explicit respondent fields only when the survey requires identified responses

Anonymous respondent submissions should not create or require a domain account.

## Auth Bootstrap

Svario will primarily support magic-link and email/password auth for admins. After Supabase returns a valid session, the app should bootstrap the domain identity before doing real admin work:

1. Resolve or create the domain account with an RPC such as `ensure_account_initialized_v2()`.
2. Cache the returned `account_id` in the application/auth state.
3. Sync the active provider identity with an RPC such as `sync_my_identity(...)`.
4. Read `accounts.status` and only enter the admin app when the account is active.
5. Clear cached domain identity on sign-out.

RLS policies should prefer `current_account_id()` or equivalent helper logic for ownership checks. Use `auth.uid()` directly only at the auth boundary, such as mapping the current auth user to the domain account.

Provider identity sync must fail closed. If a provider/subject pair is already linked to another domain account, login should not silently move that identity. Explicit account merge/linking can be added later as its own product flow.

## Practical Rules

- Prefer naming files after the use case or responsibility they serve.
- Keep shared code genuinely shared; do not create `shared` or `utils` code before there is real reuse.
- Keep Supabase-specific types out of domain models.
- Keep `auth_user_id` and domain/account ids separate in database schema, code names and UI state.
- When a feature grows, split vertically by capability inside each layer before creating broad generic files.
