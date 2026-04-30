import React, { useState } from 'react';
import { Copy, Check, ChevronRight, ChevronDown } from 'lucide-react';

interface EventPayloadProps {
  data: unknown;
  compact?: boolean;
}

const EventPayload: React.FC<EventPayloadProps> = ({ data, compact }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="relative">
      <button
        onClick={handleCopy}
        className="absolute top-2 right-2 p-1 rounded bg-[var(--bg-hover)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors z-10"
        title="Copy"
      >
        {copied ? <Check size={12} /> : <Copy size={12} />}
      </button>
      <div className={`ds-code-block ${compact ? 'max-h-[150px]' : 'max-h-[300px]'} overflow-auto text-[11px]`}>
        <PayloadValue data={data} depth={0} />
      </div>
    </div>
  );
};

const PayloadValue: React.FC<{ data: unknown; depth: number }> = ({ data, depth }) => {
  const [expanded, setExpanded] = useState(depth < 2);

  if (data === null) return <span className="text-[var(--accent-rose)] italic">null</span>;
  if (data === undefined) return <span className="text-[var(--text-tertiary)] italic">undefined</span>;

  const type = typeof data;
  if (type === 'string') {
    const str = data as string;
    if (str.length > 200) {
      return <span className="text-[var(--accent-emerald)]">"{str.slice(0, 200)}..."</span>;
    }
    return <span className="text-[var(--accent-emerald)]">"{str}"</span>;
  }
  if (type === 'number') return <span className="text-[var(--accent-cyan)]">{String(data)}</span>;
  if (type === 'boolean') return <span className="text-[var(--accent-amber)]">{String(data)}</span>;

  if (Array.isArray(data)) {
    if (data.length === 0) return <span className="text-[var(--text-tertiary)]">[]</span>;
    return (
      <span>
        <button onClick={() => setExpanded(!expanded)} className="inline-flex items-center text-[var(--text-tertiary)] hover:text-[var(--text-primary)]">
          {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        </button>
        <span className="text-[var(--text-secondary)]">[</span>
        {!expanded && <span className="text-[var(--text-tertiary)]"> {data.length} items ]</span>}
        {expanded && (
          <>
            <div className="ml-4">
              {data.slice(0, 50).map((item, i) => (
                <div key={i}>
                  <span className="text-[var(--text-tertiary)]">{i}: </span>
                  <PayloadValue data={item} depth={depth + 1} />
                  {i < data.length - 1 && <span className="text-[var(--text-tertiary)]">,</span>}
                </div>
              ))}
              {data.length > 50 && <div className="text-[var(--text-tertiary)]">... {data.length - 50} more</div>}
            </div>
            <span className="text-[var(--text-secondary)]">]</span>
          </>
        )}
      </span>
    );
  }

  if (type === 'object') {
    const obj = data as Record<string, unknown>;
    const keys = Object.keys(obj);
    if (keys.length === 0) return <span className="text-[var(--text-tertiary)]">{'{}'}</span>;

    // Special types
    if (obj._type === 'Event') {
      return (
        <span>
          <span className="ds-badge indigo text-[10px] mr-1">Event</span>
          <span className="text-[var(--accent-violet)]">{String(obj.type)}</span>
          {obj.detail != null && (
            <span className="ml-1">
              <PayloadValue data={obj.detail as unknown} depth={depth + 1} />
            </span>
          )}
        </span>
      );
    }

    return (
      <span>
        <button onClick={() => setExpanded(!expanded)} className="inline-flex items-center text-[var(--text-tertiary)] hover:text-[var(--text-primary)]">
          {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        </button>
        <span className="text-[var(--text-secondary)]">{'{'}</span>
        {!expanded && <span className="text-[var(--text-tertiary)]"> {keys.length} keys {'}'}</span>}
        {expanded && (
          <>
            <div className="ml-4">
              {keys.slice(0, 50).map((key, i) => (
                <div key={key}>
                  <span className="text-[var(--accent-violet)]">{key}</span>
                  <span className="text-[var(--text-tertiary)]">: </span>
                  <PayloadValue data={obj[key]} depth={depth + 1} />
                  {i < keys.length - 1 && <span className="text-[var(--text-tertiary)]">,</span>}
                </div>
              ))}
              {keys.length > 50 && <div className="text-[var(--text-tertiary)]">... {keys.length - 50} more</div>}
            </div>
            <span className="text-[var(--text-secondary)]">{'}'}</span>
          </>
        )}
      </span>
    );
  }

  return <span className="text-[var(--text-tertiary)]">{String(data)}</span>;
};

export default EventPayload;
