'use client';

import { MetricsCard } from '@/components/dashboard/metrics-card';
import { RecentCallsTable } from '@/components/dashboard/recent-calls-table';
import { PhoneCall, Bot, GitBranch, CheckCircle, AlertTriangle, TrendingUp } from 'lucide-react';

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">Overview of your voice agent performance</p>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricsCard
          title="Total Calls Today"
          value={127}
          icon={PhoneCall}
          trend={{ value: 12, positive: true }}
        />
        <MetricsCard
          title="Automation Rate"
          value="89%"
          icon={CheckCircle}
          trend={{ value: 3, positive: true }}
        />
        <MetricsCard
          title="Fallback Rate"
          value="4.2%"
          icon={AlertTriangle}
          trend={{ value: -1.1, positive: true }}
        />
        <MetricsCard
          title="Active Agents"
          value={5}
          icon={Bot}
          subtitle="3 workflows live"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-[0_1px_3px_0_rgba(0,0,0,0.04)]">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Call Volume</h3>
          <div className="h-48 flex items-end gap-1.5">
            {[45, 52, 38, 65, 72, 58, 80, 95, 88, 72, 105, 127].map((value, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="w-full bg-navy-100 hover:bg-navy-200 rounded-sm transition-colors"
                  style={{ height: `${(value / 127) * 100}%` }}
                />
                <span className="text-[10px] text-gray-400">
                  {['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'][i]}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-[0_1px_3px_0_rgba(0,0,0,0.04)]">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Automation Breakdown</h3>
          <div className="space-y-4">
            {[
              { label: 'Fully Automated', value: 89, color: 'bg-navy-200' },
              { label: 'Partial (Transferred)', value: 7, color: 'bg-amber-200' },
              { label: 'Failed / Fallback', value: 4, color: 'bg-red-200' },
            ].map((item) => (
              <div key={item.label} className="space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">{item.label}</span>
                  <span className="font-medium text-gray-900">{item.value}%</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${item.color} rounded-full transition-all`}
                    style={{ width: `${item.value}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Calls */}
      <RecentCallsTable />
    </div>
  );
}
