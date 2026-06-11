import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:svario/application/config/app_config_provider.dart';
import 'package:svario/app/svario_app.dart';
import 'package:svario/infrastructure/config/app_config.dart';

void main() {
  testWidgets('shows the Svario dashboard shell', (tester) async {
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          appConfigProvider.overrideWithValue(
            const AppConfig(
              supabaseUrl: null,
              supabasePublishableKey: null,
            ),
          ),
        ],
        child: const SvarioApp(),
      ),
    );

    await tester.pumpAndSettle();

    expect(find.text('Svario'), findsWidgets);
    expect(find.text('Dashboard'), findsWidgets);
    expect(find.text('Besvarelser'), findsOneWidget);
  });
}
