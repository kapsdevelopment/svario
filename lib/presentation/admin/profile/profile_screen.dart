import 'package:flutter/material.dart';

import '../../shared/widgets/svario_panel.dart';

class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: ListView(
        padding: const EdgeInsets.all(28),
        children: [
          Text(
            'Min profil',
            style: Theme.of(context).textTheme.headlineMedium,
          ),
          const SizedBox(height: 24),
          const SvarioPanel(
            title: 'Konto',
            subtitle: 'ken@example.com',
          ),
        ],
      ),
    );
  }
}
