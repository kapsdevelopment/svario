create policy "surveys authenticated read published"
on public.surveys
for select
to authenticated
using (app_private.is_survey_publicly_answerable(id));

create policy "survey sections authenticated read published"
on public.survey_sections
for select
to authenticated
using (app_private.is_survey_publicly_answerable(survey_id));

create policy "questions authenticated read published"
on public.questions
for select
to authenticated
using (app_private.is_survey_publicly_answerable(survey_id));

create policy "question options authenticated read published"
on public.question_options
for select
to authenticated
using (app_private.is_question_publicly_answerable(question_id));
