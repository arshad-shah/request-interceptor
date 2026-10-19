/**
 * Small labelled metric card
 */

interface StatCardProps {
  label: string;
  value: string | React.ReactNode;
  subValue?: string;
  icon?: React.ReactNode;
}

export function StatCard({ label, value, subValue, icon }: StatCardProps) {
  return (
    <div className="ds-panel">
      <div className="ds-panel-body">
        <div className="flex items-center gap-1.5 text-[10px] text-[var(--text-tertiary)] mb-1">
          {icon}
          {label}
        </div>
        <div className="font-mono text-[var(--text-primary)]">{value}</div>
        {subValue && (
          <div className="text-[10px] text-[var(--text-tertiary)] mt-0.5">{subValue}</div>
        )}
      </div>
    </div>
  );
}
