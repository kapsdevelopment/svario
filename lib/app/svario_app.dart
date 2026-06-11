import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'router.dart';
import 'svario_theme.dart';

class SvarioApp extends ConsumerWidget {
  const SvarioApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final router = ref.watch(routerProvider);

    return MaterialApp.router(
      title: 'Svario',
      debugShowCheckedModeBanner: false,
      theme: SvarioTheme.light(),
      routerConfig: router,
    );
  }
}
