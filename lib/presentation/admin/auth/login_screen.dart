import 'package:flutter/material.dart';

import '../../shared/widgets/svario_panel.dart';

class LoginScreen extends StatelessWidget {
  const LoginScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 420),
          child: SvarioPanel(
            title: 'Logg inn',
            subtitle: 'Svario admin',
            child: Column(
              children: [
                const TextField(
                  decoration: InputDecoration(labelText: 'E-post'),
                ),
                const SizedBox(height: 12),
                const TextField(
                  obscureText: true,
                  decoration: InputDecoration(labelText: 'Passord'),
                ),
                const SizedBox(height: 18),
                SizedBox(
                  width: double.infinity,
                  child: FilledButton(
                    onPressed: () {},
                    child: const Text('Fortsett'),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
