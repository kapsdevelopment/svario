export const routes = {
  login: '/login',
  dashboard: '/dashboard',
  surveys: '/surveys',
  newSurvey: '/surveys/new',
  profile: '/profile',
  results: (surveyId: string) => `/surveys/${surveyId}/results`,
  respondent: (slug: string) => `/s/${slug}`,
};
