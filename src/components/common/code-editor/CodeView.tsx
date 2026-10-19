import React from 'react';
import { useCodeMirror } from './useCodeMirror';
import { normalizeLanguage, type CodeLanguage } from './languages';

export interface CodeViewProps {
  content: string;
  language?: CodeLanguage | string;
  wrap?: boolean;
  lineNumbers?: boolean;
  maxHeight?: number | string;
  className?: string;
  ariaLabel?: string;
}

/** Read-only, syntax-highlighted code with search (⌘F); virtualized, so large bodies stay fast. */
const CodeView: React.FC<CodeViewProps> = ({
  content,
  language = 'text',
  wrap = true,
  lineNumbers = true,
  maxHeight,
  className,
  ariaLabel,
}) => {
  const ref = useCodeMirror({
    value: content,
    language: normalizeLanguage(language),
    readOnly: true,
    lineNumbers,
    wrap,
    ariaLabel: ariaLabel ?? 'Code',
  });
  return (
    <div
      ref={ref}
      className={className}
      style={{ maxHeight, overflow: 'auto', ['--code-font-size' as string]: '12px' }}
    />
  );
};

export default CodeView;
