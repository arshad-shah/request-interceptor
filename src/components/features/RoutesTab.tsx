import React from 'react';
import RouteControls from './RouteControls';
import RouteList from './RouteList';
import RouteTypeTabs from './RouteTypeTabs';

const RoutesTab: React.FC = () => {
  return (
    <div className="gap-4 flex flex-col">
        <RouteControls />
        <RouteTypeTabs />
        <RouteList />
    </div>
  );
};

export default RoutesTab;
