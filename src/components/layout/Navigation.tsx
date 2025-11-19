import React from 'react';
import { useAppStore } from '@/stores/app-store';
import { tabs } from '@/config/tabs';
import Button from '@/components/ui/Button';

const Navigation: React.FC = () => {
  const { activeTab, setActiveTab } = useAppStore();

  return (
    <nav className="bg-white/80 backdrop-blur-md border-b border-gray-200/50 sticky top-0 z-20 shadow-sm">
      <div className="px-4 sm:px-6">
        <div className="flex items-center justify-between h-14">
          
          {/* Tab Navigation */}
          <div className="flex items-center space-x-1 bg-gray-100/50 rounded-lg p-1">
            {tabs.map(({ id, label, icon: Icon }) => (
              <Button
                key={id}
                variant={activeTab === id ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setActiveTab(id)}
                aria-current={activeTab === id ? 'page' : undefined}
                role="tab"
                aria-selected={activeTab === id}
                leftIcon={<Icon className="w-4 h-4" />}
              >
                <span className="hidden sm:block whitespace-nowrap">
                  {label}
                </span>
              </Button>
            ))}
          </div>
        </div>
        
        {/* Mobile tab labels - shown on small screens */}
        <div className="sm:hidden pb-2">
          <div className="text-center">
            <span className="text-sm font-medium text-gray-700">
              {tabs.find(tab => tab.id === activeTab)?.label}
            </span>
          </div>
        </div>
      </div>
      
      {/* Subtle gradient overlay */}
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" />
    </nav>
  );
};

export default Navigation;