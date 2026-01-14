import React from 'react';
import { useAppStore } from '@/stores/app-store';
import RouteList from '@/components/features/RouteList';
import AddRouteForm from '@/components/forms/AddRouteForm';
import TemplatesTab from '@/components/features/TemplatesTab';
import RouteControls from '@/components/features/RouteControls';
import { NetworkTab } from '@/components/network';

const TabContent: React.FC = () => {
  const { activeTab } = useAppStore();

  // Network tab uses its own full-height layout
  if (activeTab === 'network') {
    return (
      <div className="flex-1 overflow-hidden bg-[var(--bg-base)]">
        <NetworkTab />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto bg-[var(--bg-base)]">
      <div className="p-2">
        {activeTab === 'routes' && (
          <>
            <RouteControls />
            <div className="mt-6">
              <RouteList />
            </div>
          </>
        )}

        {activeTab === 'add' && <AddRouteForm />}

        {activeTab === 'templates' && <TemplatesTab />}
      </div>
    </div>
  );
};

export default TabContent;
