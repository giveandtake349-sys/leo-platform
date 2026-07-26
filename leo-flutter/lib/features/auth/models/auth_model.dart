class AuthUser {
  final String id;
  final String role;
  final bool isPhoneVerified;
  final bool isWhatsappVerified;

  const AuthUser({
    required this.id,
    required this.role,
    required this.isPhoneVerified,
    required this.isWhatsappVerified,
  });

  factory AuthUser.fromJson(Map<String, dynamic> j) => AuthUser(
        id: j['id'] as String,
        role: j['role'] as String,
        isPhoneVerified: j['isPhoneVerified'] as bool? ?? false,
        isWhatsappVerified: j['isWhatsappVerified'] as bool? ?? false,
      );

  bool get isEmployer => role == 'employer';
  bool get isWorker => role == 'worker';
}
