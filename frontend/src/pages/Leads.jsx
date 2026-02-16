import { useState } from 'react';
import { useLeads } from '../hooks/useLeads';
import DataTable from '../components/DataTable';
import ConversationDrawer from '../components/ConversationDrawer';
import client from '../api/client';

export default function Leads() {
  const [statusFilter, setStatusFilter] = useState('');
  const { leads, total, loading } = useLeads({ status: statusFilter });
  const [selectedLead, setSelectedLead] = useState(null);
  const [drawerLoading, setDrawerLoading] = useState(false);

  const handleRowClick = async (row) => {
    setDrawerLoading(true);
    try {
      const { data } = await client.get(`/leads/${row.id}`);
      setSelectedLead(data);
    } catch {
      setSelectedLead(row);
    } finally {
      setDrawerLoading(false);
    }
  };

  const statuses = ['', 'new', 'in_progress', 'qualified', 'booked', 'completed', 'disqualified'];

  const columns = [
    { key: 'name', label: 'Name', render: (v, row) => v || row.phone },
    { key: 'phone', label: 'Phone' },
    { key: 'status', label: 'Status', render: (v) => (
      <span className={`text-xs px-2 py-1 rounded-full font-medium ${
        v === 'booked' ? 'bg-green-100 text-green-700' :
        v === 'in_progress' ? 'bg-blue-100 text-blue-700' :
        v === 'qualified' ? 'bg-purple-100 text-purple-700' :
        v === 'new' ? 'bg-yellow-100 text-yellow-700' :
        v === 'disqualified' ? 'bg-red-100 text-red-700' :
        'bg-gray-100 text-gray-700'
      }`}>{v}</span>
    )},
    { key: 'source', label: 'Source' },
    { key: 'created_at', label: 'Created', render: (v) => new Date(v).toLocaleDateString() },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Leads <span className="text-gray-400 text-lg font-normal">({total})</span></h1>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
          {statuses.map((s) => <option key={s} value={s}>{s || 'All statuses'}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="text-gray-400">Loading leads...</div>
      ) : (
        <DataTable columns={columns} data={leads} onRowClick={handleRowClick} />
      )}

      {(selectedLead || drawerLoading) && (
        <ConversationDrawer lead={selectedLead} onClose={() => setSelectedLead(null)} />
      )}
    </div>
  );
}
