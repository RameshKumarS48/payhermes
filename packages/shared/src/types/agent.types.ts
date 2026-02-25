export type AgentUseCase =
  | 'CUSTOMER_SUPPORT'
  | 'APPOINTMENT_BOOKING'
  | 'ORDER_STATUS'
  | 'PAYMENT_REMINDER'
  | 'OTP_VERIFICATION'
  | 'SURVEY'
  | 'LEAD_QUALIFICATION'
  | 'CUSTOM';

export type AgentLanguage = 'en-US' | 'hi-IN' | 'hinglish';

export interface AgentCreateInput {
  name: string;
  description?: string;
  useCase: AgentUseCase;
  language: AgentLanguage;
  voiceId?: string;
  systemPrompt?: string;
}

export interface AgentUpdateInput {
  name?: string;
  description?: string;
  language?: AgentLanguage;
  voiceId?: string;
  systemPrompt?: string;
  isActive?: boolean;
}
