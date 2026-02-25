'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardContent } from '@/components/ui/card';

export default function SettingsPage() {
  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-gray-500">Manage your organization and integrations</p>
      </div>

      <Card>
        <CardHeader>
          <h3 className="text-sm font-semibold text-gray-900">Organization</h3>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input label="Organization Name" defaultValue="Acme Corp" />
          <Input label="Slug" defaultValue="acme-corp" disabled />
          <Button size="sm">Save Changes</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h3 className="text-sm font-semibold text-gray-900">Twilio Configuration</h3>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input label="Account SID" placeholder="AC..." type="password" />
          <Input label="Auth Token" placeholder="..." type="password" />
          <Input label="Phone Number" placeholder="+1..." />
          <Button size="sm">Save Twilio Config</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h3 className="text-sm font-semibold text-gray-900">Deepgram Configuration</h3>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input label="API Key" placeholder="..." type="password" />
          <Button size="sm">Save Deepgram Config</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h3 className="text-sm font-semibold text-gray-900">Google Sheets</h3>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input label="Service Account Email" placeholder="bot@project.iam.gserviceaccount.com" />
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-700">Private Key</label>
            <textarea
              className="block w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-navy-300 focus:border-navy-400 min-h-[80px] resize-none font-mono text-xs"
              placeholder="-----BEGIN PRIVATE KEY-----"
            />
          </div>
          <Button size="sm">Save Sheets Config</Button>
        </CardContent>
      </Card>
    </div>
  );
}
