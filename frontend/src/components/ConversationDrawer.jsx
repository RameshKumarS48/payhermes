import { X } from 'lucide-react';

export default function ConversationDrawer({ lead, onClose }) {
  if (!lead) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white shadow-xl flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h2 className="font-semibold">{lead.name || lead.phone}</h2>
            <p className="text-sm text-gray-500">{lead.phone}</p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X size={20} />
          </button>
        </div>

        {lead.collected_data && Object.keys(lead.collected_data).length > 0 && (
          <div className="p-4 border-b bg-gray-50">
            <h3 className="text-sm font-medium text-gray-600 mb-2">Collected Data</h3>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(lead.collected_data)
                .filter(([k]) => !k.startsWith('_'))
                .map(([k, v]) => (
                  <div key={k}>
                    <span className="text-xs text-gray-400">{k}</span>
                    <p className="text-sm font-medium">{String(v)}</p>
                  </div>
                ))}
            </div>
          </div>
        )}

        <div className="flex-1 overflow-auto p-4 space-y-3">
          {(lead.messages || []).map((msg) => (
            <div
              key={msg.id}
              className={`max-w-[80%] p-3 rounded-lg text-sm ${
                msg.direction === 'outbound'
                  ? 'bg-primary-500 text-white ml-auto'
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              {msg.body}
              <div className={`text-xs mt-1 ${msg.direction === 'outbound' ? 'text-primary-200' : 'text-gray-400'}`}>
                {new Date(msg.created_at).toLocaleTimeString()}
              </div>
            </div>
          ))}
          {(!lead.messages || lead.messages.length === 0) && (
            <p className="text-gray-400 text-center py-8">No messages yet</p>
          )}
        </div>
      </div>
    </div>
  );
}
