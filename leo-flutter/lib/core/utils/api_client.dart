import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'storage_service.dart';

class ApiClient {
  static const _baseUrl = 'https://api.leo.app/v1';
  static ApiClient? _instance;
  late final Dio _dio;

  ApiClient._() {
    _dio = Dio(BaseOptions(
      baseUrl: _baseUrl,
      connectTimeout: const Duration(seconds: 15),
      receiveTimeout: const Duration(seconds: 30),
      headers: {'Content-Type': 'application/json'},
    ));

    _dio.interceptors.addAll([
      _AuthInterceptor(_dio),
      if (kDebugMode) LogInterceptor(requestBody: true, responseBody: true),
    ]);
  }

  static ApiClient get instance => _instance ??= ApiClient._();

  Dio get dio => _dio;

  // ── Convenience wrappers ───────────────────────────────────────────

  Future<Response<T>> get<T>(String path, {Map<String, dynamic>? params}) =>
      _dio.get<T>(path, queryParameters: params);

  Future<Response<T>> post<T>(String path, {dynamic data, Map<String, dynamic>? params}) =>
      _dio.post<T>(path, data: data, queryParameters: params);

  Future<Response<T>> patch<T>(String path, {dynamic data}) =>
      _dio.patch<T>(path, data: data);

  Future<Response<T>> delete<T>(String path) => _dio.delete<T>(path);

  Future<Response<T>> upload<T>(String path, FormData formData) =>
      _dio.post<T>(path, data: formData);
}

class _AuthInterceptor extends Interceptor {
  final Dio _dio;
  bool _isRefreshing = false;

  _AuthInterceptor(this._dio);

  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) async {
    final token = await StorageService.getAccessToken();
    if (token != null) {
      options.headers['Authorization'] = 'Bearer $token';
    }
    handler.next(options);
  }

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) async {
    if (err.response?.statusCode == 401 && !_isRefreshing) {
      _isRefreshing = true;
      try {
        final refreshToken = await StorageService.getRefreshToken();
        if (refreshToken == null) {
          await StorageService.clearAll();
          handler.next(err);
          return;
        }

        final response = await Dio().post(
          '${ApiClient._baseUrl}/auth/refresh',
          data: {'refreshToken': refreshToken},
        );

        final newToken = response.data['data']['accessToken'] as String;
        await StorageService.saveAccessToken(newToken);

        // Retry original request with new token
        err.requestOptions.headers['Authorization'] = 'Bearer $newToken';
        final retried = await _dio.fetch(err.requestOptions);
        handler.resolve(retried);
        return;
      } catch (_) {
        await StorageService.clearAll();
      } finally {
        _isRefreshing = false;
      }
    }
    handler.next(err);
  }
}

// Standardised API error
class ApiError {
  final String code;
  final String message;
  final dynamic details;

  ApiError({required this.code, required this.message, this.details});

  factory ApiError.fromDioException(DioException e) {
    final data = e.response?.data;
    if (data is Map && data['error'] != null) {
      final err = data['error'] as Map;
      return ApiError(
        code: err['code'] ?? 'ERROR',
        message: err['message'] ?? 'Something went wrong',
        details: err['details'],
      );
    }
    return ApiError(code: 'NETWORK_ERROR', message: e.message ?? 'Network error');
  }
}
