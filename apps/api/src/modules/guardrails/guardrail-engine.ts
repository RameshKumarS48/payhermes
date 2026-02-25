import type { SessionState } from '../voice/session-manager';

interface GuardrailResult {
  blocked: boolean;
  response: string;
  reason?: string;
}

const ABUSE_KEYWORDS = [
  'fuck', 'shit', 'damn', 'hell', 'bastard', 'idiot', 'stupid',
  'gaali', 'bakwas', 'bevkoof', 'chutiya', 'madarchod',
];

const MAX_CONSECUTIVE_FAILURES = 3;

export class GuardrailEngine {
  async check(userText: string, session: SessionState): Promise<GuardrailResult> {
    // Check for abuse
    const lowerText = userText.toLowerCase();
    const hasAbuse = ABUSE_KEYWORDS.some((kw) => lowerText.includes(kw));
    if (hasAbuse) {
      return {
        blocked: true,
        response: "I understand you're frustrated. Let me help you with your query. Please keep the conversation respectful.",
        reason: 'abuse_detected',
      };
    }

    // Check for repeated failures
    if (session.retryCount >= MAX_CONSECUTIVE_FAILURES) {
      return {
        blocked: true,
        response: "I'm sorry, I'm having trouble understanding your request. Let me transfer you to a human agent.",
        reason: 'max_retries_exceeded',
      };
    }

    // Check for empty or very short input
    if (userText.trim().length < 2) {
      return {
        blocked: true,
        response: "I didn't catch that. Could you please say that again?",
        reason: 'empty_input',
      };
    }

    return { blocked: false, response: '' };
  }
}
