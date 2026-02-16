import { useState, useEffect } from 'react';
import client from '../api/client';
import StatsCard from '../components/StatsCard';
import DataTable from '../components/DataTable';
import { Users, CheckCircle, Calendar, MessageSquare } from 'lucide-react';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    client.get('/dashboard').then(({ data }) => { setData(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-gray-400">Loading dashboard...</div>;
  if (!data) return <div className="text-gray-400">Failed to load dashboard</div>;

  const { stats, recentLeads, upcomingAppointments, funnelStats } = data;

  const leadColumns = [
    { key: 'name', label: 'Name', render: (v, row) => v || row.phone },
    { key: 'status', label: 'Status', render: (v) => (
      <span className={`text-xs px-2 py-1 rounded-full font-medium ${
        v === 'booked' ? 'bg-green-100 text-green-700' :
        v === 'in_progress' ? 'bg-blue-100 text-blue-700' :
        v === 'qualified' ? 'bg-purple-100 text-purple-700' :
        'bg-gray-100 text-gray-700'
      }`}>{v}</span>
    )},
    { key: 'source', label: 'Source' },
    { key: 'created_at', label: 'Date', render: (v) => new Date(v).toLocaleDateString() },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatsCard label="Leads (7 days)" value={stats.leads} icon={Users} />
        <StatsCard label="Qualified Rate" value={`${stats.qualifiedRate}%`} icon={CheckCircle} />
        <StatsCard label="Booked Rate" value={`${stats.bookedRate}%`} icon={Calendar} />
        <StatsCard label="Messages" value={stats.messages} icon={MessageSquare} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h2 className="text-lg font-semibold mb-3">Recent Leads</h2>
          <DataTable columns={leadColumns} data={recentLeads} />
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-3">Upcoming Appointments</h2>
          {upcomingAppointments.length > 0 ? (
            <div className="bg-white rounded-lg shadow-sm border divide-y">
              {upcomingAppointments.map((appt) => (
                <div key={appt.id} className="p-4 flex justify-between items-center">
                  <div>
                    <p className="font-medium">{appt.lead_name || appt.lead_phone}</p>
                    <p className="text-sm text-gray-500">
                      {new Date(appt.start_time).toLocaleDateString()} at{' '}
                      {new Date(appt.start_time).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                    </p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    appt.status === 'confirmed' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                  }`}>{appt.status}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm border p-8 text-center text-gray-400">No upcoming appointments</div>
          )}

          {funnelStats.length > 0 && (
            <>
              <h2 className="text-lg font-semibold mt-6 mb-3">Active Funnels</h2>
              <div className="bg-white rounded-lg shadow-sm border divide-y">
                {funnelStats.map((f) => (
                  <div key={f.id} className="p-4 flex justify-between items-center">
                    <span className="font-medium">{f.name}</span>
                    <div className="text-sm text-gray-500">
                      {f.leads_processed} leads &middot; {f.leads_converted} converted
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
