import { lazy, Suspense, type ReactNode } from 'react';
import { createHashRouter, Navigate } from 'react-router-dom';

import { AppShell } from '../presentation/shared/layout/AppShell';
import { RequireAuth } from './RequireAuth';
import { routes } from './routes';

const DashboardPage = lazy(() =>
  import('../presentation/admin/dashboard/DashboardPage').then((module) => ({
    default: module.DashboardPage,
  })),
);
const LoginPage = lazy(() =>
  import('../presentation/admin/auth/LoginPage').then((module) => ({
    default: module.LoginPage,
  })),
);
const ProfilePage = lazy(() =>
  import('../presentation/admin/profile/ProfilePage').then((module) => ({
    default: module.ProfilePage,
  })),
);
const ResultsPage = lazy(() =>
  import('../presentation/admin/results/ResultsPage').then((module) => ({
    default: module.ResultsPage,
  })),
);
const SurveyCreatePage = lazy(() =>
  import('../presentation/admin/surveys/SurveyCreatePage').then((module) => ({
    default: module.SurveyCreatePage,
  })),
);
const SurveyListPage = lazy(() =>
  import('../presentation/admin/surveys/SurveyListPage').then((module) => ({
    default: module.SurveyListPage,
  })),
);
const RespondentPage = lazy(() =>
  import('../presentation/public/respondent/RespondentPage').then((module) => ({
    default: module.RespondentPage,
  })),
);

export const router = createHashRouter([
  {
    path: '/',
    element: <Navigate to={routes.dashboard} replace />,
  },
  {
    path: routes.login,
    element: page(<LoginPage />),
  },
  {
    element: (
      <RequireAuth>
        <AppShell />
      </RequireAuth>
    ),
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
  },
]);

function page(element: ReactNode) {
  return (
    <Suspense fallback={<div className="route-loading">Laster...</div>}>
      {element}
    </Suspense>
  );
}
