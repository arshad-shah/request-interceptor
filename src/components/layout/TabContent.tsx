import React from 'react';
import { useAppStore } from '@/stores/app-store';
import { tabsById } from '@/config/tabs';
import AddRouteForm from '@/components/forms/AddRouteForm';
import SlideOver from '@/components/ui/SlideOver';
import { TabPanel } from '@/components/ui/Tabs';

const TabContent: React.FC = () => {
  const { activeTab, isFormOpen, editingRoute, closeForm } = useAppStore();
  const tab = tabsById[activeTab];

  return (
    <>
      <TabPanel id={activeTab} fullBleed={tab?.fullBleed}>
        {tab?.content()}
      </TabPanel>

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
