export const NODE_TYPES = {
  START: 'start',
  INTENT: 'intent',
  RESPONSE: 'response',
  TRANSFER: 'transfer',
  FALLBACK: 'fallback',
  DISCONNECT: 'disconnect',
  SHEET: 'sheet',
  OUTBOUND_TRIGGER: 'outbound_trigger',
  API: 'api',
  WEBSOCKET: 'websocket',
  LOGIC: 'logic',
  PAYMENT: 'payment',
  VERIFICATION: 'verification',
  KNOWLEDGE: 'knowledge',
  LANGUAGE: 'language',
  INTRODUCTION: 'introduction',
} as const;

export type NodeType = (typeof NODE_TYPES)[keyof typeof NODE_TYPES];

export interface StartConfig {
  greetingText: string;
  greetingAudioUrl?: string;
}

export interface IntentConfig {
  intents: {
    name: string;
    examples: string[];
    outputHandle: string;
  }[];
  fallbackHandle: string;
  confidenceThreshold: number;
}

export interface ResponseConfig {
  text: string;
  ssml?: string;
  expectResponse: boolean;
  saveResponseAs?: string;
}

export interface TransferConfig {
  phoneNumber: string;
  sipUri?: string;
  whisperText?: string;
  warmTransfer: boolean;
}

export interface FallbackConfig {
  retryCount: number;
  fallbackText: string;
  escalateToNode?: string;
}

export interface DisconnectConfig {
  goodbyeText: string;
  reason: 'completed' | 'error' | 'user_hangup' | 'timeout';
}

export interface SheetConfig {
  connectionId: string;
  operation: 'read' | 'write' | 'append';
  range: string;
  mappings: {
    variable: string;
    column: string;
  }[];
}

export interface OutboundTriggerConfig {
  triggerType: 'immediate' | 'scheduled' | 'webhook';
  targetPhone: string;
  scheduleDelay?: number;
  webhookUrl?: string;
  payload?: Record<string, string>;
}

export interface ApiNodeConfig {
  endpointUrl: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers: Record<string, string>;
  bodyTemplate: string;
  retryRules: { maxRetries: number; backoffMs: number };
  timeoutMs: number;
  responseMapping: Record<string, string>;
}

export interface PaymentConfig {
  provider: 'razorpay' | 'stripe';
  amountVariable: string;
  orderIdVariable: string;
  webhookUrl: string;
  timeoutSeconds: number;
}

export interface VerificationConfig {
  type: 'otp' | 'pin' | 'custom';
  maxAttempts: number;
  codeLength: number;
  expirySeconds: number;
}

export interface KnowledgeConfig {
  knowledgeBaseId: string;
  maxResults: number;
  confidenceThreshold: number;
}

export interface LogicConfig {
  conditions: {
    variable: string;
    operator: 'eq' | 'neq' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains' | 'exists';
    value: string;
    outputHandle: string;
  }[];
  defaultHandle: string;
}

export type NodeConfig =
  | StartConfig
  | IntentConfig
  | ResponseConfig
  | TransferConfig
  | FallbackConfig
  | DisconnectConfig
  | SheetConfig
  | OutboundTriggerConfig
  | ApiNodeConfig
  | PaymentConfig
  | VerificationConfig
  | KnowledgeConfig
  | LogicConfig;

export interface WorkflowNodeData {
  label: string;
  config: NodeConfig;
}

export interface WorkflowNode {
  id: string;
  type: NodeType;
  position: { x: number; y: number };
  data: WorkflowNodeData;
}

export interface WorkflowEdge {
  id: string;
  source: string;
  sourceHandle?: string;
  target: string;
  label?: string;
  animated?: boolean;
  data?: {
    condition?: string;
  };
}

export interface WorkflowGraph {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}
