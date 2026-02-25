'use client';

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
import type { LucideIcon } from 'lucide-react';

interface PaletteItem {
  type: string;
  label: string;
  icon: LucideIcon;
  color: string;
  category: string;
}

const paletteItems: PaletteItem[] = [
  { type: 'start', label: 'Start', icon: Play, color: '#2d6a4f', category: 'Flow' },
  { type: 'introduction', label: 'Introduction', icon: Mic, color: '#2d6a4f', category: 'Flow' },
  { type: 'intent', label: 'Intent', icon: Brain, color: '#1e3a5f', category: 'Flow' },
  { type: 'response', label: 'Response', icon: MessageSquare, color: '#374151', category: 'Flow' },
  { type: 'logic', label: 'Logic', icon: GitBranch, color: '#374151', category: 'Flow' },
  { type: 'fallback', label: 'Fallback', icon: AlertCircle, color: '#991b1b', category: 'Flow' },
  { type: 'disconnect', label: 'Disconnect', icon: PhoneOff, color: '#6b7280', category: 'Flow' },
  { type: 'transfer', label: 'Transfer', icon: PhoneForwarded, color: '#92400e', category: 'Actions' },
  { type: 'api', label: 'API Call', icon: Globe, color: '#4338ca', category: 'Actions' },
  { type: 'sheet', label: 'Sheet', icon: Sheet, color: '#065f46', category: 'Actions' },
  { type: 'knowledge', label: 'Knowledge', icon: BookOpen, color: '#065f46', category: 'Actions' },
  { type: 'payment', label: 'Payment', icon: CreditCard, color: '#92400e', category: 'Actions' },
  { type: 'verification', label: 'Verification', icon: ShieldCheck, color: '#1e3a5f', category: 'Actions' },
  { type: 'outbound_trigger', label: 'Outbound', icon: PhoneOutgoing, color: '#1e3a5f', category: 'Actions' },
];

function onDragStart(event: React.DragEvent, nodeType: string) {
  event.dataTransfer.setData('application/reactflow', nodeType);
  event.dataTransfer.effectAllowed = 'move';
}

export function NodePalette() {
  const categories = [...new Set(paletteItems.map((i) => i.category))];

  return (
    <div className="w-56 bg-white border-r border-gray-200 h-full overflow-y-auto">
      <div className="px-4 py-3 border-b border-gray-100">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Nodes</h3>
      </div>
      <div className="p-3 space-y-4">
        {categories.map((category) => (
          <div key={category}>
            <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-2 px-1">
              {category}
            </p>
            <div className="space-y-1">
              {paletteItems
                .filter((item) => item.category === category)
                .map((item) => (
                  <div
                    key={item.type}
                    draggable
                    onDragStart={(e) => onDragStart(e, item.type)}
                    className="flex items-center gap-2.5 px-2.5 py-2 rounded-md cursor-grab active:cursor-grabbing hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100"
                  >
                    <div
                      className="w-6 h-6 rounded flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: item.color + '15' }}
                    >
                      <item.icon className="w-3.5 h-3.5" style={{ color: item.color }} />
                    </div>
                    <span className="text-sm text-gray-700">{item.label}</span>
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
