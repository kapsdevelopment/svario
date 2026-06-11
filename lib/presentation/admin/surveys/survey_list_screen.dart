import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../app/router.dart';
import '../../shared/widgets/svario_panel.dart';

class SurveyListScreen extends StatelessWidget {
  const SurveyListScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: ListView(
        padding: const EdgeInsets.all(28),
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  'Skjemaer',
                  style: Theme.of(context).textTheme.headlineMedium,
                ),
              ),
              FilledButton.icon(
                onPressed: () => context.go(AppRoutes.newSurvey),
                icon: const Icon(Icons.add),
                label: const Text('Nytt skjema'),
              ),
            ],
          ),
          const SizedBox(height: 24),
          SvarioPanel(
            title: 'Medarbeiderpuls juni',
            subtitle: 'Publisert · 126 svar · anonym',
            trailing: IconButton(
              tooltip: 'Resultater',
              onPressed: () => context.go(AppRoutes.results('demo')),
              icon: const Icon(Icons.bar_chart),
            ),
          ),
          const SizedBox(height: 12),
          const SvarioPanel(
            title: 'Kursfeedback',
            subtitle: 'Publisert · 84 svar · identifisert',
          ),
          const SizedBox(height: 12),
          const SvarioPanel(
            title: 'Produktinnsikt Q3',
            subtitle: 'Utkast · 0 svar',
          ),
        ],
      ),
    );
  }
}
