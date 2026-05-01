import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

export type TabItem<T extends string = string> = {
  id: T;
  label: string;
  icon?: React.ComponentType<{ size?: number | string; className?: string }>;
  badge?: React.ReactNode;
  disabled?: boolean;
};

export type TabsVariant = 'underline' | 'pill' | 'segmented';
export type TabsSize = 'sm' | 'md';

interface TabsProps<T extends string> {
  items: TabItem<T>[];
  value: T;
  onChange: (value: T) => void;
  variant?: TabsVariant;
  size?: TabsSize;
  align?: 'start' | 'center' | 'stretch';
  className?: string;
  /** ARIA label for the tablist */
  ariaLabel?: string;
}

type IndicatorRect = { left: number; width: number; ready: boolean };

function Tabs<T extends string>({
  items,
  value,
  onChange,
  variant = 'underline',
  size = 'md',
  align = 'start',
  className,
  ariaLabel,
}: TabsProps<T>) {
  const listRef = useRef<HTMLDivElement | null>(null);
  const btnRefs = useRef<Map<T, HTMLButtonElement>>(new Map());
  const [rect, setRect] = useState<IndicatorRect>({ left: 0, width: 0, ready: false });

  const measure = useCallback(() => {
    const btn = btnRefs.current.get(value);
    const list = listRef.current;
    if (!btn || !list) return;
    const btnBox = btn.getBoundingClientRect();
    const listBox = list.getBoundingClientRect();
    setRect({ left: btnBox.left - listBox.left + list.scrollLeft, width: btnBox.width, ready: true });
  }, [value]);

  useLayoutEffect(() => { measure(); }, [measure, items.length]);

  useEffect(() => {
    const list = listRef.current;
    if (!list || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => measure());
    ro.observe(list);
    btnRefs.current.forEach((b) => ro.observe(b));
    return () => ro.disconnect();
  }, [measure]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const enabled = items.filter((i) => !i.disabled);
    const idx = enabled.findIndex((i) => i.id === value);
    if (idx < 0) return;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      onChange(enabled[(idx + 1) % enabled.length].id);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      onChange(enabled[(idx - 1 + enabled.length) % enabled.length].id);
    } else if (e.key === 'Home') {
      e.preventDefault();
      onChange(enabled[0].id);
    } else if (e.key === 'End') {
      e.preventDefault();
      onChange(enabled[enabled.length - 1].id);
    }
  };

  const sizing = size === 'sm'
    ? { padX: 10, padY: 6, font: 11, gap: 6, iconSize: 13, listGap: 2 }
    : { padX: 14, padY: 9, font: 12, gap: 7, iconSize: 14, listGap: 4 };

  return (
    <div
      ref={listRef}
      role="tablist"
      aria-label={ariaLabel}
      onKeyDown={onKeyDown}
      className={cn(
        'relative flex overflow-x-auto ds-scrollbar-none',
        align === 'stretch' && 'w-full',
        align === 'center' && 'justify-center',
        variant === 'pill' && 'p-[3px] bg-(--bg-base) rounded-[8px]',
        variant === 'segmented' && 'p-[3px] bg-(--bg-elevated) rounded-[8px]',
        className,
      )}
      style={{ gap: variant === 'underline' ? sizing.listGap : 2 }}
    >
      {/* Sliding indicator */}
      <span
        aria-hidden
        className="absolute pointer-events-none"
        style={{
          left: 0,
          transform: `translateX(${rect.left}px)`,
          width: rect.width,
          opacity: rect.ready ? 1 : 0,
          transition: rect.ready
            ? 'transform 280ms cubic-bezier(0.65, 0, 0.35, 1), width 280ms cubic-bezier(0.65, 0, 0.35, 1), opacity 160ms ease'
            : 'none',
          ...indicatorStyle(variant),
        }}
      />

      {items.map((item) => {
        const active = item.id === value;
        const Icon = item.icon;
        return (
          <button
            key={item.id}
            ref={(el) => {
              if (el) btnRefs.current.set(item.id, el);
              else btnRefs.current.delete(item.id);
            }}
            role="tab"
            type="button"
            aria-selected={active}
            aria-controls={`tabpanel-${item.id}`}
            id={`tab-${item.id}`}
            tabIndex={active ? 0 : -1}
            disabled={item.disabled}
            onClick={() => !item.disabled && onChange(item.id)}
            className={cn(
              'relative inline-flex items-center justify-center whitespace-nowrap select-none shrink-0',
              'transition-colors duration-150 ease-out',
              'focus-visible:outline-none',
              align === 'stretch' && 'flex-1 min-w-fit',
              item.disabled && 'opacity-40 cursor-not-allowed',
              tabTextClass(active, variant),
            )}
            style={{
              gap: sizing.gap,
              padding: `${sizing.padY}px ${sizing.padX}px`,
              fontSize: sizing.font,
              fontWeight: active ? 600 : 500,
              letterSpacing: '0.01em',
              borderRadius: variant === 'underline' ? 6 : 6,
              background: 'transparent',
              border: 'none',
              cursor: item.disabled ? 'not-allowed' : 'pointer',
              zIndex: 1,
            }}
          >
            {Icon && <Icon size={sizing.iconSize} className="shrink-0" />}
            <span>{item.label}</span>
            {item.badge != null && (
              <span
                className="inline-flex items-center justify-center font-semibold"
                style={{
                  marginLeft: 2,
                  minWidth: 18,
                  height: 16,
                  padding: '0 5px',
                  fontSize: 9.5,
                  borderRadius: 999,
                  background: active
                    ? 'color-mix(in srgb, var(--accent-indigo) 28%, transparent)'
                    : 'var(--bg-surface)',
                  color: active ? 'var(--accent-indigo)' : 'var(--text-tertiary)',
                  letterSpacing: '0.02em',
                }}
              >
                {item.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function tabTextClass(active: boolean, variant: TabsVariant): string {
  if (variant === 'pill' || variant === 'segmented') {
    return active ? 'text-(--text-primary)' : 'text-(--text-tertiary) hover:text-(--text-secondary)';
  }
  // underline
  return active ? 'text-(--text-primary)' : 'text-(--text-tertiary) hover:text-(--text-secondary)';
}

function indicatorStyle(variant: TabsVariant): React.CSSProperties {
  if (variant === 'pill') {
    return {
      top: 3,
      bottom: 3,
      borderRadius: 6,
      background: 'var(--bg-surface)',
      boxShadow: '0 1px 2px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04)',
    };
  }
  if (variant === 'segmented') {
    return {
      top: 3,
      bottom: 3,
      borderRadius: 6,
      background:
        'linear-gradient(180deg, color-mix(in srgb, var(--accent-indigo) 18%, transparent) 0%, color-mix(in srgb, var(--accent-indigo) 8%, transparent) 100%)',
      border: '1px solid color-mix(in srgb, var(--accent-indigo) 38%, transparent)',
      boxShadow: '0 0 12px color-mix(in srgb, var(--accent-indigo) 22%, transparent)',
    };
  }
  // underline — a glowing 2px gradient bar
  return {
    bottom: 0,
    height: 2,
    borderRadius: 2,
    background:
      'linear-gradient(90deg, var(--accent-indigo) 0%, var(--accent-cyan) 100%)',
    boxShadow:
      '0 0 8px color-mix(in srgb, var(--accent-indigo) 50%, transparent), 0 0 14px color-mix(in srgb, var(--accent-cyan) 30%, transparent)',
  };
}

interface TabPanelProps {
  id: string;
  children: React.ReactNode;
  className?: string;
  /** When true: no padding, no scroll — child controls overflow (charts, tables, etc). */
  fullBleed?: boolean;
}

const TabPanel: React.FC<TabPanelProps> = ({ id, children, className, fullBleed }) => (
  <div
    role="tabpanel"
    id={`tabpanel-${id}`}
    aria-labelledby={`tab-${id}`}
    className={cn(
      'flex-1 min-h-0 bg-(--bg-base) outline-none',
      fullBleed ? 'overflow-hidden' : 'overflow-auto',
      className,
    )}
  >
    {fullBleed ? children : <div className="p-3">{children}</div>}
  </div>
);

export default Tabs;
export { TabPanel };
