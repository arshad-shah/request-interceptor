import React from 'react';
import { Activity, Database, FileCode, Radio, Route } from 'lucide-react';
import { TabId } from '@/types';
import RoutesTab from '@/components/features/RoutesTab';
import TemplatesTab from '@/components/features/TemplatesTab';
import { NetworkTab } from '@/components/network';
import EventsTab from '@/components/events/EventsTab';
import StorageTab from '@/components/storage/StorageTab';

export type TabRegistryItem = {
  id: TabId;
  label: string;
  icon: React.ComponentType<{ size?: number | string; className?: string }>;
  /** When true: panel renders the content directly with no padding or outer scroll. */
  fullBleed?: boolean;
  content: () => React.ReactNode;
};

export const tabs: TabRegistryItem[] = [
  {
    id: 'routes',
    label: 'Routes',
    icon: Route,
    content: () => <RoutesTab />,
  },
  {
    id: 'templates',
    label: 'Templates',
    icon: FileCode,
    content: () => <TemplatesTab />,
  },
  {
    id: 'network',
    label: 'Network',
    icon: Activity,
    fullBleed: true,
    content: () => <NetworkTab />,
  },
  {
    id: 'events',
    label: 'Events',
    icon: Radio,
    fullBleed: true,
    content: () => <EventsTab />,
  },
  {
    id: 'storage',
    label: 'Storage',
    icon: Database,
    fullBleed: true,
    content: () => <StorageTab />,
  },
];

export const tabsById: Record<TabId, TabRegistryItem> = tabs.reduce(
  (acc, t) => {
    acc[t.id] = t;
    return acc;
  },
  {} as Record<TabId, TabRegistryItem>,
);
