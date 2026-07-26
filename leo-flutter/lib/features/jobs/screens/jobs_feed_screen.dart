import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:timeago/timeago.dart' as timeago;
import '../../../core/theme/app_theme.dart';
import '../providers/jobs_provider.dart';
import '../models/job_model.dart';
import 'job_detail_screen.dart';

class JobsFeedScreen extends ConsumerStatefulWidget {
  const JobsFeedScreen({super.key});
  @override
  ConsumerState<JobsFeedScreen> createState() => _JobsFeedScreenState();
}

class _JobsFeedScreenState extends ConsumerState<JobsFeedScreen> {
  String? _selectedCategory;
  final _searchCtrl = TextEditingController();

  @override
  void dispose() { _searchCtrl.dispose(); super.dispose(); }

  @override
  Widget build(BuildContext context) {
    final feed = ref.watch(jobsFeedProvider({'categoryId': _selectedCategory, 'page': 1}));
    return Scaffold(
      appBar: AppBar(
        title: const Row(children: [
          Icon(Icons.location_on, color: AppColors.primary, size: 16),
          SizedBox(width: 4),
          Text('Dhaka, Bangladesh', style: TextStyle(fontSize: 14)),
          Icon(Icons.keyboard_arrow_down, color: AppColors.textSecondary, size: 16),
        ]),
        actions: [
          IconButton(icon: const Icon(Icons.notifications_outlined), onPressed: () {}),
          const SizedBox(width: 4),
        ],
      ),
      body: CustomScrollView(slivers: [
        // Search bar
        SliverToBoxAdapter(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              TextField(
                controller: _searchCtrl,
                decoration: const InputDecoration(
                  hintText: 'Search jobs, skills or categories',
                  prefixIcon: Icon(Icons.search, color: AppColors.textMuted),
                ),
              ),
              const SizedBox(height: 20),
              // Hero banner
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(colors: [AppColors.primary, AppColors.primaryDark]),
                  borderRadius: BorderRadius.circular(16),
                ),
                child: const Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text('Find the right job\nor the right talent\nfor your business',
                      style: TextStyle(color: Colors.black, fontSize: 16, fontWeight: FontWeight.w700, height: 1.4)),
                ]),
              ),
              const SizedBox(height: 20),
              const Text('Popular Categories', style: TextStyle(color: AppColors.textPrimary, fontSize: 15, fontWeight: FontWeight.w600)),
              const SizedBox(height: 12),
              // Category chips
              SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: Row(
                  children: ['Drivers', 'Labors', 'Delivery', 'Designers', 'IT & Tech', 'Marketing', 'Accounting'].map((cat) =>
                    GestureDetector(
                      onTap: () => setState(() => _selectedCategory = cat == _selectedCategory ? null : cat),
                      child: Container(
                        margin: const EdgeInsets.only(right: 8),
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                        decoration: BoxDecoration(
                          color: _selectedCategory == cat ? AppColors.primary : AppColors.card,
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(color: _selectedCategory == cat ? AppColors.primary : AppColors.border),
                        ),
                        child: Text(cat, style: TextStyle(
                          color: _selectedCategory == cat ? Colors.black : AppColors.textSecondary,
                          fontSize: 12, fontWeight: FontWeight.w500,
                        )),
                      ),
                    )).toList(),
                ),
              ),
              const SizedBox(height: 20),
              const Text('Recommended Jobs', style: TextStyle(color: AppColors.textPrimary, fontSize: 15, fontWeight: FontWeight.w600)),
            ]),
          ),
        ),
        // Job cards
        feed.when(
          loading: () => const SliverToBoxAdapter(child: Center(child: Padding(padding: EdgeInsets.all(40), child: CircularProgressIndicator(color: AppColors.primary)))),
          error: (e, _) => SliverToBoxAdapter(child: Center(child: Text('Error loading jobs', style: TextStyle(color: AppColors.error)))),
          data: (result) => SliverList(delegate: SliverChildBuilderDelegate(
            (ctx, i) {
              if (i >= result.data.length) return null;
              return Padding(padding: const EdgeInsets.fromLTRB(16, 0, 16, 12), child: _JobCard(job: result.data[i]));
            },
            childCount: result.data.length,
          )),
        ),
        const SliverToBoxAdapter(child: SizedBox(height: 20)),
      ]),
    );
  }
}

class _JobCard extends StatelessWidget {
  final Job job;
  const _JobCard({required this.job});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () => Navigator.push(context, MaterialPageRoute(builder: (_) => JobDetailScreen(jobId: job.id))),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: AppColors.card,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppColors.border, width: 0.5),
        ),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [
            // Company logo placeholder
            Container(width: 40, height: 40, decoration: BoxDecoration(color: AppColors.primary.withOpacity(0.15), borderRadius: BorderRadius.circular(10)),
              child: const Icon(Icons.business, color: AppColors.primary, size: 20)),
            const SizedBox(width: 12),
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(job.title, style: const TextStyle(color: AppColors.textPrimary, fontSize: 14, fontWeight: FontWeight.w600)),
              Text(job.companyName ?? 'Company', style: const TextStyle(color: AppColors.textSecondary, fontSize: 12)),
            ])),
            Column(crossAxisAlignment: CrossAxisAlignment.end, children: [
              if (job.isPremium)
                Container(padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(color: AppColors.premium.withOpacity(0.15), borderRadius: BorderRadius.circular(6)),
                  child: const Text('Premium', style: TextStyle(color: AppColors.premium, fontSize: 10, fontWeight: FontWeight.w600))),
              const SizedBox(height: 4),
              Text(timeago.format(job.createdAt), style: const TextStyle(color: AppColors.textMuted, fontSize: 11)),
            ]),
          ]),
          const SizedBox(height: 12),
          Row(children: [
            const Icon(Icons.location_on_outlined, color: AppColors.textMuted, size: 14),
            const SizedBox(width: 4),
            Text(job.district ?? 'Remote', style: const TextStyle(color: AppColors.textMuted, fontSize: 12)),
            const Text(' · ', style: TextStyle(color: AppColors.textMuted)),
            Text(job.workMode == 'online' ? 'Remote' : job.workMode == 'both' ? 'Hybrid' : 'On-site',
                style: const TextStyle(color: AppColors.textMuted, fontSize: 12)),
            const Spacer(),
            Text(job.salaryDisplay,
                style: const TextStyle(color: AppColors.primary, fontSize: 13, fontWeight: FontWeight.w600)),
          ]),
        ]),
      ),
    );
  }
}
