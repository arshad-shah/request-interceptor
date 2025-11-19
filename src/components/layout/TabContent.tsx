import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/stores/app-store';
import RouteList from '@/components/features/RouteList';
import AddRouteForm from '@/components/forms/AddRouteForm';
import TemplatesTab from '@/components/features/TemplatesTab';
import RouteControls from '@/components/features/RouteControls';

const TabContent: React.FC = () => {
  const { activeTab } = useAppStore();

  return (
    <div className="flex-1 overflow-auto">
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
