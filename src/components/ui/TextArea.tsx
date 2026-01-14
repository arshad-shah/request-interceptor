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
          className="block text-sm font-medium text-gray-700 transition-colors"
        >
          {label}
        </label>
      )}
      
      <textarea
        ref={ref}
        id={textareaId}
        className={cn(
          "w-full px-3 py-2 border border-gray-300 rounded-lg",
          "bg-white text-gray-900 placeholder-gray-500",
          "focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500",
          "transition-all duration-200 resize-vertical",
          "disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed",
          "font-mono text-sm leading-relaxed",
          error && "border-red-300 focus:border-red-500 focus:ring-red-200",
          className
        )}
        rows={6}
        {...props}
      />
      
      {(error || helperText) && (
        <p className={cn(
          "text-sm",
          error ? "text-red-600" : "text-gray-500"
        )}>
          {error || helperText}
        </p>
      )}
    </div>
  );
});

Textarea.displayName = 'Textarea';

export default Textarea;