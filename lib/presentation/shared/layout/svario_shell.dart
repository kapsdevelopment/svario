import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../app/router.dart';

class SvarioShell extends StatelessWidget {
  const SvarioShell({
    required this.currentPath,
    required this.child,
    super.key,
  });

  final String currentPath;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    final isCompact = MediaQuery.sizeOf(context).width < 760;

    if (isCompact) {
      return Scaffold(
        appBar: AppBar(title: const Text('Svario')),
        body: child,
        bottomNavigationBar: NavigationBar(
          selectedIndex: _selectedIndex(currentPath),
          onDestinationSelected: (index) => context.go(_items[index].path),
          destinations: [
            for (final item in _items)
              NavigationDestination(
                icon: Icon(item.icon),
                selectedIcon: Icon(item.selectedIcon),
                label: item.label,
              ),
          ],
        ),
      );
    }

    return Scaffold(
      body: Row(
        children: [
          NavigationRail(
            extended: true,
            selectedIndex: _selectedIndex(currentPath),
            onDestinationSelected: (index) => context.go(_items[index].path),
            leading: const Padding(
              padding: EdgeInsets.fromLTRB(16, 20, 16, 28),
              child: _BrandMark(),
            ),
            destinations: [
              for (final item in _items)
                NavigationRailDestination(
                  icon: Icon(item.icon),
                  selectedIcon: Icon(item.selectedIcon),
                  label: Text(item.label),
                ),
            ],
          ),
          const VerticalDivider(width: 1),
          Expanded(child: child),
        ],
      ),
    );
  }

  int _selectedIndex(String path) {
    final index = _items.indexWhere((item) {
      if (item.path == AppRoutes.surveys) {
        return path.startsWith(AppRoutes.surveys);
      }
      return path == item.path;
    });

    return index < 0 ? 0 : index;
  }
}

class _BrandMark extends StatelessWidget {
  const _BrandMark();

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Container(
          width: 32,
          height: 32,
          alignment: Alignment.center,
          decoration: BoxDecoration(
            color: Theme.of(context).colorScheme.primary,
            borderRadius: BorderRadius.circular(8),
          ),
          child: const Text(
            'S',
            style: TextStyle(
              color: Colors.white,
              fontWeight: FontWeight.w800,
            ),
          ),
        ),
        const SizedBox(width: 12),
        Text(
          'Svario',
          style: Theme.of(context).textTheme.titleLarge,
        ),
      ],
    );
  }
}

class _ShellItem {
  const _ShellItem({
    required this.label,
    required this.path,
    required this.icon,
    required this.selectedIcon,
  });

  final String label;
  final String path;
  final IconData icon;
  final IconData selectedIcon;
}

const _items = [
  _ShellItem(
    label: 'Dashboard',
    path: AppRoutes.dashboard,
    icon: Icons.space_dashboard_outlined,
    selectedIcon: Icons.space_dashboard,
  ),
  _ShellItem(
    label: 'Skjemaer',
    path: AppRoutes.surveys,
    icon: Icons.assignment_outlined,
    selectedIcon: Icons.assignment,
  ),
  _ShellItem(
    label: 'Profil',
    path: AppRoutes.profile,
    icon: Icons.person_outline,
    selectedIcon: Icons.person,
  ),
];
