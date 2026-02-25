'use client';

import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Search, Filter } from 'lucide-react';
import { useState } from 'react';

const mockCalls = [
  { id: '1', date: '2026-02-25', time: '14:23', phone: '+91 98765 43210', agent: 'Appointment Bot', direction: 'INBOUND', status: 'COMPLETED', intent: 'book_appointment', duration: '2:34', escalated: false, paymentStatus: '-' },
  { id: '2', date: '2026-02-25', time: '14:18', phone: '+91 87654 32109', agent: 'Reminder Bot', direction: 'OUTBOUND', status: 'COMPLETED', intent: '-', duration: '0:45', escalated: false, paymentStatus: '-' },
  { id: '3', date: '2026-02-25', time: '14:12', phone: '+91 76543 21098', agent: 'Support Bot', direction: 'INBOUND', status: 'FAILED', intent: 'refund_request', duration: '0:12', escalated: true, paymentStatus: '-' },
  { id: '4', date: '2026-02-25', time: '14:05', phone: '+91 65432 10987', agent: 'OTP Bot', direction: 'OUTBOUND', status: 'COMPLETED', intent: '-', duration: '0:22', escalated: false, paymentStatus: '-' },
  { id: '5', date: '2026-02-25', time: '13:58', phone: '+91 54321 09876', agent: 'Order Bot', direction: 'INBOUND', status: 'COMPLETED', intent: 'check_status', duration: '1:48', escalated: false, paymentStatus: 'Confirmed' },
  { id: '6', date: '2026-02-25', time: '13:45', phone: '+91 43210 98765', agent: 'Appointment Bot', direction: 'INBOUND', status: 'COMPLETED', intent: 'cancel_appointment', duration: '1:15', escalated: false, paymentStatus: '-' },
  { id: '7', date: '2026-02-25', time: '13:30', phone: '+91 32109 87654', agent: 'Reminder Bot', direction: 'OUTBOUND', status: 'NO_ANSWER', intent: '-', duration: '0:30', escalated: false, paymentStatus: 'Pending' },
  { id: '8', date: '2026-02-25', time: '13:22', phone: '+91 21098 76543', agent: 'Support Bot', direction: 'INBOUND', status: 'COMPLETED', intent: 'order_status', duration: '3:12', escalated: false, paymentStatus: '-' },
];

const statusVariant: Record<string, 'success' | 'error' | 'warning' | 'info' | 'default'> = {
  COMPLETED: 'success',
  FAILED: 'error',
  NO_ANSWER: 'warning',
  IN_PROGRESS: 'info',
  INITIATED: 'default',
};

export default function CallsPage() {
  const [search, setSearch] = useState('');

  const filteredCalls = mockCalls.filter(
    (call) =>
      call.phone.includes(search) ||
      call.agent.toLowerCase().includes(search.toLowerCase()) ||
      call.intent.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">Call Logs</h1>
        <p className="mt-1 text-sm text-gray-500">View and search all call history</p>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            className="w-full pl-9 pr-3 py-2 rounded-md border border-gray-200 bg-white text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-navy-300 focus:border-navy-400"
            placeholder="Search by phone, agent, or intent..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white shadow-[0_1px_3px_0_rgba(0,0,0,0.04)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Agent</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Direction</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Intent</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Duration</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Escalated</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Payment</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredCalls.map((call) => (
                <tr key={call.id} className="hover:bg-gray-50/50 transition-colors cursor-pointer">
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{call.date} {call.time}</td>
                  <td className="px-4 py-3 font-mono text-gray-900 whitespace-nowrap">{call.phone}</td>
                  <td className="px-4 py-3 text-gray-700">{call.agent}</td>
                  <td className="px-4 py-3">
                    <Badge variant={call.direction === 'INBOUND' ? 'info' : 'default'}>{call.direction}</Badge>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{call.intent}</td>
                  <td className="px-4 py-3">
                    <Badge variant={statusVariant[call.status]}>{call.status.replace('_', ' ')}</Badge>
                  </td>
                  <td className="px-4 py-3 font-mono text-gray-600">{call.duration}</td>
                  <td className="px-4 py-3">
                    {call.escalated ? <Badge variant="warning">Yes</Badge> : <span className="text-gray-400">No</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{call.paymentStatus}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
