import { ExternalLink } from 'lucide-react';
import type { TreeNode } from './types';
import { escapeHtml, isUrl, truncateString } from './utils';

interface JsonValueProps {
  type: TreeNode['type'];
  value: unknown;
}

/** Syntax-highlighted primitive value; http(s) strings get an external link. */
export function JsonValue({ type, value }: JsonValueProps) {
  switch (type) {
    case 'string': {
      const strVal = value as string;
      const displayVal = truncateString(strVal, 5000);
      if (isUrl(strVal)) {
        return (
          <span className="jt-string jt-url group/url">
            "{escapeHtml(displayVal)}"
            <a
              href={strVal}
              target="_blank"
              rel="noopener noreferrer"
              className="opacity-0 group-hover/url:opacity-100 ml-1 text-blue-400 hover:text-blue-300"
              onClick={e => e.stopPropagation()}
            >
              <ExternalLink size={10} />
            </a>
          </span>
        );
      }
      return <span className="jt-string">"{escapeHtml(displayVal)}"</span>;
    }
    case 'number':
      return <span className="jt-number">{String(value)}</span>;
    case 'boolean':
      return <span className="jt-boolean">{String(value)}</span>;
    case 'null':
      return <span className="jt-null">null</span>;
    default:
      return <span>{String(value)}</span>;
  }
}
