// job_model.dart
class Job {
  final String id;
  final String title;
  final String description;
  final String jobType;
  final String workMode;
  final double? salaryMin;
  final double? salaryMax;
  final String? salaryCurrency;
  final String? salaryPeriod;
  final String? district;
  final String? division;
  final bool isPremium;
  final String status;
  final int viewCount;
  final int applicantCount;
  final String? categoryName;
  final String? companyName;
  final String? companyLogoUrl;
  final DateTime createdAt;
  final double? distanceKm;

  const Job({
    required this.id, required this.title, required this.description,
    required this.jobType, required this.workMode,
    this.salaryMin, this.salaryMax, this.salaryCurrency, this.salaryPeriod,
    this.district, this.division, required this.isPremium, required this.status,
    required this.viewCount, required this.applicantCount,
    this.categoryName, this.companyName, this.companyLogoUrl,
    required this.createdAt, this.distanceKm,
  });

  factory Job.fromJson(Map<String, dynamic> j) => Job(
    id: j['id'] as String,
    title: j['title'] as String,
    description: j['description'] as String,
    jobType: j['jobType'] as String,
    workMode: j['workMode'] as String,
    salaryMin: (j['salaryMin'] as num?)?.toDouble(),
    salaryMax: (j['salaryMax'] as num?)?.toDouble(),
    salaryCurrency: j['salaryCurrency'] as String?,
    salaryPeriod: j['salaryPeriod'] as String?,
    district: j['district'] as String?,
    division: j['division'] as String?,
    isPremium: j['isPremium'] as bool? ?? false,
    status: j['status'] as String? ?? 'active',
    viewCount: j['viewCount'] as int? ?? 0,
    applicantCount: j['applicantCount'] as int? ?? 0,
    categoryName: (j['category'] as Map<String, dynamic>?)?['name'] as String?,
    companyName: (j['company'] as Map<String, dynamic>?)?['companyName'] as String?,
    companyLogoUrl: (j['company'] as Map<String, dynamic>?)?['logoUrl'] as String?,
    createdAt: DateTime.parse(j['createdAt'] as String),
    distanceKm: (j['distanceKm'] as num?)?.toDouble(),
  );

  String get salaryDisplay {
    if (salaryMin == null && salaryMax == null) return 'Negotiable';
    final currency = salaryCurrency ?? 'BDT';
    if (salaryMin != null && salaryMax != null) {
      return '৳${salaryMin!.toInt()}-${salaryMax!.toInt()}';
    }
    return '৳${(salaryMin ?? salaryMax)!.toInt()}';
  }
}

class PaginatedJobs {
  final List<Job> data;
  final int total;
  final int page;
  final int limit;

  const PaginatedJobs({required this.data, required this.total, required this.page, required this.limit});

  factory PaginatedJobs.fromJson(Map<String, dynamic> j) {
    final meta = j['meta'] as Map<String, dynamic>;
    return PaginatedJobs(
      data: (j['data'] as List).map((e) => Job.fromJson(e as Map<String, dynamic>)).toList(),
      total: meta['total'] as int,
      page: meta['page'] as int,
      limit: meta['limit'] as int,
    );
  }
}
