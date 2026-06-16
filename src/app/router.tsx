import { Suspense, type ReactNode } from 'react';
import { createHashRouter } from 'react-router-dom';

import { AppShell } from '../presentation/shared/layout/AppShell';
import { lazyRoute } from './lazyRoute';
import { RequireAuth } from './RequireAuth';
import { RouteErrorPage } from './RouteErrorPage';
import { routes } from './routes';

const DashboardPage = lazyRoute(
  () => import('../presentation/admin/dashboard/DashboardPage'),
  'DashboardPage',
);
const LoginPage = lazyRoute(
  () => import('../presentation/admin/auth/LoginPage'),
  'LoginPage',
);
const LandingPage = lazyRoute(
  () => import('../presentation/public/landing/LandingPage'),
  'LandingPage',
);
const PrivacyPage = lazyRoute(
  () => import('../presentation/public/privacy/PrivacyPage'),
  'PrivacyPage',
);
const ProfilePage = lazyRoute(
  () => import('../presentation/admin/profile/ProfilePage'),
  'ProfilePage',
);
const ResultsPage = lazyRoute(
  () => import('../presentation/admin/results/ResultsPage'),
  'ResultsPage',
);
const SurveyCreatePage = lazyRoute(
  () => import('../presentation/admin/surveys/SurveyCreatePage'),
  'SurveyCreatePage',
);
const SurveyEditorPage = lazyRoute(
  () => import('../presentation/admin/surveys/SurveyEditorPage'),
  'SurveyEditorPage',
);
const SurveyListPage = lazyRoute(
  () => import('../presentation/admin/surveys/SurveyListPage'),
  'SurveyListPage',
);
const RespondentPage = lazyRoute(
  () => import('../presentation/public/respondent/RespondentPage'),
  'RespondentPage',
);
const SecurityPage = lazyRoute(
  () => import('../presentation/public/security/SecurityPage'),
  'SecurityPage',
);

export const router = createHashRouter([
  {
    path: '/',
    element: page(<LandingPage />),
    errorElement: <RouteErrorPage />,
  },
  {
    path: routes.login,
    element: page(<LoginPage />),
    errorElement: <RouteErrorPage />,
  },
  {
    path: routes.privacy,
    element: page(<PrivacyPage />),
    errorElement: <RouteErrorPage />,
  },
  {
    path: routes.security,
    element: page(<SecurityPage />),
    errorElement: <RouteErrorPage />,
  },
  {
    element: (
      <RequireAuth>
        <AppShell />
      </RequireAuth>
    ),
    errorElement: <RouteErrorPage />,
    children: [
      {
        path: routes.dashboard,
        element: page(<DashboardPage />),
      },
      {
        path: routes.surveys,
        element: page(<SurveyListPage />),
      },
      {
        path: routes.newSurvey,
        element: page(<SurveyCreatePage />),
      },
      {
        path: '/surveys/:surveyId/edit',
        element: page(<SurveyEditorPage />),
      },
      {
        path: '/surveys/:surveyId/results',
        element: page(<ResultsPage />),
      },
      {
        path: routes.profile,
        element: page(<ProfilePage />),
      },
    ],
  },
  {
    path: '/s/:slug',
    element: page(<RespondentPage />),
    errorElement: <RouteErrorPage />,
  },
]);

function page(element: ReactNode) {
  return (
    <Suspense fallback={<div className="route-loading">Laster...</div>}>
      {element}
    </Suspense>
  );
}
