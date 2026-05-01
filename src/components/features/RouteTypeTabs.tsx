import React, { useMemo } from 'react';
import { Layers, Globe, Radio, FileCode } from 'lucide-react';
import { useAppStore } from '@/stores/app-store';
import Tabs, { type TabItem } from '@/components/ui/Tabs';

type RouteTypeFilter = 'all' | 'http' | 'websocket' | 'injection';

const RouteTypeTabs: React.FC = () => {
  const { routes, filters, setFilters } = useAppStore();

  const counts = useMemo(() => {
    const keys = Object.keys(routes);
    return {
      all: keys.length,
      http: keys.filter((k) => !k.startsWith('WS:') && !k.startsWith('INJ:')).length,
      websocket: keys.filter((k) => k.startsWith('WS:')).length,
      injection: keys.filter((k) => k.startsWith('INJ:')).length,
    };
  }, [routes]);

  const items: TabItem<RouteTypeFilter>[] = [
    { id: 'all',       label: 'All',       icon: Layers,   badge: counts.all },
    { id: 'http',      label: 'HTTP',      icon: Globe,    badge: counts.http },
    { id: 'websocket', label: 'WebSocket', icon: Radio,    badge: counts.websocket },
    { id: 'injection', label: 'Injection', icon: FileCode, badge: counts.injection },
  ];

  const value = (filters.routeType ?? 'all') as RouteTypeFilter;

  return (
    <Tabs
      items={items}
      value={value}
      onChange={(v) => setFilters({ routeType: v })}
      variant="pill"
      size="sm"
      align="stretch"
      ariaLabel="Filter routes by type"
    />
  );
};

export default RouteTypeTabs;
