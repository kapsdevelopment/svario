import 'package:flutter/material.dart';

import '../../shared/widgets/svario_panel.dart';

class SurveyCreateScreen extends StatelessWidget {
  const SurveyCreateScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: ListView(
        padding: const EdgeInsets.all(28),
        children: [
          Text(
            'Nytt skjema',
            style: Theme.of(context).textTheme.headlineMedium,
          ),
          const SizedBox(height: 24),
          SvarioPanel(
            title: 'Grunninfo',
            child: Column(
              children: [
                const TextField(
                  decoration: InputDecoration(labelText: 'Tittel'),
                ),
                const SizedBox(height: 12),
                const TextField(
                  minLines: 3,
                  maxLines: 5,
                  decoration: InputDecoration(labelText: 'Beskrivelse'),
                ),
                const SizedBox(height: 18),
                Align(
                  alignment: Alignment.centerRight,
                  child: FilledButton.icon(
                    onPressed: () {},
                    icon: const Icon(Icons.save_outlined),
                    label: const Text('Lagre utkast'),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
