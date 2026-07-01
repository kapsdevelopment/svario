import { Suspense, useEffect, type ReactNode } from 'react';
import { createHashRouter, useLocation } from 'react-router-dom';

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
const DemoPage = lazyRoute(
  () => import('../presentation/public/demo/DemoPage'),
  'DemoPage',
);
const AboutPage = lazyRoute(
  () => import('../presentation/public/about/AboutPage'),
  'AboutPage',
);
const PrivacyPage = lazyRoute(
  () => import('../presentation/public/privacy/PrivacyPage'),
  'PrivacyPage',
);
const ProfilePage = lazyRoute(
  () => import('../presentation/admin/profile/ProfilePage'),
  'ProfilePage',
);
const JoinWorkspacePage = lazyRoute(
  () => import('../presentation/admin/workspaces/JoinWorkspacePage'),
  'JoinWorkspacePage',
);
const ResultsPage = lazyRoute(
  () => import('../presentation/admin/results/ResultsPage'),
  'ResultsPage',
);
const ResultsOverviewPage = lazyRoute(
  () => import('../presentation/admin/results/ResultsPage'),
  'ResultsOverviewPage',
);
const ResultsPresentationPage = lazyRoute(
  () => import('../presentation/admin/results/ResultsPage'),
  'ResultsPresentationPage',
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
const TrustCenterPage = lazyRoute(
  () => import('../presentation/public/trust/TrustCenterPage'),
  'TrustCenterPage',
);
const TrustDocumentPage = lazyRoute(
  () => import('../presentation/public/trust/TrustDocumentPage'),
  'TrustDocumentPage',
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
    path: routes.demo,
    element: page(<DemoPage />),
    errorElement: <RouteErrorPage />,
  },
  {
    path: routes.about,
    element: page(<AboutPage />),
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
    path: routes.trust,
    element: page(<TrustCenterPage />),
    errorElement: <RouteErrorPage />,
  },
  {
    path: '/trust/:documentSlug',
    element: page(<TrustDocumentPage />),
    errorElement: <RouteErrorPage />,
  },
  {
    path: '/surveys/:surveyId/results/present',
    element: (
      <RequireAuth>
        {page(<ResultsPresentationPage />)}
      </RequireAuth>
    ),
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
        path: routes.resultsHome,
        element: page(<ResultsOverviewPage />),
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
      {
        path: '/join/:token',
        element: page(<JoinWorkspacePage />),
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
      <ScrollToTop />
      {element}
    </Suspense>
  );
}

function ScrollToTop() {
  const location = useLocation();

  useEffect(() => {
    if (location.hash) {
      return;
    }

    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [location.hash, location.pathname, location.search]);

  return null;
}
