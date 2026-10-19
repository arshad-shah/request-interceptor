import React from 'react';
import { useAppStore } from '@/stores/app-store';
import { tabsById } from '@/config/tabs';
import AddRouteForm from '@/components/forms/AddRouteForm';
import SlideOver from '@/components/ui/SlideOver';
import ErrorBoundary from '@/components/common/ErrorBoundary';
import { TabPanel } from '@/components/ui/Tabs';

const TabContent: React.FC = () => {
  const { activeTab, isFormOpen, editingRoute, closeForm } = useAppStore();
  const tab = tabsById[activeTab];

  return (
    <>
      <TabPanel id={activeTab} fullBleed={tab?.fullBleed}>
        {/* Keyed per tab: a crash in one tab never takes down the others, and resets on switch */}
        <ErrorBoundary key={activeTab} scope={tab?.label ?? 'This tab'} variant="inline">
          {tab?.content()}
        </ErrorBoundary>
      </TabPanel>

      <SlideOver
        isOpen={isFormOpen}
        onClose={closeForm}
        title={editingRoute ? 'Edit Route' : 'Add New Route'}
        subtitle={editingRoute ? 'Modify the route configuration' : 'Configure a new interception route'}
      >
        <ErrorBoundary scope="Route editor" variant="inline">
          <AddRouteForm />
        </ErrorBoundary>
      </SlideOver>
    </>
  );
};

export default TabContent;
