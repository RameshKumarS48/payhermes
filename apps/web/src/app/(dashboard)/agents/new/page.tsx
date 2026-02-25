'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

const useCaseOptions = [
  { value: 'CUSTOMER_SUPPORT', label: 'Customer Support' },
  { value: 'APPOINTMENT_BOOKING', label: 'Appointment Booking' },
  { value: 'ORDER_STATUS', label: 'Order Status' },
  { value: 'PAYMENT_REMINDER', label: 'Payment Reminder' },
  { value: 'OTP_VERIFICATION', label: 'OTP Verification' },
  { value: 'SURVEY', label: 'Survey' },
  { value: 'LEAD_QUALIFICATION', label: 'Lead Qualification' },
  { value: 'CUSTOM', label: 'Custom' },
];

const languageOptions = [
  { value: 'en-US', label: 'English' },
  { value: 'hi-IN', label: 'Hindi' },
  { value: 'hinglish', label: 'Hinglish' },
];

const environmentOptions = [
  { value: 'sandbox', label: 'Sandbox' },
  { value: 'production', label: 'Production' },
];

export default function NewAgentPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: '',
    description: '',
    useCase: 'CUSTOMER_SUPPORT',
    language: 'en-US',
    environment: 'sandbox',
  });

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    // TODO: API call to create agent
    // For now, redirect to workflow builder with mock ID
    setTimeout(() => {
      router.push('/agents/new-agent/workflow');
    }, 500);
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/agents"
          className="p-1.5 rounded-md hover:bg-gray-100 text-gray-500 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">Create Agent</h1>
          <p className="mt-0.5 text-sm text-gray-500">Configure your new voice agent</p>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 shadow-[0_1px_3px_0_rgba(0,0,0,0.04)]">
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <Input
            id="name"
            label="Agent Name"
            placeholder="e.g., Appointment Booking Bot"
            value={form.name}
            onChange={(e) => update('name', e.target.value)}
            required
          />

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-700">Description</label>
            <textarea
              className="block w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-navy-300 focus:border-navy-400 transition-colors min-h-[80px] resize-none"
              placeholder="What will this agent do?"
              value={form.description}
              onChange={(e) => update('description', e.target.value)}
            />
          </div>

          <Select
            id="useCase"
            label="Use Case"
            options={useCaseOptions}
            value={form.useCase}
            onChange={(e) => update('useCase', e.target.value)}
          />

          <Select
            id="language"
            label="Language"
            options={languageOptions}
            value={form.language}
            onChange={(e) => update('language', e.target.value)}
          />

          <Select
            id="environment"
            label="Environment"
            options={environmentOptions}
            value={form.environment}
            onChange={(e) => update('environment', e.target.value)}
          />

          <div className="flex items-center gap-3 pt-2">
            <Button type="submit" disabled={loading || !form.name}>
              {loading ? 'Creating...' : 'Create Agent'}
            </Button>
            <Link href="/agents">
              <Button type="button" variant="secondary">
                Cancel
              </Button>
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
