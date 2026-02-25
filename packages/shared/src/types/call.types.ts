export type CallDirection = 'INBOUND' | 'OUTBOUND';

export type CallStatus =
  | 'INITIATED'
  | 'RINGING'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'FAILED'
  | 'NO_ANSWER'
  | 'BUSY';

export interface TranscriptEntry {
  role: 'user' | 'agent' | 'system';
  text: string;
  timestamp: string;
  intent?: string;
  confidence?: number;
}

export interface CallMetadata {
  paymentStatus?: string;
  otpResult?: string;
  transferredTo?: string;
  escalationReason?: string;
  [key: string]: unknown;
}
