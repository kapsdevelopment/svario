import { lazy, Suspense, type ReactNode } from 'react';
import { createHashRouter } from 'react-router-dom';

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
const LandingPage = lazy(() =>
  import('../presentation/public/landing/LandingPage').then((module) => ({
    default: module.LandingPage,
  })),
);
const PrivacyPage = lazy(() =>
  import('../presentation/public/privacy/PrivacyPage').then((module) => ({
    default: module.PrivacyPage,
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
const SurveyEditorPage = lazy(() =>
  import('../presentation/admin/surveys/SurveyEditorPage').then((module) => ({
    default: module.SurveyEditorPage,
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
const SecurityPage = lazy(() =>
  import('../presentation/public/security/SecurityPage').then((module) => ({
    default: module.SecurityPage,
  })),
);

export const router = createHashRouter([
  {
    path: '/',
    element: page(<LandingPage />),
  },
  {
    path: routes.login,
    element: page(<LoginPage />),
  },
  {
    path: routes.privacy,
    element: page(<PrivacyPage />),
  },
  {
    path: routes.security,
    element: page(<SecurityPage />),
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
  },
]);

function page(element: ReactNode) {
  return (
    <Suspense fallback={<div className="route-loading">Laster...</div>}>
      {element}
    </Suspense>
  );
}
