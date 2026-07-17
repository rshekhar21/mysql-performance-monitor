import { clsx } from 'clsx';

export function StatusBadge({
  label,
  tone = 'neutral'
}: {
  label: string;
  tone?: 'neutral' | 'success' | 'warning' | 'critical';
}) {
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded px-2 py-1 text-xs font-medium',
        tone === 'success' && 'bg-emerald-50 text-success ring-1 ring-emerald-200',
        tone === 'warning' && 'bg-amber-50 text-warning ring-1 ring-amber-200',
        tone === 'critical' && 'bg-red-50 text-critical ring-1 ring-red-200',
        tone === 'neutral' && 'bg-slate-100 text-slate-700 ring-1 ring-slate-200'
      )}
    >
      {label}
    </span>
  );
}
