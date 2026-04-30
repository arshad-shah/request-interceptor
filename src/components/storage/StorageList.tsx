import React, { useState } from 'react';
import { Trash2, Edit, ChevronRight, ChevronDown } from 'lucide-react';
import { StorageItem, CookieItem, StorageType } from '@/types/storage';
import { JsonTreeViewer } from '@/components/common/JsonTreeViewer';

interface StorageListProps {
  items: StorageItem[] | CookieItem[];
  storageType: StorageType;
  onEdit: (key: string, value: string) => void;
  onDelete: (key: string) => void;
}

function detectValueType(value: string): string {
  try {
    JSON.parse(value);
    return 'json';
  } catch {
    // not json
  }
  if (value === 'true' || value === 'false') return 'boolean';
  if (!isNaN(Number(value)) && value.trim() !== '') return 'number';
  return 'string';
}

function truncate(str: string, max: number): string {
  return str.length > max ? str.slice(0, max) + '...' : str;
}

function formatSize(chars: number): string {
  const bytes = chars * 2;
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

const StorageListItem: React.FC<{
  itemKey: string;
  value: string;
  vType: string;
  isCookie: boolean;
  cookie?: CookieItem;
  size?: number;
  onEdit: (key: string, value: string) => void;
  onDelete: (key: string) => void;
}> = ({ itemKey, value, vType, isCookie, cookie, size, onEdit, onDelete }) => {
  const [expanded, setExpanded] = useState(false);
  const isJson = vType === 'json';

  return (
    <div className="border-b border-[var(--border-subtle)] last:border-b-0">
      <div className="flex items-start gap-2 px-3 py-2 hover:bg-[var(--bg-hover)] transition-colors group">
        {/* Expand toggle for JSON */}
        <div className="flex-shrink-0 mt-0.5">
          {isJson ? (
            <button
              className="p-0.5 text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            </button>
          ) : (
            <span className="inline-block w-[16px]" />
          )}
        </div>

        {/* Key + type badge */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-[12px] font-medium text-[var(--text-primary)] truncate">{itemKey}</span>
            <span className={`ds-badge ${vType === 'json' ? 'indigo' : vType === 'boolean' ? 'amber' : vType === 'number' ? 'cyan' : 'gray'}`}>
              {vType}
            </span>
            {isCookie && cookie?.secure && (
              <span className="ds-badge emerald">secure</span>
            )}
            {isCookie && cookie?.httpOnly && (
              <span className="ds-badge rose">httpOnly</span>
            )}
          </div>
          {!expanded && (
            <div className="text-[11px] text-[var(--text-tertiary)] font-mono truncate">
              {truncate(value, 100)}
            </div>
          )}
          {!isCookie && size != null && (
            <div className="text-[10px] text-[var(--text-tertiary)] mt-0.5">
              {formatSize(size)}
            </div>
          )}
          {isCookie && cookie && (
            <div className="text-[10px] text-[var(--text-tertiary)] mt-0.5">
              {cookie.domain} &middot; {cookie.path}
              {cookie.expirationDate && (
                <> &middot; Expires {new Date(cookie.expirationDate * 1000).toLocaleDateString()}</>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          <button
            className="ds-icon-btn sm"
            onClick={() => onEdit(itemKey, value)}
            title="Edit"
          >
            <Edit size={12} />
          </button>
          <button
            className="ds-icon-btn sm danger"
            onClick={() => onDelete(itemKey)}
            title="Delete"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      {/* Expanded JSON tree */}
      {expanded && isJson && (
        <div className="px-3 pb-2 border-t border-[var(--border-subtle)] bg-[var(--bg-surface)]">
          <JsonTreeViewer
            data={JSON.parse(value)}
            maxHeight={300}
            initialExpandDepth={2}
            compact
            showToolbar
            searchable
            parseEmbeddedJson
          />
        </div>
      )}
    </div>
  );
};

const StorageList: React.FC<StorageListProps> = ({ items, storageType, onEdit, onDelete }) => {
  if (items.length === 0) {
    return (
      <div className="ds-empty-state py-8">
        <div className="ds-empty-title text-[13px]">No items</div>
        <div className="ds-empty-text text-[12px]">
          {storageType === 'indexedDB'
            ? 'No IndexedDB databases found'
            : 'No storage items found'}
        </div>
      </div>
    );
  }

  const isCookie = storageType === 'cookies';

  return (
    <div>
      {items.map((item, index) => {
        const key = isCookie ? (item as CookieItem).name : (item as StorageItem).key;
        const value = item.value;
        const vType = detectValueType(value);

        return (
          <StorageListItem
            key={`${key}-${index}`}
            itemKey={key}
            value={value}
            vType={vType}
            isCookie={isCookie}
            cookie={isCookie ? item as CookieItem : undefined}
            size={!isCookie ? (item as StorageItem).key.length + value.length : undefined}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        );
      })}
    </div>
  );
};

export default StorageList;
