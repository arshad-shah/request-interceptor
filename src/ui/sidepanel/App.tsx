import React, { useEffect } from 'react';
import { useBackgroundState } from '@/hooks/useBackgroundState';
import NotificationContainer from '@/components/common/Notification';
import Header from '@/components/layout/Header';
import Navigation from '@/components/layout/Navigation';
import TabContent from '@/components/layout/TabContent';
import { connectNetworkPanel } from '@/lib/network-api';

const App: React.FC = () => {
  useBackgroundState();

  // Keep network capture alive while the panel is open, whichever tab is shown
  useEffect(() => connectNetworkPanel(), []);

  return (
    <div className="h-screen w-full flex flex-col bg-[var(--bg-base)] dark-theme overflow-hidden">
      <Header />
      <Navigation />
      <TabContent />
      <NotificationContainer />
    </div>
  );
};

export default App;
