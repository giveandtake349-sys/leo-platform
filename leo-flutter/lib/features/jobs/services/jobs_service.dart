import '../../../core/utils/api_client.dart';
import '../models/job_model.dart';

class JobsService {
  final _api = ApiClient.instance;

  Future<PaginatedJobs> getFeed({
    String? categoryId,
    String? district,
    String? workMode,
    int page = 1,
    int limit = 20,
  }) async {
    final res = await _api.get('/jobs', params: {
      if (categoryId != null) 'categoryId': categoryId,
      if (district != null) 'district': district,
      if (workMode != null) 'workMode': workMode,
      'page': page,
      'limit': limit,
    });
    return PaginatedJobs.fromJson(res.data['data'] as Map<String, dynamic>);
  }

  Future<Job> getById(String id) async {
    final res = await _api.get('/jobs/$id');
    return Job.fromJson(res.data['data'] as Map<String, dynamic>);
  }

  Future<void> apply(String jobId, {String? coverNote}) async {
    await _api.post('/jobs/$jobId/apply',
        data: {if (coverNote != null) 'coverNote': coverNote});
  }

  Future<Job> createJob(Map<String, dynamic> data) async {
    final res = await _api.post('/jobs', data: data);
    return Job.fromJson(res.data['data'] as Map<String, dynamic>);
  }
}
