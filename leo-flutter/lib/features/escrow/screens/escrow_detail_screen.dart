import 'package:flutter/material.dart';
import '../../../core/theme/app_theme.dart';

class EscrowDetailScreen extends StatelessWidget {
  final String escrowId;
  const EscrowDetailScreen({super.key, required this.escrowId});

  @override
  Widget build(BuildContext context) {
    const steps = ['Draft', 'Funded', 'Active', 'Submitted', 'Approved', 'Released'];
    const currentStep = 2; // 0-indexed

    return Scaffold(
      appBar: AppBar(title: const Text('Escrow Status')),
      body: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          const Text(
            'Escrow Flow',
            style: TextStyle(
              color: AppColors.textPrimary,
              fontSize: 16,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 8),
          const Text(
            'All transactions are secure and monitored',
            style: TextStyle(color: AppColors.textMuted, fontSize: 12),
          ),
          const SizedBox(height: 24),
          ...List.generate(
            steps.length,
            (i) => _StepRow(
              label: steps[i],
              stepNum: i + 1,
              isCompleted: i < currentStep,
              isActive: i == currentStep,
              isLast: i == steps.length - 1,
            ),
          ),
        ]),
      ),
    );
  }
}

class _StepRow extends StatelessWidget {
  final String label;
  final int stepNum;
  final bool isCompleted;
  final bool isActive;
  final bool isLast;

  const _StepRow({
    required this.label,
    required this.stepNum,
    required this.isCompleted,
    required this.isActive,
    required this.isLast,
  });

  @override
  Widget build(BuildContext context) {
    final color =
        isCompleted || isActive ? AppColors.primary : AppColors.textMuted;
    return Row(children: [
      Column(children: [
        Container(
          width: 28,
          height: 28,
          decoration: BoxDecoration(
            color: isCompleted || isActive
                ? AppColors.primary
                : AppColors.inputFill,
            shape: BoxShape.circle,
            border: Border.all(color: color),
          ),
          child: Icon(
            isCompleted ? Icons.check : Icons.circle,
            color: isCompleted
                ? Colors.black
                : (isActive ? Colors.black : AppColors.textMuted),
            size: 14,
          ),
        ),
        if (!isLast)
          Container(
            width: 2,
            height: 32,
            color: isCompleted ? AppColors.primary : AppColors.border,
          ),
      ]),
      const SizedBox(width: 14),
      Padding(
        padding: const EdgeInsets.only(bottom: 32),
        child: Text(
          label,
          style: TextStyle(
            color: isActive
                ? AppColors.primary
                : (isCompleted
                    ? AppColors.textPrimary
                    : AppColors.textMuted),
            fontSize: 14,
            fontWeight:
                isActive ? FontWeight.w600 : FontWeight.w400,
          ),
        ),
      ),
    ]);
  }
}
