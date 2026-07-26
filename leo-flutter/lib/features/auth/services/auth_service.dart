import '../../../core/utils/api_client.dart';
import '../../../core/utils/storage_service.dart';
import '../models/auth_model.dart';

class AuthService {
  final _api = ApiClient.instance;

  Future<String> sendOtp(String phone) async {
    final res = await _api.post('/auth/otp/send', data: {
      'phone': phone,
      'purpose': 'login',
    });
    return res.data['data']['requestId'] as String;
  }

  Future<AuthUser> verifyOtp({
    required String requestId,
    required String otp,
    required String deviceFingerprint,
    String deviceType = 'android',
  }) async {
    final res = await _api.post('/auth/otp/verify', data: {
      'requestId': requestId,
      'otp': otp,
      'deviceFingerprint': deviceFingerprint,
      'deviceType': deviceType,
    });
    final data = res.data['data'] as Map<String, dynamic>;
    await StorageService.saveTokens(
      accessToken: data['accessToken'] as String,
      refreshToken: data['refreshToken'] as String,
    );
    final user = AuthUser.fromJson(data['user'] as Map<String, dynamic>);
    await StorageService.saveUser(userId: user.id, role: user.role);
    return user;
  }

  Future<void> logout() async {
    try {
      await _api.post('/auth/logout');
    } catch (_) {}
    await StorageService.clearAll();
  }
}
