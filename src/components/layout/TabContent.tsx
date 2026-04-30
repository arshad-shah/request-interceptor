import React from 'react';
import { useAppStore } from '@/stores/app-store';
import RouteList from '@/components/features/RouteList';
import AddRouteForm from '@/components/forms/AddRouteForm';
import TemplatesTab from '@/components/features/TemplatesTab';
import RouteControls from '@/components/features/RouteControls';
import { NetworkTab } from '@/components/network';
import EventsTab from '@/components/events/EventsTab';
import StorageTab from '@/components/storage/StorageTab';
import SlideOver from '@/components/ui/SlideOver';

const TabContent: React.FC = () => {
  const { activeTab, isFormOpen, editingRoute, closeForm } = useAppStore();

  return (
    <>
      {/* Full-height tabs with no outer overflow */}
      {(activeTab === 'network' || activeTab === 'events' || activeTab === 'storage') ? (
        <div className="flex-1 min-h-0 overflow-hidden bg-[var(--bg-base)]">
          {activeTab === 'network' && <NetworkTab />}
          {activeTab === 'events' && <EventsTab />}
          {activeTab === 'storage' && <StorageTab />}
        </div>
      ) : (
        <div className="flex-1 min-h-0 overflow-auto bg-[var(--bg-base)]">
          <div className="p-3">
            {activeTab === 'routes' && (
              <>
                <RouteControls />
                <div className="mt-6">
                  <RouteList />
                </div>
              </>
            )}

            {activeTab === 'templates' && <TemplatesTab />}
          </div>
        </div>
      )}

      {/* Slide-over form overlay */}
      <SlideOver
        isOpen={isFormOpen}
        onClose={closeForm}
        title={editingRoute ? 'Edit Route' : 'Add New Route'}
        subtitle={editingRoute ? 'Modify the route configuration' : 'Configure a new interception route'}
      >
        <AddRouteForm />
      </SlideOver>
    </>
  );
};

export default TabContent;
