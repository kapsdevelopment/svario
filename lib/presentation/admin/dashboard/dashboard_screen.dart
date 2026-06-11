import 'package:flutter/material.dart';

import '../../shared/widgets/svario_panel.dart';

class DashboardScreen extends StatelessWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const _AdminPage(
      title: 'Dashboard',
      children: [
        _MetricGrid(),
        SizedBox(height: 20),
        SvarioPanel(
          title: 'Aktive skjemaer',
          subtitle: '3 publiserte skjemaer',
          child: _DashboardList(),
        ),
      ],
    );
  }
}

class _MetricGrid extends StatelessWidget {
  const _MetricGrid();

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final columns = constraints.maxWidth > 900 ? 3 : 1;

        return GridView.count(
          crossAxisCount: columns,
          crossAxisSpacing: 16,
          mainAxisSpacing: 16,
          shrinkWrap: true,
          childAspectRatio: columns == 1 ? 4 : 2.4,
          physics: const NeverScrollableScrollPhysics(),
          children: const [
            SvarioPanel(title: 'Besvarelser', subtitle: '248 denne måneden'),
            SvarioPanel(title: 'Svarrate', subtitle: '71 % gjennomsnitt'),
            SvarioPanel(title: 'Publisert', subtitle: '3 aktive skjemaer'),
          ],
        );
      },
    );
  }
}

class _DashboardList extends StatelessWidget {
  const _DashboardList();

  @override
  Widget build(BuildContext context) {
    return const Column(
      children: [
        _DashboardRow(title: 'Medarbeiderpuls juni', value: '126 svar'),
        Divider(),
        _DashboardRow(title: 'Kursfeedback', value: '84 svar'),
        Divider(),
        _DashboardRow(title: 'Produktinnsikt Q3', value: '38 svar'),
      ],
    );
  }
}

class _DashboardRow extends StatelessWidget {
  const _DashboardRow({
    required this.title,
    required this.value,
  });

  final String title;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        children: [
          Expanded(child: Text(title)),
          Text(value),
        ],
      ),
    );
  }
}

class _AdminPage extends StatelessWidget {
  const _AdminPage({
    required this.title,
    required this.children,
  });

  final String title;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: ListView(
        padding: const EdgeInsets.all(28),
        children: [
          Text(title, style: Theme.of(context).textTheme.headlineMedium),
          const SizedBox(height: 24),
          ...children,
        ],
      ),
    );
  }
}
