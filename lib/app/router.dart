import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../presentation/admin/auth/login_screen.dart';
import '../presentation/admin/dashboard/dashboard_screen.dart';
import '../presentation/admin/profile/profile_screen.dart';
import '../presentation/admin/results/results_screen.dart';
import '../presentation/admin/surveys/survey_create_screen.dart';
import '../presentation/admin/surveys/survey_list_screen.dart';
import '../presentation/public/respondent/respondent_screen.dart';
import '../presentation/shared/layout/svario_shell.dart';

abstract final class AppRoutes {
  static const login = '/login';
  static const dashboard = '/dashboard';
  static const surveys = '/surveys';
  static const newSurvey = '/surveys/new';
  static const profile = '/profile';

  static String results(String surveyId) => '/surveys/$surveyId/results';
  static String respondent(String slug) => '/s/$slug';
}

final routerProvider = Provider<GoRouter>((ref) {
  return GoRouter(
    initialLocation: AppRoutes.dashboard,
    routes: [
      GoRoute(
        path: AppRoutes.login,
        builder: (context, state) => const LoginScreen(),
      ),
      ShellRoute(
        builder: (context, state, child) {
          return SvarioShell(
            currentPath: state.uri.path,
            child: child,
          );
        },
        routes: [
          GoRoute(
            path: AppRoutes.dashboard,
            builder: (context, state) => const DashboardScreen(),
          ),
          GoRoute(
            path: AppRoutes.surveys,
            builder: (context, state) => const SurveyListScreen(),
          ),
          GoRoute(
            path: AppRoutes.newSurvey,
            builder: (context, state) => const SurveyCreateScreen(),
          ),
          GoRoute(
            path: '/surveys/:surveyId/results',
            builder: (context, state) {
              return ResultsScreen(
                surveyId: state.pathParameters['surveyId'] ?? '',
              );
            },
          ),
          GoRoute(
            path: AppRoutes.profile,
            builder: (context, state) => const ProfileScreen(),
          ),
        ],
      ),
      GoRoute(
        path: '/s/:slug',
        builder: (context, state) {
          return RespondentScreen(
            slug: state.pathParameters['slug'] ?? '',
          );
        },
      ),
    ],
  );
});
