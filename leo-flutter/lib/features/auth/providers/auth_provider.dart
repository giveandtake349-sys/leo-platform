import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/utils/storage_service.dart';
import '../models/auth_model.dart';
import '../services/auth_service.dart';

sealed class AuthState {
  const AuthState();
}

class AuthLoading extends AuthState {
  const AuthLoading();
}

class AuthAuthenticated extends AuthState {
  final AuthUser user;
  const AuthAuthenticated(this.user);
}

class AuthUnauthenticated extends AuthState {
  const AuthUnauthenticated();
}

extension AuthStateX on AuthState {
  T when<T>({
    required T Function() loading,
    required T Function(AuthUser) authenticated,
    required T Function() unauthenticated,
  }) {
    return switch (this) {
      AuthLoading() => loading(),
      AuthAuthenticated(:final user) => authenticated(user),
      AuthUnauthenticated() => unauthenticated(),
    };
  }
}

class AuthNotifier extends AsyncNotifier<AuthState> {
  late final AuthService _svc;

  @override
  Future<AuthState> build() async {
    _svc = AuthService();
    final loggedIn = await StorageService.isLoggedIn();
    if (!loggedIn) return const AuthUnauthenticated();
    final id = await StorageService.getUserId() ?? '';
    final role = await StorageService.getUserRole() ?? 'worker';
    return AuthAuthenticated(AuthUser(
      id: id,
      role: role,
      isPhoneVerified: true,
      isWhatsappVerified: false,
    ));
  }

  Future<String> sendOtp(String phone) => _svc.sendOtp(phone);

  Future<void> verifyOtp({
    required String requestId,
    required String otp,
    required String fp,
  }) async {
    state = const AsyncData(AuthLoading());
    final user = await _svc.verifyOtp(
      requestId: requestId,
      otp: otp,
      deviceFingerprint: fp,
    );
    state = AsyncData(AuthAuthenticated(user));
  }

  Future<void> logout() async {
    await _svc.logout();
    state = const AsyncData(AuthUnauthenticated());
  }
}

final authProvider =
    AsyncNotifierProvider<AuthNotifier, AuthState>(AuthNotifier.new);
