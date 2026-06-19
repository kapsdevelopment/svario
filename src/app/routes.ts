export const routes = {
  home: '/',
  login: '/login',
  privacy: '/privacy',
  security: '/security',
  dashboard: '/dashboard',
  surveys: '/surveys',
  newSurvey: '/surveys/new',
  editSurvey: (surveyId: string) => `/surveys/${surveyId}/edit`,
  profile: '/profile',
  results: (surveyId: string) => `/surveys/${surveyId}/results`,
  resultsPresentation: (surveyId: string) =>
    `/surveys/${surveyId}/results/present`,
  joinWorkspace: (token: string) => `/join/${token}`,
  respondent: (slug: string) => `/s/${slug}`,
};
