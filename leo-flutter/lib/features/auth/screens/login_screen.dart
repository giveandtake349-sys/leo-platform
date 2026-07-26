import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/theme/app_theme.dart';
import '../providers/auth_provider.dart';
import 'otp_screen.dart';

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});
  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _phoneCtrl = TextEditingController();
  bool _loading = false;

  @override
  void dispose() { _phoneCtrl.dispose(); super.dispose(); }

  Future<void> _sendOtp() async {
    final phone = '+880${_phoneCtrl.text.trim()}';
    if (_phoneCtrl.text.trim().length < 10) {
      _showSnack('Enter a valid phone number');
      return;
    }
    setState(() => _loading = true);
    try {
      final notifier = ref.read(authProvider.notifier);
      final requestId = await notifier.sendOtp(phone);
      if (!mounted) return;
      Navigator.push(context, MaterialPageRoute(
        builder: (_) => OtpScreen(phone: phone, requestId: requestId),
      ));
    } catch (e) {
      _showSnack('Failed to send OTP. Try again.');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _showSnack(String msg) =>
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(msg)));

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24),
          child: Column(
            children: [
              const SizedBox(height: 60),
              // Logo
              const Icon(Icons.shield, size: 64, color: AppColors.primary),
              const SizedBox(height: 12),
              const Text('Leo', style: TextStyle(fontSize: 32, fontWeight: FontWeight.w700, color: AppColors.textPrimary)),
              const SizedBox(height: 4),
              const Text('Find Jobs. Hire Talent. Build Future.', style: TextStyle(color: AppColors.textSecondary, fontSize: 13)),
              const SizedBox(height: 60),
              // Role buttons
              Row(children: [
                Expanded(child: _RoleButton(label: "I'm looking\nfor a job", icon: Icons.work_outline, onTap: () {})),
                const SizedBox(width: 12),
                Expanded(child: _RoleButton(label: "I want\nto hire", icon: Icons.business_center_outlined, onTap: () {})),
              ]),
              const SizedBox(height: 40),
              // Phone field
              Row(children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 16),
                  decoration: BoxDecoration(
                    color: AppColors.inputFill,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: AppColors.border),
                  ),
                  child: const Text('+880', style: TextStyle(color: AppColors.textPrimary, fontSize: 14, fontWeight: FontWeight.w500)),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: TextField(
                    controller: _phoneCtrl,
                    keyboardType: TextInputType.phone,
                    maxLength: 10,
                    style: const TextStyle(color: AppColors.textPrimary, fontSize: 16),
                    decoration: const InputDecoration(
                      hintText: '1712 345 678',
                      counterText: '',
                    ),
                  ),
                ),
              ]),
              const SizedBox(height: 20),
              SizedBox(
                width: double.infinity,
                height: 52,
                child: ElevatedButton(
                  onPressed: _loading ? null : _sendOtp,
                  child: _loading
                      ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(color: Colors.black, strokeWidth: 2))
                      : const Text('Send OTP'),
                ),
              ),
              const Spacer(),
              const Text('Your data is 100% secure and encrypted', style: TextStyle(color: AppColors.textMuted, fontSize: 11)),
              const SizedBox(height: 16),
              Row(mainAxisAlignment: MainAxisAlignment.center, children: [
                TextButton(onPressed: () {}, child: const Text('Terms & Conditions', style: TextStyle(color: AppColors.primary, fontSize: 12))),
                const Text(' · ', style: TextStyle(color: AppColors.textMuted)),
                TextButton(onPressed: () {}, child: const Text('Privacy Policy', style: TextStyle(color: AppColors.primary, fontSize: 12))),
              ]),
              const SizedBox(height: 16),
            ],
          ),
        ),
      ),
    );
  }
}

class _RoleButton extends StatelessWidget {
  final String label;
  final IconData icon;
  final VoidCallback onTap;
  const _RoleButton({required this.label, required this.icon, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 20),
        decoration: BoxDecoration(
          color: AppColors.card,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppColors.primary.withOpacity(0.4)),
        ),
        child: Column(children: [
          Icon(icon, color: AppColors.primary, size: 28),
          const SizedBox(height: 8),
          Text(label, textAlign: TextAlign.center, style: const TextStyle(color: AppColors.textPrimary, fontSize: 13, fontWeight: FontWeight.w500)),
        ]),
      ),
    );
  }
}
