import { TabId } from "@/types";
import { FileCode, Plus, Route } from "lucide-react";

export const tabs: Array<{ id: TabId; label: string; icon: React.ComponentType<any> }> = [
  { id: 'routes', label: 'Routes', icon: Route },
  { id: 'add', label: 'Add Route', icon: Plus },
  { id: 'templates', label: 'Templates', icon: FileCode }
];
