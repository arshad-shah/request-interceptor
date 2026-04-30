import { TabId } from "@/types";
import { Activity, Database, FileCode, Radio, Route } from "lucide-react";

export const tabs: Array<{ id: TabId; label: string; icon: React.ComponentType<any> }> = [
  { id: 'routes', label: 'Routes', icon: Route },
  { id: 'templates', label: 'Templates', icon: FileCode },
  { id: 'network', label: 'Network', icon: Activity },
  { id: 'events', label: 'Events', icon: Radio },
  { id: 'storage', label: 'Storage', icon: Database },
];
