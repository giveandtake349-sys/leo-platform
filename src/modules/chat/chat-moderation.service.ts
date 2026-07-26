import { Injectable } from '@nestjs/common';

// Patterns to detect contact information sharing in chat before contract completion
const BLOCKED_PATTERNS: RegExp[] = [
  /(?:\+?880|0)1[3-9]\d{8}/g,               // BD phone numbers
  /\+\d{7,15}/g,                               // International phone numbers
  /wa\.me\/\d+/gi,                             // WhatsApp links
  /whatsapp[.\s:]*\d+/gi,                     // WhatsApp mentions with numbers
  /t\.me\/[a-z0-9_]+/gi,                      // Telegram links
  /telegram[.\s:]+[a-z0-9_@]+/gi,            // Telegram handles
  /facebook\.com\/[a-z0-9.]+/gi,             // Facebook URLs
  /fb\.com\/[a-z0-9.]+/gi,
  /messenger\.com\/[a-z0-9.]+/gi,
  /instagram\.com\/[a-z0-9._]+/gi,
  /[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}/gi,  // Email addresses
  /https?:\/\/[^\s]{4,}/gi,                   // External URLs
  /01[3-9]\d{8}/g,                             // BD mobile without country code
];

export interface ModerationResult {
  isClean: boolean;
  flaggedReason: string | null;
  redactedContent: string;
}

@Injectable()
export class ChatModerationService {
  /**
   * Scan message content for contact information.
   * Called before persisting any message in a locked (pre-contract) chat.
   */
  moderate(content: string, chatIsLocked: boolean): ModerationResult {
    if (!chatIsLocked || !content) {
      return { isClean: true, flaggedReason: null, redactedContent: content };
    }

    for (const pattern of BLOCKED_PATTERNS) {
      pattern.lastIndex = 0; // reset stateful regexes
      if (pattern.test(content)) {
        return {
          isClean: false,
          flaggedReason: 'Contact information sharing is not allowed before contract completion.',
          redactedContent: content,
        };
      }
    }

    return { isClean: true, flaggedReason: null, redactedContent: content };
  }

  /** Redact matched patterns for audit logging (never persisted to message) */
  redact(content: string): string {
    let out = content;
    for (const pattern of BLOCKED_PATTERNS) {
      pattern.lastIndex = 0;
      out = out.replace(pattern, '[REDACTED]');
    }
    return out;
  }
}
