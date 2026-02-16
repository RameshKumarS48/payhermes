import { useState, useEffect } from 'react';
import client from '../api/client';
import { Copy, RefreshCw, Check } from 'lucide-react';

const tabs = ['Integrations', 'Messaging', 'Business Hours', 'Calendar', 'Team'];

export default function Settings() {
  const [activeTab, setActiveTab] = useState('Integrations');

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Settings</h1>
      <div className="flex gap-1 border-b mb-6">
        {tabs.map((t) => (
          <button key={t} onClick={() => setActiveTab(t)}
            className={`px-4 py-2 text-sm font-medium ${activeTab === t ? 'border-b-2 border-primary-600 text-primary-600' : 'text-gray-500 hover:text-gray-700'}`}>
            {t}
          </button>
        ))}
      </div>

      {activeTab === 'Integrations' && <IntegrationsSettings />}
      {activeTab === 'Messaging' && <MessagingSettings />}
      {activeTab === 'Business Hours' && <BusinessHoursSettings />}
      {activeTab === 'Calendar' && <CalendarSettings />}
      {activeTab === 'Team' && <TeamSettings />}
    </div>
  );
}

function IntegrationsSettings() {
  return (
    <div className="space-y-6 max-w-2xl">
      <ApiKeySection />
      <MetaSection />
      <WebhookDocsSection />
    </div>
  );
}

function ApiKeySection() {
  const [apiKey, setApiKey] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    client.get('/settings/api-key').then(({ data }) => { setApiKey(data.api_key); setLoading(false); });
  }, []);

  const generate = async () => {
    const { data } = await client.post('/settings/api-key/generate');
    setApiKey(data.api_key);
  };

  const copy = () => {
    navigator.clipboard.writeText(apiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white rounded-lg border p-6 space-y-4">
      <h2 className="font-semibold">API Key</h2>
      <p className="text-sm text-gray-500">
        Use this key to send leads from Zapier, Make, or any platform via <code className="bg-gray-100 px-1 rounded">POST /api/webhooks/inbound?api_key=YOUR_KEY</code>
      </p>

      {loading ? (
        <p className="text-sm text-gray-400">Loading...</p>
      ) : apiKey ? (
        <div className="flex items-center gap-2">
          <code className="flex-1 bg-gray-50 border rounded-lg px-3 py-2 text-sm font-mono truncate">{apiKey}</code>
          <button onClick={copy} className="p-2 hover:bg-gray-100 rounded-lg" title="Copy">
            {copied ? <Check size={16} className="text-green-600" /> : <Copy size={16} />}
          </button>
          <button onClick={generate} className="p-2 hover:bg-gray-100 rounded-lg" title="Regenerate">
            <RefreshCw size={16} />
          </button>
        </div>
      ) : (
        <button onClick={generate}
          className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700">
          Generate API Key
        </button>
      )}
    </div>
  );
}

function MetaSection() {
  const [form, setForm] = useState({ meta_page_id: '', meta_access_token: '' });
  const [webhookUrl, setWebhookUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    client.get('/settings/meta').then(({ data }) => {
      setForm((f) => ({ ...f, meta_page_id: data.meta_page_id }));
      setWebhookUrl(data.webhook_url);
    });
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      await client.put('/settings/meta', form);
      setMessage('Saved');
    } catch (err) {
      setMessage(err.response?.data?.error || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-lg border p-6 space-y-4">
      <h2 className="font-semibold">Facebook / Instagram Lead Ads</h2>
      <p className="text-sm text-gray-500">
        Connect Meta Lead Ads to automatically import leads when someone fills out your ad form.
      </p>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm space-y-2">
        <p className="font-medium text-blue-800">Setup steps:</p>
        <ol className="list-decimal list-inside text-blue-700 space-y-1">
          <li>Go to Meta Business Suite &rarr; All Tools &rarr; Business Apps</li>
          <li>Create an app (type: Business), add the "Webhooks" product</li>
          <li>Subscribe to <strong>Page &rarr; leadgen</strong> events</li>
          <li>Set the callback URL to: <code className="bg-blue-100 px-1 rounded">{webhookUrl}</code></li>
          <li>Set a verify token and add it as <code className="bg-blue-100 px-1 rounded">META_VERIFY_TOKEN</code> in your server env</li>
          <li>Enter your Page ID and Page Access Token below</li>
        </ol>
      </div>

      <form onSubmit={handleSave} className="space-y-3">
        {message && <div className={`text-sm p-2 rounded ${message === 'Saved' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>{message}</div>}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Facebook Page ID</label>
          <input type="text" value={form.meta_page_id} onChange={(e) => setForm({ ...form, meta_page_id: e.target.value })}
            className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="123456789012345" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Page Access Token</label>
          <input type="password" value={form.meta_access_token} onChange={(e) => setForm({ ...form, meta_access_token: e.target.value })}
            className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="EAAxxxxxxxx..." />
        </div>
        <button type="submit" disabled={saving}
          className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50">
          {saving ? 'Saving...' : 'Save Meta Config'}
        </button>
      </form>
    </div>
  );
}

function WebhookDocsSection() {
  const [copied, setCopied] = useState(false);

  const example = `curl -X POST "https://yourserver.com/api/webhooks/inbound?api_key=ph_xxx" \\
  -H "Content-Type: application/json" \\
  -d '{
    "phone": "+15551234567",
    "name": "Jane Smith",
    "email": "jane@example.com",
    "source": "google_ads"
  }'`;

  const copy = () => {
    navigator.clipboard.writeText(example);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white rounded-lg border p-6 space-y-4">
      <h2 className="font-semibold">Zapier / Make / Custom Integrations</h2>
      <p className="text-sm text-gray-500">
        Send leads from any platform using the generic webhook. Just POST to the endpoint with your API key.
      </p>

      <div className="bg-gray-50 border rounded-lg p-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs font-medium text-gray-500">EXAMPLE REQUEST</span>
          <button onClick={copy} className="text-xs text-primary-600 hover:underline">
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
        <pre className="text-xs font-mono text-gray-700 whitespace-pre-wrap">{example}</pre>
      </div>

      <div className="text-sm text-gray-600 space-y-1">
        <p><strong>Required:</strong> <code className="bg-gray-100 px-1 rounded">phone</code> (E.164 format preferred)</p>
        <p><strong>Optional:</strong> <code className="bg-gray-100 px-1 rounded">name</code>, <code className="bg-gray-100 px-1 rounded">email</code>, <code className="bg-gray-100 px-1 rounded">source</code>, <code className="bg-gray-100 px-1 rounded">metadata</code> (object)</p>
        <p><strong>Auth:</strong> <code className="bg-gray-100 px-1 rounded">?api_key=</code> query param or <code className="bg-gray-100 px-1 rounded">X-API-Key</code> header</p>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-700">
        The lead will be routed to your most recently created active funnel with trigger type "new_lead".
        Make sure you have at least one active funnel before sending leads.
      </div>
    </div>
  );
}

function MessagingSettings() {
  const [form, setForm] = useState({ twilio_account_sid: '', twilio_auth_token: '', twilio_phone_number: '', whatsapp_enabled: false });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    client.get('/settings/messaging').then(({ data }) => {
      setForm((f) => ({ ...f, twilio_account_sid: data.twilio_account_sid, twilio_phone_number: data.twilio_phone_number, whatsapp_enabled: data.whatsapp_enabled }));
    });
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      await client.put('/settings/messaging', form);
      setMessage('Saved successfully');
    } catch (err) {
      setMessage(err.response?.data?.error || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="bg-white rounded-lg border p-6 max-w-lg space-y-4">
      <h2 className="font-semibold">Twilio Configuration</h2>
      {message && <div className={`text-sm p-3 rounded-lg ${message.includes('fail') ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>{message}</div>}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Account SID</label>
        <input type="text" value={form.twilio_account_sid} onChange={(e) => setForm({ ...form, twilio_account_sid: e.target.value })}
          className="w-full border rounded-lg px-3 py-2 text-sm" required />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Auth Token</label>
        <input type="password" value={form.twilio_auth_token} onChange={(e) => setForm({ ...form, twilio_auth_token: e.target.value })}
          className="w-full border rounded-lg px-3 py-2 text-sm" required />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
        <input type="text" value={form.twilio_phone_number} onChange={(e) => setForm({ ...form, twilio_phone_number: e.target.value })}
          className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="+1234567890" required />
      </div>
      <label className="flex items-center gap-2">
        <input type="checkbox" checked={form.whatsapp_enabled} onChange={(e) => setForm({ ...form, whatsapp_enabled: e.target.checked })}
          className="rounded" />
        <span className="text-sm">Enable WhatsApp</span>
      </label>
      <button type="submit" disabled={saving}
        className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50">
        {saving ? 'Saving...' : 'Save'}
      </button>
    </form>
  );
}

function BusinessHoursSettings() {
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const [timezone, setTimezone] = useState('America/New_York');
  const [hours, setHours] = useState(() => {
    const h = {};
    days.forEach((d) => { h[d] = { enabled: !['saturday', 'sunday'].includes(d), start: '09:00', end: '17:00' }; });
    return h;
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    client.get('/settings/business-hours').then(({ data }) => {
      if (data.timezone) setTimezone(data.timezone);
      if (data.hours && Object.keys(data.hours).length) setHours(data.hours);
    });
  }, []);

  const updateDay = (day, field, value) => {
    setHours((h) => ({ ...h, [day]: { ...h[day], [field]: value } }));
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    try {
      await client.put('/settings/business-hours', { timezone, hours });
      setMessage('Saved successfully');
    } catch (err) {
      setMessage(err.response?.data?.error || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-lg border p-6 max-w-lg space-y-4">
      <h2 className="font-semibold">Business Hours</h2>
      {message && <div className="text-sm p-3 rounded-lg bg-green-50 text-green-600">{message}</div>}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Timezone</label>
        <input type="text" value={timezone} onChange={(e) => setTimezone(e.target.value)}
          className="w-full border rounded-lg px-3 py-2 text-sm" />
      </div>
      <div className="space-y-2">
        {days.map((day) => (
          <div key={day} className="flex items-center gap-3">
            <label className="flex items-center gap-2 w-28">
              <input type="checkbox" checked={hours[day]?.enabled} onChange={(e) => updateDay(day, 'enabled', e.target.checked)} className="rounded" />
              <span className="text-sm capitalize">{day}</span>
            </label>
            <input type="time" value={hours[day]?.start} onChange={(e) => updateDay(day, 'start', e.target.value)}
              className="border rounded px-2 py-1 text-sm" disabled={!hours[day]?.enabled} />
            <span className="text-gray-400">to</span>
            <input type="time" value={hours[day]?.end} onChange={(e) => updateDay(day, 'end', e.target.value)}
              className="border rounded px-2 py-1 text-sm" disabled={!hours[day]?.enabled} />
          </div>
        ))}
      </div>
      <button onClick={handleSave} disabled={saving}
        className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50">
        {saving ? 'Saving...' : 'Save'}
      </button>
    </div>
  );
}

function CalendarSettings() {
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    client.get('/settings/calendar/availability').then(({ data }) => setConnected(data.connected));
  }, []);

  return (
    <div className="bg-white rounded-lg border p-6 max-w-lg space-y-4">
      <h2 className="font-semibold">Google Calendar</h2>
      <p className="text-sm text-gray-500">
        Connect your Google Calendar to let the system check availability and book appointments.
      </p>
      {connected ? (
        <div className="bg-green-50 text-green-700 p-3 rounded-lg text-sm">Calendar connected</div>
      ) : (
        <button className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700">
          Connect Google Calendar
        </button>
      )}
    </div>
  );
}

function TeamSettings() {
  return (
    <div className="bg-white rounded-lg border p-6 max-w-lg space-y-4">
      <h2 className="font-semibold">Team Members</h2>
      <p className="text-sm text-gray-500">Invite team members to manage your PayHermes account.</p>
      <div className="flex gap-2">
        <input type="email" placeholder="Email address" className="flex-1 border rounded-lg px-3 py-2 text-sm" />
        <button className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700">
          Invite
        </button>
      </div>
    </div>
  );
}
