import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/theme/app_theme.dart';
import '../../auth/providers/auth_provider.dart';

class WorkerDashboardScreen extends ConsumerWidget {
  const WorkerDashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Dashboard'),
        actions: [
          IconButton(icon: const Icon(Icons.settings_outlined), onPressed: () {}),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          // Profile card
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(color: AppColors.card, borderRadius: BorderRadius.circular(16), border: Border.all(color: AppColors.border, width: 0.5)),
            child: Column(children: [
              Row(children: [
                // Avatar
                CircleAvatar(radius: 28, backgroundColor: AppColors.primary.withOpacity(0.2),
                  child: const Icon(Icons.person, color: AppColors.primary, size: 32)),
                const SizedBox(width: 14),
                Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  const Text('Md. Arif Hossain', style: TextStyle(color: AppColors.textPrimary, fontSize: 16, fontWeight: FontWeight.w700)),
                  Row(children: const [
                    Icon(Icons.location_on_outlined, color: AppColors.textMuted, size: 12),
                    SizedBox(width: 2),
                    Text('Dhaka, Bangladesh', style: TextStyle(color: AppColors.textMuted, fontSize: 12)),
                  ]),
                  const SizedBox(height: 6),
                  // Open to work toggle
                  Row(children: [
                    const Text('Open to Work', style: TextStyle(color: AppColors.textSecondary, fontSize: 12)),
                    const SizedBox(width: 8),
                    Transform.scale(scale: 0.8,
                      child: Switch(value: true, onChanged: (_) {}, activeColor: AppColors.primary, inactiveThumbColor: AppColors.textMuted)),
                  ]),
                ])),
              ]),
              const SizedBox(height: 16),
              Row(children: [
                // Profile strength
                Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  const Text('Profile Strength', style: TextStyle(color: AppColors.textSecondary, fontSize: 11)),
                  const SizedBox(height: 6),
                  Stack(alignment: Alignment.center, children: [
                    SizedBox(width: 56, height: 56,
                      child: CircularProgressIndicator(value: 0.85, color: AppColors.primary, backgroundColor: AppColors.border, strokeWidth: 6)),
                    const Text('85%', style: TextStyle(color: AppColors.textPrimary, fontSize: 13, fontWeight: FontWeight.w700)),
                  ]),
                  const SizedBox(height: 4),
                  const Text('Complete Profile', style: TextStyle(color: AppColors.primary, fontSize: 10)),
                ])),
                const SizedBox(width: 12),
                // Available balance
                Expanded(flex: 2, child: Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(color: AppColors.inputFill, borderRadius: BorderRadius.circular(12)),
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    const Text('Available Balance', style: TextStyle(color: AppColors.textMuted, fontSize: 11)),
                    const SizedBox(height: 4),
                    const Text('৳18,450', style: TextStyle(color: AppColors.textPrimary, fontSize: 20, fontWeight: FontWeight.w700)),
                    const SizedBox(height: 10),
                    SizedBox(
                      width: double.infinity, height: 34,
                      child: ElevatedButton(
                        onPressed: () {},
                        style: ElevatedButton.styleFrom(padding: EdgeInsets.zero, textStyle: const TextStyle(fontSize: 12)),
                        child: const Text('Withdraw'),
                      ),
                    ),
                  ]),
                )),
              ]),
            ]),
          ),
          const SizedBox(height: 16),
          // Stats row
          Row(children: [
            _StatCard(label: 'Applied Jobs', value: '18'),
            const SizedBox(width: 8),
            _StatCard(label: 'Active Contracts', value: '3', highlight: true),
            const SizedBox(width: 8),
            _StatCard(label: 'Completed Jobs', value: '24'),
          ]),
          const SizedBox(height: 8),
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(color: AppColors.card, borderRadius: BorderRadius.circular(12), border: Border.all(color: AppColors.border, width: 0.5)),
            child: Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: const [
              Text('Total Earnings', style: TextStyle(color: AppColors.textSecondary, fontSize: 13)),
              Text('৳1,24,500', style: TextStyle(color: AppColors.primary, fontSize: 18, fontWeight: FontWeight.w700)),
            ]),
          ),
          const SizedBox(height: 20),
          // Recommended jobs
          Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
            const Text('Recommended Jobs for You', style: TextStyle(color: AppColors.textPrimary, fontSize: 14, fontWeight: FontWeight.w600)),
            TextButton(onPressed: () {}, child: const Text('View All', style: TextStyle(color: AppColors.primary, fontSize: 12))),
          ]),
          const SizedBox(height: 10),
          SizedBox(
            height: 150,
            child: ListView(scrollDirection: Axis.horizontal, children: [
              _MiniJobCard(title: 'Web Developer', company: 'SoftTech Ltd.', location: 'Remote', salary: '৳40,000-60,000', isPremium: false),
              const SizedBox(width: 10),
              _MiniJobCard(title: 'UI/UX Designer', company: 'Creative Agency', location: 'Dhaka', salary: '৳30,000-45,000', isPremium: true),
              const SizedBox(width: 10),
              _MiniJobCard(title: 'Digital Marketer', company: 'Brandly Ltd.', location: 'Remote', salary: '৳25,000-35,000', isPremium: false),
            ]),
          ),
        ]),
      ),
    );
  }
}

class _StatCard extends StatelessWidget {
  final String label, value;
  final bool highlight;
  const _StatCard({required this.label, required this.value, this.highlight = false});
  @override
  Widget build(BuildContext context) => Expanded(child: Container(
    padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 10),
    decoration: BoxDecoration(
      color: highlight ? AppColors.primary.withOpacity(0.1) : AppColors.card,
      borderRadius: BorderRadius.circular(12),
      border: Border.all(color: highlight ? AppColors.primary.withOpacity(0.3) : AppColors.border, width: 0.5),
    ),
    child: Column(children: [
      Text(value, style: TextStyle(color: highlight ? AppColors.primary : AppColors.textPrimary, fontSize: 20, fontWeight: FontWeight.w700)),
      const SizedBox(height: 4),
      Text(label, textAlign: TextAlign.center, style: const TextStyle(color: AppColors.textMuted, fontSize: 10)),
    ]),
  ));
}

class _MiniJobCard extends StatelessWidget {
  final String title, company, location, salary;
  final bool isPremium;
  const _MiniJobCard({required this.title, required this.company, required this.location, required this.salary, required this.isPremium});
  @override
  Widget build(BuildContext context) => Container(
    width: 160, padding: const EdgeInsets.all(12),
    decoration: BoxDecoration(color: AppColors.card, borderRadius: BorderRadius.circular(14), border: Border.all(color: AppColors.border, width: 0.5)),
    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
        Expanded(child: Text(title, style: const TextStyle(color: AppColors.textPrimary, fontSize: 12, fontWeight: FontWeight.w600), maxLines: 1, overflow: TextOverflow.ellipsis)),
        if (isPremium) Container(
          padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 2),
          decoration: BoxDecoration(color: AppColors.premium.withOpacity(0.1), borderRadius: BorderRadius.circular(4)),
          child: const Text('P', style: TextStyle(color: AppColors.premium, fontSize: 9, fontWeight: FontWeight.w700)),
        ),
      ]),
      const SizedBox(height: 4),
      Text(company, style: const TextStyle(color: AppColors.textMuted, fontSize: 11), maxLines: 1, overflow: TextOverflow.ellipsis),
      const Spacer(),
      Text(location, style: const TextStyle(color: AppColors.textSecondary, fontSize: 11)),
      const SizedBox(height: 6),
      Text(salary, style: const TextStyle(color: AppColors.primary, fontSize: 11, fontWeight: FontWeight.w600)),
      const SizedBox(height: 8),
      SizedBox(width: double.infinity, height: 28, child: ElevatedButton(
        onPressed: () {},
        style: ElevatedButton.styleFrom(padding: EdgeInsets.zero, textStyle: const TextStyle(fontSize: 11)),
        child: const Text('Apply Now'),
      )),
    ]),
  );
}
