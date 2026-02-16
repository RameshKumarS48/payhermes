import { useState } from 'react';
import { useAppointments } from '../hooks/useAppointments';
import DataTable from '../components/DataTable';

export default function Appointments() {
  const [statusFilter, setStatusFilter] = useState('');
  const { appointments, loading, updateStatus } = useAppointments(statusFilter);

  const statuses = ['', 'scheduled', 'confirmed', 'completed', 'cancelled', 'no_show'];

  const handleAction = async (id, status) => {
    await updateStatus(id, status);
  };

  const columns = [
    { key: 'lead_name', label: 'Lead', render: (v, row) => v || row.lead_phone || '—' },
    { key: 'start_time', label: 'Date & Time', render: (v) => {
      const d = new Date(v);
      return `${d.toLocaleDateString()} at ${d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
    }},
    { key: 'duration_minutes', label: 'Duration', render: (v) => `${v} min` },
    { key: 'status', label: 'Status', render: (v) => (
      <span className={`text-xs px-2 py-1 rounded-full font-medium ${
        v === 'confirmed' ? 'bg-green-100 text-green-700' :
        v === 'scheduled' ? 'bg-blue-100 text-blue-700' :
        v === 'completed' ? 'bg-gray-100 text-gray-700' :
        v === 'cancelled' ? 'bg-red-100 text-red-700' :
        v === 'no_show' ? 'bg-orange-100 text-orange-700' :
        'bg-gray-100 text-gray-700'
      }`}>{v}</span>
    )},
    { key: 'id', label: 'Actions', render: (v, row) => {
      if (row.status === 'completed' || row.status === 'cancelled') return null;
      return (
        <div className="flex gap-1">
          {row.status !== 'completed' && (
            <button onClick={(e) => { e.stopPropagation(); handleAction(v, 'completed'); }}
              className="text-xs bg-green-50 text-green-600 px-2 py-1 rounded hover:bg-green-100">
              Complete
            </button>
          )}
          {row.status !== 'no_show' && (
            <button onClick={(e) => { e.stopPropagation(); handleAction(v, 'no_show'); }}
              className="text-xs bg-orange-50 text-orange-600 px-2 py-1 rounded hover:bg-orange-100">
              No-show
            </button>
          )}
          {row.status !== 'cancelled' && (
            <button onClick={(e) => { e.stopPropagation(); handleAction(v, 'cancelled'); }}
              className="text-xs bg-red-50 text-red-600 px-2 py-1 rounded hover:bg-red-100">
              Cancel
            </button>
          )}
        </div>
      );
    }},
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Appointments</h1>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
          {statuses.map((s) => <option key={s} value={s}>{s || 'All statuses'}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="text-gray-400">Loading appointments...</div>
      ) : (
        <DataTable columns={columns} data={appointments} />
      )}
    </div>
  );
}
