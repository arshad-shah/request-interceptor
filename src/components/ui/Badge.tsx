import React from 'react';
import { cn } from '@/lib/utils';
import { HttpMethod } from '@/types';

type BadgeColor =
  | 'default'
  | 'indigo'
  | 'blue'
  | 'cyan'
  | 'emerald'
  | 'amber'
  | 'rose'
  | 'violet'
  | 'pink'
  | 'orange'
  | 'yellow'
  | 'info'
  | 'success'
  | 'error'
  | 'warning';

type BadgeAppearance = 'soft' | 'solid' | 'outline' | 'glass';
type BadgeSize = 'sm' | 'md' | 'lg';

interface BadgeProps {
  children?: React.ReactNode;
  variant?: BadgeColor;
  appearance?: BadgeAppearance;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  size?: BadgeSize;
  /** Leading status dot. */
  dot?: boolean;
  /** Pulses the leading dot — pair with `dot`. */
  pulse?: boolean;
  /** Adds a clickable × that triggers this callback. */
  onRemove?: () => void;
  /** Adds hover lift + cursor when interactive. */
  onClick?: () => void;
  className?: string;
  title?: string;
}

interface MethodBadgeProps {
  method: HttpMethod;
  appearance?: BadgeAppearance;
  size?: BadgeSize;
  className?: string;
}

interface StatusBadgeProps {
  status: number;
  appearance?: BadgeAppearance;
  size?: BadgeSize;
  className?: string;
}

// Resolve semantic → palette color
const semanticMap: Record<string, BadgeColor> = {
  info: 'cyan',
  success: 'emerald',
  error: 'rose',
  warning: 'amber',
};

// Color palette — each maps to a hex (for inline styles where Tailwind tokens fall short)
const palette: Record<Exclude<BadgeColor, 'default' | 'info' | 'success' | 'error' | 'warning'>, string> = {
  indigo:  '#6366f1',
  blue:    '#3b82f6',
  cyan:    '#06b6d4',
  emerald: '#10b981',
  amber:   '#f59e0b',
  rose:    '#f43f5e',
  violet:  '#8b5cf6',
  pink:    '#ec4899',
  orange:  '#f97316',
  yellow:  '#eab308',
};

const sizeSpec: Record<BadgeSize, { padX: number; padY: number; font: number; gap: number; dot: number; radius: number }> = {
  sm: { padX: 6,  padY: 1, font: 9.5, gap: 4, dot: 5,  radius: 4 },
  md: { padX: 8,  padY: 2, font: 10,  gap: 5, dot: 6,  radius: 5 },
  lg: { padX: 11, padY: 4, font: 12,  gap: 6, dot: 7,  radius: 6 },
};

function resolveColor(variant: BadgeColor): { hex: string; isDefault: boolean } {
  if (variant === 'default') return { hex: '#a1a1aa', isDefault: true };
  const mapped = semanticMap[variant] ?? variant;
  const hex = palette[mapped as keyof typeof palette] ?? '#a1a1aa';
  return { hex, isDefault: false };
}

function appearanceStyle(
  appearance: BadgeAppearance,
  hex: string,
  isDefault: boolean,
): React.CSSProperties {
  if (appearance === 'solid') {
    return {
      background: `linear-gradient(180deg, ${hex} 0%, color-mix(in srgb, ${hex} 80%, black) 100%)`,
      color: '#fff',
      border: `1px solid color-mix(in srgb, ${hex} 65%, black)`,
      boxShadow: `inset 0 1px 0 rgba(255,255,255,0.18), 0 1px 2px rgba(0,0,0,0.4)`,
    };
  }
  if (appearance === 'outline') {
    return {
      background: 'transparent',
      color: isDefault ? 'var(--text-secondary)' : hex,
      border: `1px solid ${isDefault ? 'var(--border-default)' : `color-mix(in srgb, ${hex} 55%, transparent)`}`,
    };
  }
  if (appearance === 'glass') {
    return {
      background: isDefault
        ? 'rgba(255,255,255,0.04)'
        : `color-mix(in srgb, ${hex} 12%, transparent)`,
      color: isDefault ? 'var(--text-secondary)' : hex,
      border: `1px solid ${isDefault ? 'rgba(255,255,255,0.08)' : `color-mix(in srgb, ${hex} 28%, transparent)`}`,
      backdropFilter: 'blur(8px) saturate(140%)',
      WebkitBackdropFilter: 'blur(8px) saturate(140%)',
      boxShadow: `inset 0 1px 0 rgba(255,255,255,0.06)`,
    };
  }
  // soft (default)
  return {
    background: isDefault ? 'var(--bg-surface)' : `color-mix(in srgb, ${hex} 16%, transparent)`,
    color: isDefault ? 'var(--text-tertiary)' : hex,
    border: `1px solid ${isDefault ? 'transparent' : `color-mix(in srgb, ${hex} 22%, transparent)`}`,
  };
}

const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  appearance = 'soft',
  icon,
  iconPosition = 'left',
  size = 'md',
  dot = false,
  pulse = false,
  onRemove,
  onClick,
  className,
  title,
}) => {
  const { hex, isDefault } = resolveColor(variant);
  const s = sizeSpec[size];
  const interactive = !!onClick;

  const style: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: s.gap,
    padding: `${s.padY}px ${s.padX}px`,
    borderRadius: s.radius,
    fontSize: s.font,
    fontWeight: 600,
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
    fontFamily: 'var(--font-sans)',
    lineHeight: 1.2,
    whiteSpace: 'nowrap',
    transition: 'transform 120ms ease, box-shadow 120ms ease, background 120ms ease',
    cursor: interactive ? 'pointer' : undefined,
    userSelect: 'none',
    ...appearanceStyle(appearance, hex, isDefault),
  };

  const dotColor = appearance === 'solid' ? 'rgba(255,255,255,0.95)' : hex;

  return (
    <span
      className={cn('ui-badge', interactive && 'ui-badge--interactive', className)}
      style={style}
      onClick={onClick}
      title={title}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
    >
      {dot && (
        <span
          aria-hidden
          style={{
            position: 'relative',
            display: 'inline-block',
            width: s.dot,
            height: s.dot,
            borderRadius: '50%',
            background: dotColor,
            boxShadow: appearance === 'solid' ? 'none' : `0 0 0 2px color-mix(in srgb, ${hex} 18%, transparent)`,
            flexShrink: 0,
          }}
        >
          {pulse && (
            <span
              aria-hidden
              style={{
                position: 'absolute',
                inset: 0,
                borderRadius: '50%',
                background: dotColor,
                animation: 'ds-pulse 1.6s ease-in-out infinite',
              }}
            />
          )}
        </span>
      )}

      {icon && iconPosition === 'left' && (
        <span style={{ display: 'inline-flex', alignItems: 'center', flexShrink: 0 }}>{icon}</span>
      )}

      {children != null && <span>{children}</span>}

      {icon && iconPosition === 'right' && (
        <span style={{ display: 'inline-flex', alignItems: 'center', flexShrink: 0 }}>{icon}</span>
      )}

      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          aria-label="Remove"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: s.dot + 6,
            height: s.dot + 6,
            marginRight: -2,
            padding: 0,
            border: 'none',
            background: 'transparent',
            color: 'currentColor',
            opacity: 0.6,
            borderRadius: '50%',
            cursor: 'pointer',
            transition: 'opacity 120ms ease, background 120ms ease',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.6'; e.currentTarget.style.background = 'transparent'; }}
        >
          <svg width={s.dot + 2} height={s.dot + 2} viewBox="0 0 12 12" fill="none">
            <path d="M3 3L9 9M9 3L3 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      )}
    </span>
  );
};

const methodColor: Record<HttpMethod, BadgeColor> = {
  GET:     'indigo',
  POST:    'emerald',
  PUT:     'amber',
  PATCH:   'cyan',
  DELETE:  'rose',
  HEAD:    'default',
  OPTIONS: 'default',
};

const MethodBadge: React.FC<MethodBadgeProps> = ({ method, appearance = 'soft', size = 'md', className }) => (
  <Badge variant={methodColor[method]} appearance={appearance} size={size} className={className}>
    {method}
  </Badge>
);

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, appearance = 'soft', size = 'md', className }) => {
  let variant: BadgeColor = 'default';
  let pulse = false;

  if (status === 0 || Number.isNaN(status)) {
    variant = 'amber';
    pulse = true;
  } else if (status >= 200 && status < 300) {
    variant = 'emerald';
  } else if (status >= 300 && status < 400) {
    variant = 'indigo';
  } else if (status >= 400 && status < 500) {
    variant = 'amber';
  } else if (status >= 500) {
    variant = 'rose';
  }

  return (
    <Badge variant={variant} appearance={appearance} size={size} dot pulse={pulse} className={className}>
      {status === 0 || Number.isNaN(status) ? 'PENDING' : status}
    </Badge>
  );
};

export default Badge;
export { MethodBadge, StatusBadge };
