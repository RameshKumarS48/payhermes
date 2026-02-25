'use client';

import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

interface MetricsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: { value: number; positive: boolean };
}

export function MetricsCard({ title, value, subtitle, icon: Icon, trend }: MetricsCardProps) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-[0_1px_3px_0_rgba(0,0,0,0.04)]">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="mt-2 text-3xl font-semibold text-gray-900 tracking-tight">{value}</p>
          {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
          {trend && (
            <p
              className={cn(
                'mt-1 text-sm font-medium',
                trend.positive ? 'text-green-600' : 'text-red-600',
              )}
            >
              {trend.positive ? '+' : ''}
              {trend.value}% from last week
            </p>
          )}
        </div>
        <div className="rounded-lg bg-navy-50 p-2.5">
          <Icon className="h-5 w-5 text-navy-700" />
        </div>
      </div>
    </div>
  );
}
