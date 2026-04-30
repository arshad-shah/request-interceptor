import React from 'react';
import { useAppStore } from '@/stores/app-store';
import { tabs } from '@/config/tabs';

const Navigation: React.FC = () => {
  const { activeTab, setActiveTab } = useAppStore();

  return (
    <nav className="flex gap-2 p-3 bg-[var(--bg-elevated)] border-b border-[var(--border-subtle)]">
      <div className="ds-filter-tabs">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`ds-filter-tab ${activeTab === id ? 'active' : ''}`}
          >
            <Icon size={14} className="mr-1.5 inline-block" />
            {label}
          </button>
        ))}
      </div>
    </nav>
  );
};

export default Navigation;
