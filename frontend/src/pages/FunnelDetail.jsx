import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import client from '../api/client';
import FunnelVisualizer from '../components/FunnelVisualizer';
import { ArrowLeft, Play, Archive, Save } from 'lucide-react';

export default function FunnelDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [funnel, setFunnel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [jsonText, setJsonText] = useState('');
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState('visual');
  const [error, setError] = useState('');

  useEffect(() => {
    client.get(`/funnels/${id}`)
      .then(({ data }) => {
        setFunnel(data);
        setJsonText(JSON.stringify(data.funnel_json, null, 2));
        setLoading(false);
      })
      .catch(() => { setLoading(false); navigate('/funnels'); });
  }, [id, navigate]);

  const handleSaveJson = async () => {
    setError('');
    setSaving(true);
    try {
      const parsed = JSON.parse(jsonText);
      const { data } = await client.patch(`/funnels/${id}`, { funnel_json: parsed });
      setFunnel(data);
      setJsonText(JSON.stringify(data.funnel_json, null, 2));
    } catch (err) {
      setError(err instanceof SyntaxError ? 'Invalid JSON' : (err.response?.data?.error || 'Save failed'));
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async () => {
    const newStatus = funnel.status === 'active' ? 'draft' : 'active';
    const { data } = await client.patch(`/funnels/${id}`, { status: newStatus });
    setFunnel(data);
  };

  const handleArchive = async () => {
    await client.delete(`/funnels/${id}`);
    navigate('/funnels');
  };

  if (loading) return <div className="text-gray-400">Loading...</div>;
  if (!funnel) return null;

  return (
    <div>
      <button onClick={() => navigate('/funnels')} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4">
        <ArrowLeft size={16} /> Back to Funnels
      </button>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">{funnel.name}</h1>
          {funnel.description && <p className="text-gray-500 mt-1">{funnel.description}</p>}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={toggleStatus}
            className={`flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium ${
              funnel.status === 'active' ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200' : 'bg-green-100 text-green-700 hover:bg-green-200'
            }`}>
            <Play size={14} /> {funnel.status === 'active' ? 'Deactivate' : 'Activate'}
          </button>
          <button onClick={handleArchive}
            className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium bg-red-50 text-red-600 hover:bg-red-100">
            <Archive size={14} /> Archive
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg border p-4">
          <p className="text-sm text-gray-500">Status</p>
          <p className="font-semibold capitalize">{funnel.status}</p>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <p className="text-sm text-gray-500">Trigger</p>
          <p className="font-semibold">{funnel.trigger_type}</p>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <p className="text-sm text-gray-500">Leads Processed</p>
          <p className="font-semibold">{funnel.leads_processed}</p>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <p className="text-sm text-gray-500">Converted</p>
          <p className="font-semibold">{funnel.leads_converted}</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border">
        <div className="flex border-b">
          <button onClick={() => setTab('visual')}
            className={`px-4 py-3 text-sm font-medium ${tab === 'visual' ? 'border-b-2 border-primary-600 text-primary-600' : 'text-gray-500'}`}>
            Visual Flow
          </button>
          <button onClick={() => setTab('json')}
            className={`px-4 py-3 text-sm font-medium ${tab === 'json' ? 'border-b-2 border-primary-600 text-primary-600' : 'text-gray-500'}`}>
            JSON Editor
          </button>
        </div>

        <div className="p-4">
          {tab === 'visual' ? (
            <FunnelVisualizer funnelJson={funnel.funnel_json} />
          ) : (
            <div className="space-y-3">
              {error && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg">{error}</div>}
              <textarea
                value={jsonText}
                onChange={(e) => setJsonText(e.target.value)}
                rows={20}
                className="w-full font-mono text-sm border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <button onClick={handleSaveJson} disabled={saving}
                className="flex items-center gap-1 bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50">
                <Save size={14} /> {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
