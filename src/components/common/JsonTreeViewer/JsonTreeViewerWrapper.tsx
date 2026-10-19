import React, { useMemo } from 'react';
import type { JsonTreeViewerProps } from './types';
import { JsonTreeViewer } from './JsonTreeViewer';

// ============================================================================
// Wrapper for string JSON input
// ============================================================================

interface JsonTreeViewerWrapperProps extends Omit<JsonTreeViewerProps, 'data'> {
  content: string;
  fallback?: React.ReactNode;
}

export function JsonTreeViewerWrapper({
  content,
  fallback,
  ...props
}: JsonTreeViewerWrapperProps) {
  const parsed = useMemo(() => {
    try {
      return JSON.parse(content);
    } catch {
      return null;
    }
  }, [content]);

  if (parsed === null) {
    return fallback ? <>{fallback}</> : (
      <pre className="text-sm font-mono text-red-400 p-3 bg-red-500/10 rounded">
        Invalid JSON
      </pre>
    );
  }

  return <JsonTreeViewer data={parsed} {...props} />;
}
