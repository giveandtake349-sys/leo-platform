import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/theme/app_theme.dart';
import '../providers/jobs_provider.dart';
import '../services/jobs_service.dart';

class JobDetailScreen extends ConsumerWidget {
  final String jobId;
  const JobDetailScreen({super.key, required this.jobId});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final job = ref.watch(jobDetailProvider(jobId));
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(title: const Text('Job Details')),
      body: job.when(
        loading: () => const Center(child: CircularProgressIndicator(color: AppColors.primary)),
        error: (e, _) => Center(child: Text('Error: $e', style: const TextStyle(color: AppColors.error))),
        data: (j) => SingleChildScrollView(
          padding: const EdgeInsets.all(20),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            // Header
            Row(children: [
              Container(width: 56, height: 56, decoration: BoxDecoration(color: AppColors.primary.withOpacity(0.15), borderRadius: BorderRadius.circular(14)),
                child: const Icon(Icons.business, color: AppColors.primary, size: 28)),
              const SizedBox(width: 16),
              Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(j.title, style: const TextStyle(color: AppColors.textPrimary, fontSize: 18, fontWeight: FontWeight.w700)),
                Text(j.companyName ?? '', style: const TextStyle(color: AppColors.textSecondary, fontSize: 13)),
              ])),
              if (j.isPremium)
                Container(padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(color: AppColors.premium.withOpacity(0.1), borderRadius: BorderRadius.circular(8), border: Border.all(color: AppColors.premium.withOpacity(0.3))),
                  child: const Text('Premium', style: TextStyle(color: AppColors.premium, fontSize: 11, fontWeight: FontWeight.w600))),
            ]),
            const SizedBox(height: 20),
            // Stats chips
            Wrap(spacing: 8, runSpacing: 8, children: [
              _InfoChip(icon: Icons.attach_money, label: j.salaryDisplay),
              _InfoChip(icon: Icons.location_on_outlined, label: j.district ?? 'Not specified'),
              _InfoChip(icon: Icons.work_outline, label: j.jobType.replaceAll('_', ' ')),
              _InfoChip(icon: Icons.computer_outlined, label: j.workMode),
            ]),
            const SizedBox(height: 24),
            const Text('Job Description', style: TextStyle(color: AppColors.textPrimary, fontSize: 15, fontWeight: FontWeight.w600)),
            const SizedBox(height: 10),
            Text(j.description, style: const TextStyle(color: AppColors.textSecondary, fontSize: 14, height: 1.6)),
            const SizedBox(height: 80),
          ]),
        ),
      ),
      bottomNavigationBar: job.maybeWhen(
        data: (_) => SafeArea(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(20, 8, 20, 16),
            child: Row(children: [
              OutlinedButton(
                onPressed: () {},
                style: OutlinedButton.styleFrom(
                  side: const BorderSide(color: AppColors.primary),
                  foregroundColor: AppColors.primary,
                  minimumSize: const Size(52, 52),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                child: const Icon(Icons.chat_bubble_outline),
              ),
              const SizedBox(width: 12),
              Expanded(child: ElevatedButton(
                onPressed: () async {
                  try {
                    await ref.read(jobsServiceProvider).apply(jobId);
                    if (context.mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Applied successfully!')));
                    }
                  } catch (e) {
                    if (context.mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e')));
                    }
                  }
                },
                child: const Text('Apply Now'),
              )),
            ]),
          ),
        ),
        orElse: () => null,
      ),
    );
  }
}

class _InfoChip extends StatelessWidget {
  final IconData icon;
  final String label;
  const _InfoChip({required this.icon, required this.label});
  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
    decoration: BoxDecoration(color: AppColors.inputFill, borderRadius: BorderRadius.circular(8), border: Border.all(color: AppColors.border)),
    child: Row(mainAxisSize: MainAxisSize.min, children: [
      Icon(icon, color: AppColors.textMuted, size: 14),
      const SizedBox(width: 6),
      Text(label, style: const TextStyle(color: AppColors.textSecondary, fontSize: 12)),
    ]),
  );
}
