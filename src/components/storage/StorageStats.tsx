import React from 'react';
import { useStorageStore } from '@/stores/storage-store';

function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const StorageStats: React.FC = () => {
  const { stats } = useStorageStore();

  const items = [
    { label: 'Local', count: stats.localStorageCount, size: stats.localStorageSize, color: 'var(--accent-blue)' },
    { label: 'Session', count: stats.sessionStorageCount, size: stats.sessionStorageSize, color: 'var(--accent-violet)' },
    { label: 'Cookies', count: stats.cookiesCount, size: 0, color: 'var(--accent-amber)' },
    { label: 'IndexedDB', count: stats.indexedDBCount, size: 0, color: 'var(--accent-cyan)' },
  ];

  return (
    <div className="grid grid-cols-4 gap-2 p-2 border-b border-[var(--border-subtle)]">
      {items.map(item => (
        <div key={item.label} className="ds-stat-card compact">
          <span className="ds-stat-value" style={{ color: item.color }}>{item.count}</span>
          <span className="ds-stat-label">
            {item.label}
            {item.size > 0 && <span className="ml-1 text-[var(--text-tertiary)]">({formatSize(item.size * 2)})</span>}
          </span>
        </div>
      ))}
    </div>
  );
};

export default StorageStats;
