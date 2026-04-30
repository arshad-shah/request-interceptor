import React from 'react';
import { Trash2, Edit, Eye } from 'lucide-react';
import { StorageItem, CookieItem, StorageType } from '@/types/storage';

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
    <div className="divide-y divide-[var(--border-subtle)]">
      {items.map((item, index) => {
        const key = isCookie ? (item as CookieItem).name : (item as StorageItem).key;
        const value = item.value;
        const vType = detectValueType(value);

        return (
          <div
            key={`${key}-${index}`}
            className="flex items-start gap-2 px-3 py-2 hover:bg-[var(--bg-hover)] transition-colors group"
          >
            {/* Key + type badge */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[12px] font-medium text-[var(--text-primary)] truncate">{key}</span>
                <span className={`ds-badge ${vType === 'json' ? 'indigo' : vType === 'boolean' ? 'amber' : vType === 'number' ? 'cyan' : 'gray'}`}>
                  {vType}
                </span>
                {isCookie && (item as CookieItem).secure && (
                  <span className="ds-badge emerald">secure</span>
                )}
                {isCookie && (item as CookieItem).httpOnly && (
                  <span className="ds-badge rose">httpOnly</span>
                )}
              </div>
              <div className="text-[11px] text-[var(--text-tertiary)] font-mono truncate">
                {truncate(value, 100)}
              </div>
              {!isCookie && (
                <div className="text-[10px] text-[var(--text-tertiary)] mt-0.5">
                  {formatSize(key.length + value.length)}
                </div>
              )}
              {isCookie && (
                <div className="text-[10px] text-[var(--text-tertiary)] mt-0.5">
                  {(item as CookieItem).domain} &middot; {(item as CookieItem).path}
                  {(item as CookieItem).expirationDate && (
                    <> &middot; Expires {new Date((item as CookieItem).expirationDate! * 1000).toLocaleDateString()}</>
                  )}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
              <button
                className="ds-icon-btn sm"
                onClick={() => onEdit(key, value)}
                title="Edit"
              >
                <Edit size={12} />
              </button>
              <button
                className="ds-icon-btn sm danger"
                onClick={() => onDelete(key)}
                title="Delete"
              >
                <Trash2 size={12} />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default StorageList;
