'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bot, Plus, Phone, GitBranch, ChevronRight } from 'lucide-react';

interface Agent {
  id: string;
  name: string;
  useCase: string;
  language: string;
  isActive: boolean;
  workflowCount: number;
  callCount: number;
}

const mockAgents: Agent[] = [
  { id: '1', name: 'Appointment Booking Bot', useCase: 'APPOINTMENT_BOOKING', language: 'en-US', isActive: true, workflowCount: 2, callCount: 1247 },
  { id: '2', name: 'Payment Reminder Bot', useCase: 'PAYMENT_REMINDER', language: 'hi-IN', isActive: true, workflowCount: 1, callCount: 856 },
  { id: '3', name: 'Order Status Bot', useCase: 'ORDER_STATUS', language: 'hinglish', isActive: true, workflowCount: 3, callCount: 2103 },
  { id: '4', name: 'OTP Verification Bot', useCase: 'OTP_VERIFICATION', language: 'en-US', isActive: false, workflowCount: 1, callCount: 445 },
];

const useCaseLabels: Record<string, string> = {
  CUSTOMER_SUPPORT: 'Customer Support',
  APPOINTMENT_BOOKING: 'Appointment Booking',
  ORDER_STATUS: 'Order Status',
  PAYMENT_REMINDER: 'Payment Reminder',
  OTP_VERIFICATION: 'OTP Verification',
  SURVEY: 'Survey',
  LEAD_QUALIFICATION: 'Lead Qualification',
  CUSTOM: 'Custom',
};

const langLabels: Record<string, string> = {
  'en-US': 'English',
  'hi-IN': 'Hindi',
  'hinglish': 'Hinglish',
};

export default function AgentsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">Agents</h1>
          <p className="mt-1 text-sm text-gray-500">Create and manage your voice agents</p>
        </div>
        <Link href="/agents/new">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Create Agent
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {mockAgents.map((agent) => (
          <Link
            key={agent.id}
            href={`/agents/${agent.id}/workflow`}
            className="group rounded-lg border border-gray-200 bg-white p-5 shadow-[0_1px_3px_0_rgba(0,0,0,0.04)] hover:shadow-[0_4px_6px_-1px_rgba(0,0,0,0.06)] transition-all"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-navy-50 p-2.5 mt-0.5">
                  <Bot className="w-5 h-5 text-navy-700" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 group-hover:text-navy-900 transition-colors">
                    {agent.name}
                  </h3>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {useCaseLabels[agent.useCase]}
                  </p>
                  <div className="flex items-center gap-3 mt-3">
                    <Badge variant={agent.isActive ? 'success' : 'default'}>
                      {agent.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                    <span className="text-xs text-gray-400">{langLabels[agent.language]}</span>
                  </div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors mt-1" />
            </div>

            <div className="flex items-center gap-6 mt-4 pt-4 border-t border-gray-100">
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <GitBranch className="w-3.5 h-3.5" />
                {agent.workflowCount} workflows
              </div>
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <Phone className="w-3.5 h-3.5" />
                {agent.callCount.toLocaleString()} calls
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
