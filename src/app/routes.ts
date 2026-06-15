export const routes = {
  home: '/',
  login: '/login',
  security: '/security',
  dashboard: '/dashboard',
  surveys: '/surveys',
  newSurvey: '/surveys/new',
  editSurvey: (surveyId: string) => `/surveys/${surveyId}/edit`,
  profile: '/profile',
  results: (surveyId: string) => `/surveys/${surveyId}/results`,
  respondent: (slug: string) => `/s/${slug}`,
};
