export function AdminStatCard({
  label, value, sub, icon: Icon, accent, delta,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
  accent: string;
  delta?: { value: number; label: string };
}) {
  return (
    <div className="bg-zinc-950 border border-dotted border-zinc-800/80 rounded-2xl p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">{label}</p>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${accent}`}>
          <Icon size={14} />
        </div>
      </div>
      <p className="text-3xl font-bold text-white tabular-nums">
        {typeof value === 'number' ? value.toLocaleString() : value}
      </p>
      <div className="flex items-center justify-between">
        {sub && <p className="text-xs text-zinc-600">{sub}</p>}
        {delta && (
          <span className={`text-xs font-medium ${delta.value >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {delta.value >= 0 ? '+' : ''}{delta.value} {delta.label}
          </span>
        )}
      </div>
    </div>
  );
}
