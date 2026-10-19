import React, { useEffect, useId, useState } from 'react';
import { clsx } from 'clsx';
import { Minus, Plus } from 'lucide-react';

export interface NumberStepperProps {
  value: number;
  /** Called with a clamped, rounded value when the user commits a change. */
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  /** Short unit shown inside the field (e.g. "s", "MB"). */
  unit?: string;
  /** Accessible name. */
  label: string;
  disabled?: boolean;
  className?: string;
}

/**
 * Numeric field with − / + buttons. Typing is committed on Enter or blur;
 * ↑/↓ step by `step` (Shift ×10). Values are always clamped to [min, max].
 */
const NumberStepper: React.FC<NumberStepperProps> = ({
  value,
  onChange,
  min,
  max,
  step = 1,
  unit,
  label,
  disabled = false,
  className,
}) => {
  const id = useId();
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [value]);

  const clamp = (n: number) => Math.min(max, Math.max(min, Math.round(n / step) * step));
  const commit = (n: number) => {
    const next = clamp(n);
    setDraft(String(next));
    if (next !== value) onChange(next);
  };
  const commitDraft = () => {
    const n = Number(draft.trim());
    if (draft.trim() === '' || !Number.isFinite(n)) setDraft(String(value));
    else commit(n);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const delta = (e.shiftKey ? 10 : 1) * step;
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      commit(value + delta);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      commit(value - delta);
    } else if (e.key === 'Enter') {
      commitDraft();
    } else if (e.key === 'Escape') {
      setDraft(String(value));
    }
  };

  const button = (direction: -1 | 1) => {
    const atLimit = direction < 0 ? value <= min : value >= max;
    const Icon = direction < 0 ? Minus : Plus;
    return (
      <button
        type="button"
        tabIndex={-1}
        aria-label={`${direction < 0 ? 'Decrease' : 'Increase'} ${label}`}
        aria-controls={id}
        disabled={disabled || atLimit}
        onClick={() => commit(value + direction * step)}
        className={clsx(
          'flex items-center justify-center w-7 h-full shrink-0',
          'text-[var(--text-tertiary)] transition-colors',
          'hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]',
          'disabled:opacity-40 disabled:pointer-events-none',
          direction < 0 ? 'border-r' : 'border-l',
          'border-[var(--border-subtle)]'
        )}
      >
        <Icon size={12} strokeWidth={2.5} />
      </button>
    );
  };

  return (
    <div
      className={clsx(
        'inline-flex items-stretch h-8 overflow-hidden',
        'rounded-[var(--radius-sm)] bg-[var(--bg-surface)] border border-[var(--border-subtle)]',
        'focus-within:border-[var(--border-focus)] transition-colors',
        disabled && 'opacity-50',
        className
      )}
    >
      {button(-1)}
      <div className="flex items-center justify-end gap-1 px-2 min-w-[72px]">
        <input
          id={id}
          type="text"
          inputMode="numeric"
          role="spinbutton"
          aria-label={label}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={value}
          disabled={disabled}
          value={draft}
          onChange={(e) => setDraft(e.target.value.replace(/[^\d.-]/g, ''))}
          onBlur={commitDraft}
          onKeyDown={onKeyDown}
          size={Math.max(2, String(max).length)}
          className="bg-transparent text-right text-[11px] font-mono tabular-nums text-[var(--text-primary)] outline-none"
        />
        {unit && <span className="text-[10px] text-[var(--text-tertiary)] select-none">{unit}</span>}
      </div>
      {button(1)}
    </div>
  );
};

export default NumberStepper;
