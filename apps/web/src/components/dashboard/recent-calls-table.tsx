'use client';

import { Badge } from '@/components/ui/badge';

interface RecentCall {
  id: string;
  phone: string;
  agent: string;
  direction: string;
  status: string;
  duration: string;
  time: string;
}

const mockCalls: RecentCall[] = [
  { id: '1', phone: '+91 98765 43210', agent: 'Appointment Bot', direction: 'Inbound', status: 'COMPLETED', duration: '2:34', time: '2 min ago' },
  { id: '2', phone: '+91 87654 32109', agent: 'Reminder Bot', direction: 'Outbound', status: 'COMPLETED', duration: '0:45', time: '5 min ago' },
  { id: '3', phone: '+91 76543 21098', agent: 'Support Bot', direction: 'Inbound', status: 'FAILED', duration: '0:12', time: '8 min ago' },
  { id: '4', phone: '+91 65432 10987', agent: 'OTP Bot', direction: 'Outbound', status: 'COMPLETED', duration: '0:22', time: '12 min ago' },
  { id: '5', phone: '+91 54321 09876', agent: 'Appointment Bot', direction: 'Inbound', status: 'IN_PROGRESS', duration: '1:05', time: '15 min ago' },
];

const statusVariant: Record<string, 'success' | 'error' | 'warning' | 'info'> = {
  COMPLETED: 'success',
  FAILED: 'error',
  IN_PROGRESS: 'info',
  INITIATED: 'warning',
};

export function RecentCallsTable() {
  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-[0_1px_3px_0_rgba(0,0,0,0.04)]">
      <div className="px-6 py-4 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-900">Recent Calls</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Agent</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Direction</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {mockCalls.map((call) => (
              <tr key={call.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-6 py-3 font-mono text-gray-900">{call.phone}</td>
                <td className="px-6 py-3 text-gray-700">{call.agent}</td>
                <td className="px-6 py-3">
                  <Badge variant={call.direction === 'Inbound' ? 'info' : 'default'}>
                    {call.direction}
                  </Badge>
                </td>
                <td className="px-6 py-3">
                  <Badge variant={statusVariant[call.status] || 'default'}>
                    {call.status.replace('_', ' ')}
                  </Badge>
                </td>
                <td className="px-6 py-3 text-gray-600 font-mono">{call.duration}</td>
                <td className="px-6 py-3 text-gray-500">{call.time}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
