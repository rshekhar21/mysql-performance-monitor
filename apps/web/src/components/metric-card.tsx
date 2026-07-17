import type { ReactNode } from 'react';
import { StatusBadge } from './status-badge';

export function MetricCard({
  label,
  value,
  unit,
  status,
  icon
}: {
  label: string;
  value: string;
  unit?: string;
  status?: string;
  icon?: ReactNode;
}) {
  return (
    <div className="rounded border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-muted">{label}</span>
        {icon}
      </div>
      <div className="mt-3 flex items-end gap-2">
        <span className="text-2xl font-semibold text-ink">{value}</span>
        {unit ? <span className="pb-1 text-sm text-muted">{unit}</span> : null}
      </div>
      {status ? (
        <div className="mt-3">
          <StatusBadge label={status} tone="neutral" />
        </div>
      ) : null}
    </div>
  );
}
