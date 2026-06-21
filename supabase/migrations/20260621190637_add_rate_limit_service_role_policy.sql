create policy "survey submission rate limits service role all"
on app_private.survey_submission_rate_limits
for all
to service_role
using (true)
with check (true);
