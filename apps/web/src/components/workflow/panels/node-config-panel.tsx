'use client';

import { type Node } from '@xyflow/react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { X, Plus, Trash2 } from 'lucide-react';
import { useState, useEffect } from 'react';

interface NodeConfigPanelProps {
  node: Node | null;
  onUpdate: (nodeId: string, data: any) => void;
  onClose: () => void;
}

export function NodeConfigPanel({ node, onUpdate, onClose }: NodeConfigPanelProps) {
  const [config, setConfig] = useState<any>({});

  useEffect(() => {
    if (node) {
      setConfig((node.data as any)?.config || {});
    }
  }, [node]);

  if (!node) return null;

  function updateConfig(key: string, value: any) {
    const updated = { ...config, [key]: value };
    setConfig(updated);
    onUpdate(node!.id, { ...node!.data, config: updated });
  }

  function updateLabel(label: string) {
    onUpdate(node!.id, { ...node!.data, label });
  }

  return (
    <div className="w-80 bg-white border-l border-gray-200 h-full overflow-y-auto">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-900">Configure Node</h3>
        <button onClick={onClose} className="p-1 rounded hover:bg-gray-100 text-gray-400">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-4 space-y-4">
        <Input
          label="Label"
          value={(node.data as any)?.label || ''}
          onChange={(e) => updateLabel(e.target.value)}
        />

        {node.type === 'start' && (
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-700">Greeting Text</label>
            <textarea
              className="block w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-navy-300 focus:border-navy-400 min-h-[80px] resize-none"
              placeholder="Hello! How can I help you today?"
              value={config.greetingText || ''}
              onChange={(e) => updateConfig('greetingText', e.target.value)}
            />
          </div>
        )}

        {node.type === 'response' && (
          <>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700">Response Text</label>
              <textarea
                className="block w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-navy-300 focus:border-navy-400 min-h-[80px] resize-none"
                placeholder="Use {{variable}} for dynamic values"
                value={config.text || ''}
                onChange={(e) => updateConfig('text', e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="expectResponse"
                checked={config.expectResponse || false}
                onChange={(e) => updateConfig('expectResponse', e.target.checked)}
                className="rounded border-gray-300"
              />
              <label htmlFor="expectResponse" className="text-sm text-gray-700">
                Wait for user response
              </label>
            </div>
            <Input
              label="Save response as"
              placeholder="variable_name"
              value={config.saveResponseAs || ''}
              onChange={(e) => updateConfig('saveResponseAs', e.target.value)}
            />
          </>
        )}

        {node.type === 'intent' && (
          <IntentConfigPanel config={config} onUpdate={updateConfig} />
        )}

        {node.type === 'transfer' && (
          <>
            <Input
              label="Phone Number"
              placeholder="+91 98765 43210"
              value={config.phoneNumber || ''}
              onChange={(e) => updateConfig('phoneNumber', e.target.value)}
            />
            <Input
              label="Whisper Text"
              placeholder="Incoming transfer from voice bot"
              value={config.whisperText || ''}
              onChange={(e) => updateConfig('whisperText', e.target.value)}
            />
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="warmTransfer"
                checked={config.warmTransfer || false}
                onChange={(e) => updateConfig('warmTransfer', e.target.checked)}
                className="rounded border-gray-300"
              />
              <label htmlFor="warmTransfer" className="text-sm text-gray-700">
                Warm transfer
              </label>
            </div>
          </>
        )}

        {node.type === 'fallback' && (
          <>
            <Input
              label="Retry Count"
              type="number"
              value={config.retryCount || 3}
              onChange={(e) => updateConfig('retryCount', parseInt(e.target.value))}
            />
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700">Fallback Text</label>
              <textarea
                className="block w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-navy-300 focus:border-navy-400 min-h-[60px] resize-none"
                value={config.fallbackText || ''}
                onChange={(e) => updateConfig('fallbackText', e.target.value)}
              />
            </div>
          </>
        )}

        {node.type === 'disconnect' && (
          <>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700">Goodbye Text</label>
              <textarea
                className="block w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-navy-300 focus:border-navy-400 min-h-[60px] resize-none"
                value={config.goodbyeText || ''}
                onChange={(e) => updateConfig('goodbyeText', e.target.value)}
              />
            </div>
            <Select
              label="Reason"
              options={[
                { value: 'completed', label: 'Completed' },
                { value: 'error', label: 'Error' },
                { value: 'user_hangup', label: 'User Hangup' },
                { value: 'timeout', label: 'Timeout' },
              ]}
              value={config.reason || 'completed'}
              onChange={(e) => updateConfig('reason', e.target.value)}
            />
          </>
        )}

        {node.type === 'sheet' && (
          <>
            <Select
              label="Operation"
              options={[
                { value: 'read', label: 'Read' },
                { value: 'write', label: 'Write' },
                { value: 'append', label: 'Append' },
              ]}
              value={config.operation || 'read'}
              onChange={(e) => updateConfig('operation', e.target.value)}
            />
            <Input
              label="Sheet Range"
              placeholder="A1:D10"
              value={config.range || ''}
              onChange={(e) => updateConfig('range', e.target.value)}
            />
          </>
        )}

        {node.type === 'api' && (
          <>
            <Select
              label="Method"
              options={[
                { value: 'GET', label: 'GET' },
                { value: 'POST', label: 'POST' },
                { value: 'PUT', label: 'PUT' },
                { value: 'DELETE', label: 'DELETE' },
              ]}
              value={config.method || 'GET'}
              onChange={(e) => updateConfig('method', e.target.value)}
            />
            <Input
              label="Endpoint URL"
              placeholder="https://api.example.com/endpoint"
              value={config.endpointUrl || ''}
              onChange={(e) => updateConfig('endpointUrl', e.target.value)}
            />
            <Input
              label="Timeout (ms)"
              type="number"
              value={config.timeoutMs || 5000}
              onChange={(e) => updateConfig('timeoutMs', parseInt(e.target.value))}
            />
          </>
        )}

        {node.type === 'outbound_trigger' && (
          <>
            <Select
              label="Trigger Type"
              options={[
                { value: 'immediate', label: 'Immediate' },
                { value: 'scheduled', label: 'Scheduled' },
                { value: 'webhook', label: 'Webhook' },
              ]}
              value={config.triggerType || 'immediate'}
              onChange={(e) => updateConfig('triggerType', e.target.value)}
            />
            <Input
              label="Target Phone"
              placeholder="{{phone}} or +91..."
              value={config.targetPhone || ''}
              onChange={(e) => updateConfig('targetPhone', e.target.value)}
            />
          </>
        )}
      </div>
    </div>
  );
}

function IntentConfigPanel({
  config,
  onUpdate,
}: {
  config: any;
  onUpdate: (key: string, value: any) => void;
}) {
  const intents = config.intents || [];

  function addIntent() {
    onUpdate('intents', [
      ...intents,
      { name: '', examples: [''], outputHandle: `intent-${intents.length}` },
    ]);
  }

  function removeIntent(index: number) {
    onUpdate(
      'intents',
      intents.filter((_: any, i: number) => i !== index),
    );
  }

  function updateIntent(index: number, field: string, value: any) {
    const updated = [...intents];
    updated[index] = { ...updated[index], [field]: value };
    onUpdate('intents', updated);
  }

  function addExample(intentIndex: number) {
    const updated = [...intents];
    updated[intentIndex].examples = [...updated[intentIndex].examples, ''];
    onUpdate('intents', updated);
  }

  function updateExample(intentIndex: number, exampleIndex: number, value: string) {
    const updated = [...intents];
    updated[intentIndex].examples[exampleIndex] = value;
    onUpdate('intents', updated);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700">Intents</label>
        <Button size="sm" variant="ghost" onClick={addIntent}>
          <Plus className="w-3.5 h-3.5 mr-1" />
          Add Intent
        </Button>
      </div>

      {intents.map((intent: any, i: number) => (
        <div key={i} className="p-3 rounded-md border border-gray-100 bg-gray-50/50 space-y-2">
          <div className="flex items-center gap-2">
            <Input
              placeholder="Intent name"
              value={intent.name}
              onChange={(e) => updateIntent(i, 'name', e.target.value)}
              className="flex-1"
            />
            <button onClick={() => removeIntent(i)} className="p-1 text-gray-400 hover:text-red-500">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="space-y-1.5">
            <p className="text-xs text-gray-500">Example phrases:</p>
            {intent.examples.map((ex: string, j: number) => (
              <Input
                key={j}
                placeholder="e.g., Where is my order?"
                value={ex}
                onChange={(e) => updateExample(i, j, e.target.value)}
                className="text-xs"
              />
            ))}
            <button
              onClick={() => addExample(i)}
              className="text-xs text-navy-700 hover:text-navy-900"
            >
              + Add example
            </button>
          </div>
        </div>
      ))}

      <Input
        label="Confidence Threshold"
        type="number"
        step="0.1"
        min="0"
        max="1"
        value={config.confidenceThreshold || 0.7}
        onChange={(e) => onUpdate('confidenceThreshold', parseFloat(e.target.value))}
      />
    </div>
  );
}
