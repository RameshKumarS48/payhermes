export default function StatsCard({ label, value, subtitle, icon: Icon }) {
  return (
    <div className="bg-white rounded-lg shadow-sm border p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
          {subtitle && <p className="text-sm text-gray-400 mt-1">{subtitle}</p>}
        </div>
        {Icon && (
          <div className="bg-primary-50 p-3 rounded-lg">
            <Icon size={24} className="text-primary-600" />
          </div>
        )}
      </div>
    </div>
  );
}
