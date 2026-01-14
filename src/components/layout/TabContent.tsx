import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
      <div className="flex-1 overflow-hidden bg-ds-bg-base">
        <NetworkTab />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto bg-ds-bg-base">
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.2 }}
          className="p-2"
        >
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
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default TabContent;
