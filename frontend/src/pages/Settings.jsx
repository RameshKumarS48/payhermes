import { useState, useEffect } from 'react';
import client from '../api/client';

const tabs = ['Messaging', 'Business Hours', 'Calendar', 'Team'];

export default function Settings() {
  const [activeTab, setActiveTab] = useState('Messaging');

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

      {activeTab === 'Messaging' && <MessagingSettings />}
      {activeTab === 'Business Hours' && <BusinessHoursSettings />}
      {activeTab === 'Calendar' && <CalendarSettings />}
      {activeTab === 'Team' && <TeamSettings />}
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
