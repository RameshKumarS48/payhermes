import { NODE_TYPES } from '../types/workflow.types';

export const NODE_TYPE_LABELS: Record<string, string> = {
  [NODE_TYPES.START]: 'Start',
  [NODE_TYPES.INTENT]: 'Intent Detection',
  [NODE_TYPES.RESPONSE]: 'Response',
  [NODE_TYPES.TRANSFER]: 'Transfer Call',
  [NODE_TYPES.FALLBACK]: 'Fallback',
  [NODE_TYPES.DISCONNECT]: 'Disconnect',
  [NODE_TYPES.SHEET]: 'Google Sheet',
  [NODE_TYPES.OUTBOUND_TRIGGER]: 'Outbound Trigger',
  [NODE_TYPES.API]: 'API Call',
  [NODE_TYPES.WEBSOCKET]: 'WebSocket',
  [NODE_TYPES.LOGIC]: 'Logic',
  [NODE_TYPES.PAYMENT]: 'Payment',
  [NODE_TYPES.VERIFICATION]: 'Verification',
  [NODE_TYPES.KNOWLEDGE]: 'Knowledge Base',
  [NODE_TYPES.LANGUAGE]: 'Language',
  [NODE_TYPES.INTRODUCTION]: 'Introduction',
};

export const NODE_TYPE_COLORS: Record<string, string> = {
  [NODE_TYPES.START]: '#2d6a4f',
  [NODE_TYPES.INTENT]: '#1e3a5f',
  [NODE_TYPES.RESPONSE]: '#374151',
  [NODE_TYPES.TRANSFER]: '#92400e',
  [NODE_TYPES.FALLBACK]: '#991b1b',
  [NODE_TYPES.DISCONNECT]: '#6b7280',
  [NODE_TYPES.SHEET]: '#065f46',
  [NODE_TYPES.OUTBOUND_TRIGGER]: '#1e3a5f',
  [NODE_TYPES.API]: '#4338ca',
  [NODE_TYPES.PAYMENT]: '#92400e',
  [NODE_TYPES.LOGIC]: '#374151',
  [NODE_TYPES.VERIFICATION]: '#1e3a5f',
  [NODE_TYPES.KNOWLEDGE]: '#065f46',
  [NODE_TYPES.LANGUAGE]: '#374151',
  [NODE_TYPES.INTRODUCTION]: '#2d6a4f',
};
