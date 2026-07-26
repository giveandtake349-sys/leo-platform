import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/job_model.dart';
import '../services/jobs_service.dart';

final jobsServiceProvider = Provider<JobsService>((_) => JobsService());

final jobsFeedProvider =
    FutureProvider.family<PaginatedJobs, Map<String, dynamic>>(
        (ref, params) {
  final svc = ref.read(jobsServiceProvider);
  return svc.getFeed(
    categoryId: params['categoryId'] as String?,
    district: params['district'] as String?,
    workMode: params['workMode'] as String?,
    page: params['page'] as int? ?? 1,
  );
});

final jobDetailProvider = FutureProvider.family<Job, String>((ref, id) {
  return ref.read(jobsServiceProvider).getById(id);
});
