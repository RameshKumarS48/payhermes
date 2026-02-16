const typeColors = {
  message: 'bg-blue-100 border-blue-300 text-blue-800',
  question: 'bg-green-100 border-green-300 text-green-800',
  decision: 'bg-yellow-100 border-yellow-300 text-yellow-800',
  calendar_booking: 'bg-purple-100 border-purple-300 text-purple-800',
  schedule_job: 'bg-gray-100 border-gray-300 text-gray-800',
};

export default function FunnelVisualizer({ funnelJson }) {
  if (!funnelJson || !funnelJson.steps) return <p className="text-gray-400">No funnel data</p>;

  const { steps, entry_step } = funnelJson;

  function getNextSteps(step) {
    const nexts = [];
    if (step.next_step) nexts.push(step.next_step);
    if (step.next_step_booked) nexts.push(step.next_step_booked);
    if (step.next_step_declined) nexts.push(step.next_step_declined);
    if (step.conditions) step.conditions.forEach((c) => { if (c.next_step) nexts.push(c.next_step); });
    if (step.default_step) nexts.push(step.default_step);
    return nexts;
  }

  // Build ordered list from entry
  const ordered = [];
  const visited = new Set();
  const queue = [entry_step];
  while (queue.length > 0) {
    const id = queue.shift();
    if (visited.has(id)) continue;
    visited.add(id);
    const step = steps.find((s) => s.id === id);
    if (!step) continue;
    ordered.push(step);
    getNextSteps(step).forEach((n) => { if (!visited.has(n)) queue.push(n); });
  }
  // Add any unvisited steps
  steps.forEach((s) => { if (!visited.has(s.id)) ordered.push(s); });

  return (
    <div className="space-y-3">
      {ordered.map((step) => (
        <div key={step.id} className={`border rounded-lg p-3 ${typeColors[step.type] || 'bg-white border-gray-200'}`}>
          <div className="flex items-center justify-between mb-1">
            <span className="font-medium text-sm">{step.id}</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-white/50">{step.type}</span>
          </div>
          {step.text && <p className="text-sm">{step.text}</p>}
          {step.variable_name && <p className="text-xs mt-1 opacity-70">Saves to: {step.variable_name}</p>}
          <div className="mt-2 flex flex-wrap gap-1">
            {getNextSteps(step).map((n) => (
              <span key={n} className="text-xs bg-white/60 px-2 py-0.5 rounded">
                &rarr; {n}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
