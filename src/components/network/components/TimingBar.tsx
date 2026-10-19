/**
 * Horizontal bar for a single timing phase
 */

interface TimingBarProps {
  name: string;
  value: number;
  maxValue: number;
  color: string;
  formatValue: (v: number) => string;
}

export function TimingBar({ name, value, maxValue, color, formatValue }: TimingBarProps) {
  const percentage = Math.max((value / maxValue) * 100, 3);

  return (
    <div className="flex items-center gap-3">
      <span className="w-[90px] text-[11px] font-medium text-[var(--text-secondary)] truncate">
        {name}
      </span>
      <div className="flex-1 h-5 bg-[var(--bg-surface)] rounded-[var(--radius-sm)] overflow-hidden">
        <div
          className="h-full rounded-[var(--radius-sm)] flex items-center justify-end px-2
            text-[10px] font-mono font-medium text-white transition-all duration-300"
          style={{
            width: `${percentage}%`,
            backgroundColor: color,
            minWidth: value > 0 ? '40px' : '0',
          }}
        >
          {percentage > 20 ? formatValue(value) : ''}
        </div>
      </div>
      <span className="w-[60px] text-right font-mono text-[11px] text-[var(--text-secondary)]">
        {formatValue(value)}
      </span>
    </div>
  );
}
