import 'package:flutter/material.dart';

import '../../shared/widgets/svario_panel.dart';

class ResultsScreen extends StatelessWidget {
  const ResultsScreen({
    required this.surveyId,
    super.key,
  });

  final String surveyId;

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: ListView(
        padding: const EdgeInsets.all(28),
        children: [
          Text(
            'Resultater',
            style: Theme.of(context).textTheme.headlineMedium,
          ),
          const SizedBox(height: 8),
          Text('Skjema $surveyId'),
          const SizedBox(height: 24),
          const SvarioPanel(
            title: 'Svarfordeling',
            subtitle: 'Likert 1-5 · gjennomsnitt 4,2',
            child: _BarPreview(),
          ),
          const SizedBox(height: 12),
          const SvarioPanel(
            title: 'Eksport',
            subtitle: 'CSV og PDF',
          ),
        ],
      ),
    );
  }
}

class _BarPreview extends StatelessWidget {
  const _BarPreview();

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 140,
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          for (final value in [42.0, 62.0, 88.0, 108.0, 74.0]) ...[
            Expanded(
              child: Container(
                height: value,
                decoration: BoxDecoration(
                  color: Theme.of(context).colorScheme.primary,
                  borderRadius: BorderRadius.circular(6),
                ),
              ),
            ),
            const SizedBox(width: 8),
          ],
        ],
      ),
    );
  }
}
