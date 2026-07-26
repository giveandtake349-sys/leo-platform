import 'package:flutter_secure_storage/flutter_secure_storage.dart';

class StorageService {
  static late FlutterSecureStorage _storage;

  static const _accessTokenKey  = 'access_token';
  static const _refreshTokenKey = 'refresh_token';
  static const _userIdKey       = 'user_id';
  static const _userRoleKey     = 'user_role';

  static Future<void> init() async {
    _storage = const FlutterSecureStorage(
      aOptions: AndroidOptions(encryptedSharedPreferences: true),
      iOptions: IOSOptions(accessibility: KeychainAccessibility.first_unlock),
    );
  }

  // ── Tokens ─────────────────────────────────────────────────────────
  static Future<void> saveTokens({
    required String accessToken,
    required String refreshToken,
  }) async {
    await Future.wait([
      _storage.write(key: _accessTokenKey, value: accessToken),
      _storage.write(key: _refreshTokenKey, value: refreshToken),
    ]);
  }

  static Future<String?> getAccessToken()  => _storage.read(key: _accessTokenKey);
  static Future<String?> getRefreshToken() => _storage.read(key: _refreshTokenKey);

  static Future<void> saveAccessToken(String token) =>
      _storage.write(key: _accessTokenKey, value: token);

  // ── User ───────────────────────────────────────────────────────────
  static Future<void> saveUser({required String userId, required String role}) async {
    await Future.wait([
      _storage.write(key: _userIdKey, value: userId),
      _storage.write(key: _userRoleKey, value: role),
    ]);
  }

  static Future<String?> getUserId()   => _storage.read(key: _userIdKey);
  static Future<String?> getUserRole() => _storage.read(key: _userRoleKey);

  static Future<bool> isLoggedIn() async =>
      (await getAccessToken()) != null;

  // ── Clear ──────────────────────────────────────────────────────────
  static Future<void> clearAll() => _storage.deleteAll();
}
