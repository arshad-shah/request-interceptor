import React from 'react';
import { useAppStore } from '@/stores/app-store';
import { tabs } from '@/config/tabs';
import Tabs from '@/components/ui/Tabs';

const Navigation: React.FC = () => {
  const { activeTab, setActiveTab } = useAppStore();

  return (
    <nav className="px-3 pt-2 bg-(--bg-elevated)">
      <Tabs
        items={tabs}
        value={activeTab}
        onChange={setActiveTab}
        variant="segmented"
        size="md"
        ariaLabel="Main navigation"
      />
    </nav>
  );
};

export default Navigation;
