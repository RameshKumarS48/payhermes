import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFunnels } from '../hooks/useFunnels';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import { Plus, Sparkles } from 'lucide-react';

export default function Funnels() {
  const { funnels, loading, generateFunnel } = useFunnels();
  const [showModal, setShowModal] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [name, setName] = useState('');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleGenerate = async (e) => {
    e.preventDefault();
    setError('');
    setGenerating(true);
    try {
      const funnel = await generateFunnel(prompt, name);
      setShowModal(false);
      setPrompt('');
      setName('');
      navigate(`/funnels/${funnel.id}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Generation failed');
    } finally {
      setGenerating(false);
    }
  };

  const columns = [
    { key: 'name', label: 'Name' },
    { key: 'status', label: 'Status', render: (v) => (
      <span className={`text-xs px-2 py-1 rounded-full font-medium ${
        v === 'active' ? 'bg-green-100 text-green-700' :
        v === 'draft' ? 'bg-yellow-100 text-yellow-700' :
        'bg-gray-100 text-gray-700'
      }`}>{v}</span>
    )},
    { key: 'trigger_type', label: 'Trigger' },
    { key: 'leads_processed', label: 'Leads' },
    { key: 'created_at', label: 'Created', render: (v) => new Date(v).toLocaleDateString() },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Funnels</h1>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700"
        >
          <Sparkles size={16} /> Create with AI
        </button>
      </div>

      {loading ? (
        <div className="text-gray-400">Loading funnels...</div>
      ) : (
        <DataTable columns={columns} data={funnels} onRowClick={(row) => navigate(`/funnels/${row.id}`)} />
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Create Funnel with AI">
        <form onSubmit={handleGenerate} className="space-y-4">
          {error && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg">{error}</div>}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Funnel Name (optional)</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="e.g., Solar Lead Qualifier" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Describe your funnel</label>
            <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={5}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="e.g., Qualify solar panel leads by asking if they're homeowners, their monthly electricity bill, and timeline. Book a consultation for qualified leads."
              required minLength={10} />
          </div>
          <button type="submit" disabled={generating}
            className="w-full bg-primary-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50">
            {generating ? 'Generating funnel...' : 'Generate Funnel'}
          </button>
        </form>
      </Modal>
    </div>
  );
}
