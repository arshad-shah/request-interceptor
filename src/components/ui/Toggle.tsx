import React from 'react';
import { cn } from '@/lib/utils';

type AccentColor = 'indigo' | 'emerald' | 'rose' | 'amber' | 'cyan' | 'violet';
type ToggleSize = 'sm' | 'md' | 'lg';

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  size?: ToggleSize;
  label?: string;
  className?: string;
  activeColor?: AccentColor;
  /** Render tiny check/× markers inside the track. */
  icons?: boolean;
  /** Pulse a halo ring when checked (e.g. "recording" / "active interceptor"). */
  pulse?: boolean;
}

type SizeSpec = {
  track: string;
  trackRadius: string;
  thumb: number;
  travel: number;
  iconSize: number;
  iconInset: number;
};

const sizes: Record<ToggleSize, SizeSpec> = {
  sm: { track: 'w-[34px] h-[20px]', trackRadius: 'rounded-full', thumb: 14, travel: 14, iconSize: 8, iconInset: 5 },
  md: { track: 'w-[42px] h-[24px]', trackRadius: 'rounded-full', thumb: 18, travel: 18, iconSize: 10, iconInset: 6 },
  lg: { track: 'w-[54px] h-[30px]', trackRadius: 'rounded-full', thumb: 24, travel: 24, iconSize: 12, iconInset: 7 },
};

const accent: Record<AccentColor, { hex: string; soft: string }> = {
  indigo:  { hex: '#6366f1', soft: 'rgba(99,102,241,0.32)' },
  emerald: { hex: '#10b981', soft: 'rgba(16,185,129,0.32)' },
  rose:    { hex: '#f43f5e', soft: 'rgba(244,63,94,0.32)' },
  amber:   { hex: '#f59e0b', soft: 'rgba(245,158,11,0.32)' },
  cyan:    { hex: '#06b6d4', soft: 'rgba(6,182,212,0.32)' },
  violet:  { hex: '#8b5cf6', soft: 'rgba(139,92,246,0.32)' },
};

const Toggle: React.FC<ToggleProps> = ({
  checked,
  onChange,
  disabled = false,
  size = 'md',
  label,
  className,
  activeColor = 'indigo',
  icons = false,
  pulse = false,
}) => {
  const s = sizes[size];
  const c = accent[activeColor];

  // Spring-ish ease for thumb travel.
  const spring = 'cubic-bezier(0.34, 1.56, 0.64, 1)';

  const trackOff: React.CSSProperties = {
    background:
      'linear-gradient(180deg, rgba(0,0,0,0.35) 0%, rgba(255,255,255,0.02) 100%), var(--bg-base)',
    boxShadow:
      'inset 0 1px 2px rgba(0,0,0,0.65), inset 0 0 0 1px var(--border-subtle)',
  };

  const trackOn: React.CSSProperties = {
    background: `linear-gradient(180deg, ${c.hex} 0%, color-mix(in srgb, ${c.hex} 78%, black) 100%)`,
    boxShadow: `inset 0 1px 0 rgba(255,255,255,0.18), inset 0 0 0 1px color-mix(in srgb, ${c.hex} 60%, black), 0 0 0 0 ${c.soft}, 0 0 14px ${c.soft}`,
  };

  const thumbCommon: React.CSSProperties = {
    width: s.thumb,
    height: s.thumb,
    top: '50%',
    left: 3,
    transform: `translate(${checked ? s.travel : 0}px, -50%)${disabled ? '' : ''}`,
    transition: `transform 280ms ${spring}, background 180ms ease, box-shadow 180ms ease`,
  };

  const thumbOff: React.CSSProperties = {
    background: 'linear-gradient(180deg, #52525b 0%, #3f3f46 100%)',
    boxShadow:
      '0 1px 2px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.08), inset 0 -1px 0 rgba(0,0,0,0.4)',
  };

  const thumbOn: React.CSSProperties = {
    background: 'linear-gradient(180deg, #ffffff 0%, #e4e4e7 100%)',
    boxShadow: `0 2px 6px rgba(0,0,0,0.5), 0 0 0 1px color-mix(in srgb, ${c.hex} 25%, black), inset 0 1px 0 rgba(255,255,255,0.9)`,
  };

  return (
    <label
      className={cn(
        'relative inline-flex items-center select-none align-middle',
        disabled ? 'cursor-not-allowed' : 'cursor-pointer',
        'group/toggle',
        className
      )}
      aria-label={label}
      data-checked={checked}
      data-disabled={disabled || undefined}
    >
      <input
        type="checkbox"
        role="switch"
        aria-checked={checked}
        checked={checked}
        onChange={(e) => !disabled && onChange(e.target.checked)}
        disabled={disabled}
        className="peer sr-only"
      />

      {/* Track */}
      <span
        className={cn(
          'relative block shrink-0 overflow-hidden',
          s.track,
          s.trackRadius,
          'transition-[box-shadow,background] duration-200 ease-out',
          // hover tint when off
          !checked && !disabled && 'group-hover/toggle:brightness-125',
          // press squish
          !disabled && 'group-active/toggle:scale-[0.97]',
          // focus ring from peer
          'peer-focus-visible:ring-2 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-offset-(--bg-base)',
          disabled && 'opacity-55',
        )}
        style={{
          ...(checked ? trackOn : trackOff),
          // @ts-expect-error CSS custom property
          '--tw-ring-color': c.hex,
          transition: 'box-shadow 220ms ease, background 220ms ease, transform 120ms ease',
        }}
      >
        {/* Disabled diagonal hatch */}
        {disabled && (
          <span
            aria-hidden
            className="absolute inset-0 pointer-events-none mix-blend-overlay opacity-40"
            style={{
              backgroundImage:
                'repeating-linear-gradient(45deg, rgba(255,255,255,0.08) 0 2px, transparent 2px 5px)',
            }}
          />
        )}

        {/* Pulse halo when on */}
        {checked && pulse && !disabled && (
          <span
            aria-hidden
            className="absolute inset-0 rounded-full pointer-events-none"
            style={{
              boxShadow: `0 0 0 0 ${c.soft}`,
              animation: 'ds-pulse 2s ease-in-out infinite',
            }}
          />
        )}

        {/* Inline icons (check / ×) */}
        {icons && (
          <>
            <span
              aria-hidden
              className="absolute top-1/2 -translate-y-1/2 flex items-center justify-center text-white/95 transition-opacity duration-150"
              style={{
                left: s.iconInset,
                width: s.iconSize,
                height: s.iconSize,
                opacity: checked ? 1 : 0,
              }}
            >
              <svg viewBox="0 0 12 12" fill="none" width={s.iconSize} height={s.iconSize}>
                <path d="M2.5 6.2L5 8.7L9.5 3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <span
              aria-hidden
              className="absolute top-1/2 -translate-y-1/2 flex items-center justify-center text-(--text-tertiary) transition-opacity duration-150"
              style={{
                right: s.iconInset,
                width: s.iconSize,
                height: s.iconSize,
                opacity: checked ? 0 : 1,
              }}
            >
              <svg viewBox="0 0 12 12" fill="none" width={s.iconSize} height={s.iconSize}>
                <path d="M3 3L9 9M9 3L3 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </span>
          </>
        )}

        {/* Thumb */}
        <span
          aria-hidden
          className="absolute rounded-full will-change-transform"
          style={{ ...thumbCommon, ...(checked ? thumbOn : thumbOff) }}
        />
      </span>

    </label>
  );
};

export default Toggle;
