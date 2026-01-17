import React, { forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(({
  className,
  label,
  error,
  helperText,
  id,
  ...props
}, ref) => {
  const textareaId = id || `textarea-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div className="space-y-1">
      {label && (
        <label
          htmlFor={textareaId}
          className="ds-label"
        >
          {label}
        </label>
      )}

      <textarea
        ref={ref}
        id={textareaId}
        className={cn(
          "w-full px-3 py-2 border rounded-[var(--radius-md)]",
          "bg-[var(--bg-surface)] text-[var(--text-primary)] placeholder-[var(--text-tertiary)]",
          "border-[var(--border-subtle)]",
          "focus:outline-none focus:ring-2 focus:ring-[var(--accent-cyan)] focus:border-[var(--accent-cyan)]",
          "transition-all duration-200 resize-vertical",
          "disabled:bg-[var(--bg-elevated)] disabled:text-[var(--text-tertiary)] disabled:cursor-not-allowed",
          "font-mono text-sm leading-relaxed",
          error && "border-[var(--accent-rose)] focus:border-[var(--accent-rose)] focus:ring-[rgba(244,63,94,0.2)]",
          className
        )}
        rows={6}
        {...props}
      />

      {(error || helperText) && (
        <p className={cn(
          "text-sm",
          error ? "text-[var(--accent-rose)]" : "text-[var(--text-tertiary)]"
        )}>
          {error || helperText}
        </p>
      )}
    </div>
  );
});

Textarea.displayName = 'Textarea';

export default Textarea;
