# Svario Architecture

Svario uses a horizontal layer structure in `lib/`, but files inside each layer should stay vertical and use-case oriented where that makes the code clearer.

## Layered Folders

- `app/` wires the app together: bootstrap, routing, theme and root widgets.
- `presentation/` contains Flutter UI: screens, widgets, forms and layouts.
- `application/` contains app coordination: Riverpod providers, controllers and use cases.
- `domain/` contains business concepts and rules without Flutter or Supabase dependencies.
- `data/` contains persistence concerns: repositories, DTOs, mappers and Supabase access.
- `infrastructure/` contains technical platform code such as config, logging and file helpers.

## Vertical Files Inside Horizontal Layers

The folder structure is horizontal, but files should usually be grouped around product areas and responsibilities:

```text
lib/
  presentation/
    admin/
      surveys/
        survey_list_screen.dart
        survey_editor_screen.dart
        question_editor_panel.dart

  application/
    surveys/
      survey_editor_controller.dart
      publish_survey_use_case.dart
      survey_list_provider.dart

  domain/
    surveys/
      survey.dart
      survey_section.dart
      survey_question.dart
      survey_validation.dart

  data/
    surveys/
      survey_repository.dart
      survey_dto.dart
      survey_mapper.dart
```

This keeps the architecture readable without turning files into broad buckets like `all_providers.dart`, `models.dart` or `utils.dart`.

## Dependency Direction

- `presentation` may depend on `application` and `domain`.
- `application` may depend on `domain`.
- `data` maps external storage/API shapes into `domain`.
- `app` may wire layers together.
- `domain` should not import Flutter, Supabase or UI code.

## Practical Rules

- Prefer naming files after the use case or responsibility they serve.
- Keep shared code genuinely shared; do not create `shared` or `utils` code before there is real reuse.
- Keep Supabase-specific types out of domain models.
- When a feature grows, split vertically by capability inside each layer before creating broad generic files.
