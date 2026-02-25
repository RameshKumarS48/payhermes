'use client';

import { Handle, Position } from '@xyflow/react';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

interface BaseNodeProps {
  label: string;
  icon: LucideIcon;
  color: string;
  selected?: boolean;
  children?: React.ReactNode;
  handles?: {
    top?: boolean;
    bottom?: boolean;
    left?: boolean;
    right?: boolean;
    outputs?: { id: string; label: string; position: number }[];
  };
}

export function BaseNode({
  label,
  icon: Icon,
  color,
  selected,
  children,
  handles = { top: true, bottom: true },
}: BaseNodeProps) {
  return (
    <div
      className={cn(
        'rounded-lg border bg-white shadow-[0_1px_3px_0_rgba(0,0,0,0.04)] min-w-[200px] max-w-[280px]',
        'transition-shadow duration-150',
        selected
          ? 'border-navy-400 shadow-[0_0_0_2px_rgba(30,58,95,0.15)]'
          : 'border-gray-200 hover:shadow-[0_4px_6px_-1px_rgba(0,0,0,0.06)]',
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-2.5 px-3.5 py-2.5 border-b border-gray-100">
        <div
          className="w-6 h-6 rounded flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: color + '15' }}
        >
          <Icon className="w-3.5 h-3.5" style={{ color }} />
        </div>
        <span className="text-sm font-medium text-gray-800 truncate">{label}</span>
      </div>

      {/* Content */}
      {children && <div className="px-3.5 py-2.5 text-xs text-gray-500">{children}</div>}

      {/* Handles */}
      {handles.top && (
        <Handle
          type="target"
          position={Position.Top}
          className="!w-2.5 !h-2.5 !bg-gray-300 !border-2 !border-white"
        />
      )}
      {handles.bottom && (
        <Handle
          type="source"
          position={Position.Bottom}
          className="!w-2.5 !h-2.5 !bg-gray-300 !border-2 !border-white"
        />
      )}
      {handles.outputs?.map((output) => (
        <Handle
          key={output.id}
          type="source"
          position={Position.Right}
          id={output.id}
          className="!w-2.5 !h-2.5 !bg-navy-400 !border-2 !border-white"
          style={{ top: `${output.position}%` }}
        />
      ))}
    </div>
  );
}
