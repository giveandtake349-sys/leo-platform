import 'package:flutter/material.dart';
import 'package:socket_io_client/socket_io_client.dart' as io;
import '../../../core/theme/app_theme.dart';
import '../../../core/utils/storage_service.dart';

class Message {
  final String id;
  final String senderId;
  final String type;
  final String? content;
  final bool isRead;
  final DateTime createdAt;
  Message({required this.id, required this.senderId, required this.type, this.content, required this.isRead, required this.createdAt});
  factory Message.fromJson(Map<String, dynamic> j) => Message(
    id: j['id'] as String, senderId: j['senderId'] as String,
    type: j['messageType'] as String? ?? 'text', content: j['content'] as String?,
    isRead: j['isRead'] as bool? ?? false,
    createdAt: DateTime.parse(j['createdAt'] as String),
  );
}

class ChatScreen extends StatefulWidget {
  final String chatId;
  final String counterpartyName;
  const ChatScreen({super.key, required this.chatId, required this.counterpartyName});
  @override
  State<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> {
  late io.Socket _socket;
  final List<Message> _messages = [];
  final _msgCtrl = TextEditingController();
  final _scrollCtrl = ScrollController();
  String? _myUserId;
  bool _counterpartyTyping = false;
  bool _isOnline = false;

  @override
  void initState() {
    super.initState();
    _initSocket();
  }

  Future<void> _initSocket() async {
    _myUserId = await StorageService.getUserId();
    final token = await StorageService.getAccessToken();

    _socket = io.io('https://api.leo.app', io.OptionBuilder()
      .setTransports(['websocket'])
      .setQuery({'token': token})
      .build());

    _socket.onConnect((_) {
      _socket.emit('chat:join', {'chatId': widget.chatId});
    });

    _socket.on('message:new', (data) {
      final msg = Message.fromJson(Map<String, dynamic>.from(data as Map));
      setState(() => _messages.add(msg));
      _scrollToBottom();
      if (msg.senderId != _myUserId) {
        _socket.emit('message:read', {'chatId': widget.chatId, 'messageId': msg.id});
      }
    });

    _socket.on('typing:update', (data) {
      final d = Map<String, dynamic>.from(data as Map);
      if (d['userId'] != _myUserId) {
        setState(() => _counterpartyTyping = d['isTyping'] as bool? ?? false);
      }
    });

    _socket.on('presence:update', (data) {
      final d = Map<String, dynamic>.from(data as Map);
      setState(() => _isOnline = d['isOnline'] as bool? ?? false);
    });

    _socket.on('contact:unlocked', (_) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('🔓 Contact details are now unlocked!'), backgroundColor: AppColors.primary));
    });
  }

  @override
  void dispose() {
    _socket.dispose();
    _msgCtrl.dispose();
    _scrollCtrl.dispose();
    super.dispose();
  }

  void _sendMessage() {
    final text = _msgCtrl.text.trim();
    if (text.isEmpty) return;
    _socket.emit('message:send', {'chatId': widget.chatId, 'type': 'text', 'content': text});
    _msgCtrl.clear();
    _socket.emit('typing:stop', {'chatId': widget.chatId});
  }

  void _onTyping(String val) {
    if (val.isNotEmpty) {
      _socket.emit('typing:start', {'chatId': widget.chatId});
    } else {
      _socket.emit('typing:stop', {'chatId': widget.chatId});
    }
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollCtrl.hasClients) {
        _scrollCtrl.animateTo(_scrollCtrl.position.maxScrollExtent,
            duration: const Duration(milliseconds: 200), curve: Curves.easeOut);
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        titleSpacing: 0,
        title: Row(children: [
          CircleAvatar(radius: 18, backgroundColor: AppColors.primary.withOpacity(0.2),
            child: Text(widget.counterpartyName[0].toUpperCase(), style: const TextStyle(color: AppColors.primary, fontWeight: FontWeight.w700))),
          const SizedBox(width: 10),
          Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(widget.counterpartyName, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w600)),
            Text(_isOnline ? 'Online' : 'Offline', style: TextStyle(fontSize: 11, color: _isOnline ? AppColors.primary : AppColors.textMuted)),
          ]),
        ]),
        actions: [
          IconButton(icon: const Icon(Icons.lock_outline, size: 18, color: AppColors.textMuted), onPressed: null),
        ],
      ),
      body: Column(children: [
        // Security notice
        Container(
          color: AppColors.surface,
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
          child: const Row(children: [
            Icon(Icons.shield_outlined, color: AppColors.textMuted, size: 14),
            SizedBox(width: 6),
            Text('Contacts hidden until contract is complete', style: TextStyle(color: AppColors.textMuted, fontSize: 11)),
          ]),
        ),
        // Messages
        Expanded(
          child: ListView.builder(
            controller: _scrollCtrl,
            padding: const EdgeInsets.all(16),
            itemCount: _messages.length + (_counterpartyTyping ? 1 : 0),
            itemBuilder: (ctx, i) {
              if (_counterpartyTyping && i == _messages.length) return _TypingIndicator();
              final msg = _messages[i];
              final isMe = msg.senderId == _myUserId;
              return _MessageBubble(msg: msg, isMe: isMe);
            },
          ),
        ),
        // Input
        Container(
          color: AppColors.surface,
          padding: EdgeInsets.only(left: 12, right: 12, top: 8, bottom: MediaQuery.of(context).viewInsets.bottom + 8),
          child: Row(children: [
            IconButton(icon: const Icon(Icons.attach_file, color: AppColors.textMuted), onPressed: () {}),
            Expanded(
              child: TextField(
                controller: _msgCtrl,
                onChanged: _onTyping,
                maxLines: null,
                style: const TextStyle(color: AppColors.textPrimary, fontSize: 14),
                decoration: const InputDecoration(hintText: 'Type a message...', border: InputBorder.none, filled: false),
              ),
            ),
            IconButton(icon: const Icon(Icons.mic_outlined, color: AppColors.textMuted), onPressed: () {}),
            GestureDetector(
              onTap: _sendMessage,
              child: Container(width: 40, height: 40,
                decoration: const BoxDecoration(color: AppColors.primary, shape: BoxShape.circle),
                child: const Icon(Icons.send, color: Colors.black, size: 18)),
            ),
          ]),
        ),
      ]),
    );
  }
}

class _MessageBubble extends StatelessWidget {
  final Message msg;
  final bool isMe;
  const _MessageBubble({required this.msg, required this.isMe});
  @override
  Widget build(BuildContext context) => Align(
    alignment: isMe ? Alignment.centerRight : Alignment.centerLeft,
    child: Container(
      margin: const EdgeInsets.only(bottom: 8),
      constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.72),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        color: isMe ? AppColors.primary : AppColors.card,
        borderRadius: BorderRadius.only(
          topLeft: const Radius.circular(16), topRight: const Radius.circular(16),
          bottomLeft: Radius.circular(isMe ? 16 : 4), bottomRight: Radius.circular(isMe ? 4 : 16),
        ),
      ),
      child: Column(crossAxisAlignment: isMe ? CrossAxisAlignment.end : CrossAxisAlignment.start, children: [
        Text(msg.content ?? '', style: TextStyle(color: isMe ? Colors.black : AppColors.textPrimary, fontSize: 14)),
        const SizedBox(height: 4),
        Row(mainAxisSize: MainAxisSize.min, children: [
          Text('${msg.createdAt.hour}:${msg.createdAt.minute.toString().padLeft(2,'0')}',
              style: TextStyle(color: isMe ? Colors.black54 : AppColors.textMuted, fontSize: 10)),
          if (isMe) ...[const SizedBox(width: 4), Icon(msg.isRead ? Icons.done_all : Icons.done, size: 12, color: Colors.black54)],
        ]),
      ]),
    ),
  );
}

class _TypingIndicator extends StatelessWidget {
  @override
  Widget build(BuildContext context) => Align(
    alignment: Alignment.centerLeft,
    child: Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(color: AppColors.card, borderRadius: BorderRadius.circular(16)),
      child: const Row(mainAxisSize: MainAxisSize.min, children: [
        _Dot(delay: 0), _Dot(delay: 200), _Dot(delay: 400),
      ]),
    ),
  );
}

class _Dot extends StatelessWidget {
  final int delay;
  const _Dot({required this.delay});
  @override
  Widget build(BuildContext context) => Container(
    width: 6, height: 6, margin: const EdgeInsets.symmetric(horizontal: 2),
    decoration: const BoxDecoration(color: AppColors.textMuted, shape: BoxShape.circle),
  );
}
