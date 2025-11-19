import React from 'react';
import { useAppStore } from '@/stores/app-store';
import { tabs } from '@/config/tabs';
import { cn } from '@/lib/utils';

const Navigation: React.FC = () => {
  const { activeTab, setActiveTab } = useAppStore();

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-20">
      <div className="px-4">
        <div className="flex items-center h-12">
          {/* Tab Navigation */}
          <div className="flex items-center bg-gray-50 rounded-lg p-0.5">
            {tabs.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={cn(
                  'flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200',
                  'focus:outline-none focus:ring-2 focus:ring-blue-500/20',
                  activeTab === id
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
                )}
                aria-current={activeTab === id ? 'page' : undefined}
                role="tab"
                aria-selected={activeTab === id}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:block whitespace-nowrap">
                  {label}
                </span>
              </button>
            ))}
          </div>
          
          {/* Active tab label for mobile */}
          <div className="sm:hidden ml-4">
            <span className="text-sm font-medium text-gray-700">
              {tabs.find(tab => tab.id === activeTab)?.label}
            </span>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;