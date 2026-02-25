'use client';

import { type NodeProps } from '@xyflow/react';
import { BaseNode } from './base-node';
import {
  Play,
  Brain,
  MessageSquare,
  PhoneForwarded,
  AlertCircle,
  PhoneOff,
  Sheet,
  PhoneOutgoing,
  Globe,
  CreditCard,
  ShieldCheck,
  BookOpen,
  GitBranch,
  Mic,
} from 'lucide-react';

function StartNode({ data, selected }: NodeProps) {
  return (
    <BaseNode label={data.label as string} icon={Play} color="#2d6a4f" selected={selected} handles={{ top: false, bottom: true }}>
      <p className="truncate">{(data.config as any)?.greetingText || 'Configure greeting...'}</p>
    </BaseNode>
  );
}

function IntentNode({ data, selected }: NodeProps) {
  const config = data.config as any;
  const intents = config?.intents || [];
  return (
    <BaseNode
      label={data.label as string}
      icon={Brain}
      color="#1e3a5f"
      selected={selected}
      handles={{
        top: true,
        bottom: false,
        outputs: intents.map((intent: any, i: number) => ({
          id: intent.outputHandle || `intent-${i}`,
          label: intent.name,
          position: 30 + i * 20,
        })),
      }}
    >
      {intents.length > 0 ? (
        <div className="space-y-1">
          {intents.slice(0, 3).map((intent: any, i: number) => (
            <div key={i} className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-navy-400" />
              <span className="truncate">{intent.name}</span>
            </div>
          ))}
          {intents.length > 3 && <span className="text-gray-400">+{intents.length - 3} more</span>}
        </div>
      ) : (
        <p>Configure intents...</p>
      )}
    </BaseNode>
  );
}

function ResponseNode({ data, selected }: NodeProps) {
  return (
    <BaseNode label={data.label as string} icon={MessageSquare} color="#374151" selected={selected}>
      <p className="truncate">{(data.config as any)?.text || 'Configure response...'}</p>
    </BaseNode>
  );
}

function TransferNode({ data, selected }: NodeProps) {
  return (
    <BaseNode label={data.label as string} icon={PhoneForwarded} color="#92400e" selected={selected}>
      <p className="truncate">{(data.config as any)?.phoneNumber || 'Configure transfer...'}</p>
    </BaseNode>
  );
}

function FallbackNode({ data, selected }: NodeProps) {
  return (
    <BaseNode label={data.label as string} icon={AlertCircle} color="#991b1b" selected={selected}>
      <p>Retries: {(data.config as any)?.retryCount || 3}</p>
    </BaseNode>
  );
}

function DisconnectNode({ data, selected }: NodeProps) {
  return (
    <BaseNode label={data.label as string} icon={PhoneOff} color="#6b7280" selected={selected} handles={{ top: true, bottom: false }}>
      <p className="truncate">{(data.config as any)?.goodbyeText || 'Goodbye!'}</p>
    </BaseNode>
  );
}

function SheetNode({ data, selected }: NodeProps) {
  return (
    <BaseNode label={data.label as string} icon={Sheet} color="#065f46" selected={selected}>
      <p>{(data.config as any)?.operation || 'read'} operation</p>
    </BaseNode>
  );
}

function OutboundTriggerNode({ data, selected }: NodeProps) {
  return (
    <BaseNode label={data.label as string} icon={PhoneOutgoing} color="#1e3a5f" selected={selected}>
      <p>{(data.config as any)?.triggerType || 'immediate'}</p>
    </BaseNode>
  );
}

function ApiNode({ data, selected }: NodeProps) {
  return (
    <BaseNode label={data.label as string} icon={Globe} color="#4338ca" selected={selected}>
      <p className="truncate">{(data.config as any)?.method || 'GET'} {(data.config as any)?.endpointUrl || 'Configure...'}</p>
    </BaseNode>
  );
}

function PaymentNode({ data, selected }: NodeProps) {
  return (
    <BaseNode label={data.label as string} icon={CreditCard} color="#92400e" selected={selected}>
      <p>{(data.config as any)?.provider || 'Configure provider...'}</p>
    </BaseNode>
  );
}

function VerificationNode({ data, selected }: NodeProps) {
  return (
    <BaseNode label={data.label as string} icon={ShieldCheck} color="#1e3a5f" selected={selected}>
      <p>{(data.config as any)?.type || 'otp'} verification</p>
    </BaseNode>
  );
}

function KnowledgeNode({ data, selected }: NodeProps) {
  return (
    <BaseNode label={data.label as string} icon={BookOpen} color="#065f46" selected={selected}>
      <p>Knowledge lookup</p>
    </BaseNode>
  );
}

function LogicNode({ data, selected }: NodeProps) {
  const conditions = (data.config as any)?.conditions || [];
  return (
    <BaseNode
      label={data.label as string}
      icon={GitBranch}
      color="#374151"
      selected={selected}
      handles={{
        top: true,
        bottom: false,
        outputs: conditions.map((c: any, i: number) => ({
          id: c.outputHandle || `cond-${i}`,
          label: `${c.variable} ${c.operator} ${c.value}`,
          position: 30 + i * 20,
        })),
      }}
    >
      <p>{conditions.length} condition{conditions.length !== 1 ? 's' : ''}</p>
    </BaseNode>
  );
}

function IntroductionNode({ data, selected }: NodeProps) {
  return (
    <BaseNode label={data.label as string} icon={Mic} color="#2d6a4f" selected={selected}>
      <p className="truncate">{(data.config as any)?.greetingText || 'Configure intro...'}</p>
    </BaseNode>
  );
}

export const nodeTypes = {
  start: StartNode,
  intent: IntentNode,
  response: ResponseNode,
  transfer: TransferNode,
  fallback: FallbackNode,
  disconnect: DisconnectNode,
  sheet: SheetNode,
  outbound_trigger: OutboundTriggerNode,
  api: ApiNode,
  payment: PaymentNode,
  verification: VerificationNode,
  knowledge: KnowledgeNode,
  logic: LogicNode,
  introduction: IntroductionNode,
};
