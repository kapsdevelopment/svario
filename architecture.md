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

## Practical Rules

- Prefer naming files after the use case or responsibility they serve.
- Keep shared code genuinely shared; do not create `shared` or `utils` code before there is real reuse.
- Keep Supabase-specific types out of domain models.
- When a feature grows, split vertically by capability inside each layer before creating broad generic files.
