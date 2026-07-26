// chat_list_screen.dart
import 'package:flutter/material.dart';
import '../../../core/theme/app_theme.dart';

class ChatListScreen extends StatelessWidget {
  const ChatListScreen({super.key});
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Messages')),
      body: ListView.separated(
        padding: const EdgeInsets.all(16),
        itemCount: 0,
        separatorBuilder: (_, __) => const Divider(height: 1),
        itemBuilder: (_, __) => const SizedBox(),
      ),
    );
  }
}
