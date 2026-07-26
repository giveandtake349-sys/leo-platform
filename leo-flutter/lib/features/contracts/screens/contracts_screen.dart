import 'package:flutter/material.dart';
import '../../../core/theme/app_theme.dart';

class ContractsScreen extends StatelessWidget {
  const ContractsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Contracts')),
      body: DefaultTabController(
        length: 3,
        child: Column(children: [
          const TabBar(tabs: [
            Tab(text: 'Active'),
            Tab(text: 'Pending'),
            Tab(text: 'Completed'),
          ]),
          Expanded(
            child: TabBarView(children: [
              _ContractList(status: 'active'),
              _ContractList(status: 'pending_payment'),
              _ContractList(status: 'completed'),
            ]),
          ),
        ]),
      ),
    );
  }
}

class _ContractList extends StatelessWidget {
  final String status;
  const _ContractList({required this.status});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
        Icon(Icons.description_outlined, color: AppColors.textMuted, size: 48),
        const SizedBox(height: 12),
        Text(
          'No ${status.replaceAll('_', ' ')} contracts',
          style: const TextStyle(color: AppColors.textMuted),
        ),
      ]),
    );
  }
}
