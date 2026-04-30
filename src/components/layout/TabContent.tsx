import React from 'react';
import { useAppStore } from '@/stores/app-store';
import RouteList from '@/components/features/RouteList';
import AddRouteForm from '@/components/forms/AddRouteForm';
import TemplatesTab from '@/components/features/TemplatesTab';
import RouteControls from '@/components/features/RouteControls';
import { NetworkTab } from '@/components/network';
import EventsTab from '@/components/events/EventsTab';
import StorageTab from '@/components/storage/StorageTab';

const TabContent: React.FC = () => {
  const { activeTab } = useAppStore();

  // Full-height tabs with no outer overflow
  if (activeTab === 'network' || activeTab === 'events' || activeTab === 'storage') {
    return (
      <div className="flex-1 min-h-0 overflow-hidden bg-[var(--bg-base)]">
        {activeTab === 'network' && <NetworkTab />}
        {activeTab === 'events' && <EventsTab />}
        {activeTab === 'storage' && <StorageTab />}
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 overflow-auto bg-[var(--bg-base)]">
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
