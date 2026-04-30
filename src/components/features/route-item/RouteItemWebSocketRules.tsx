import React from 'react';
import { ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import WebSocketRulesDisplay from '../WebSocketRulesDisplay';
import type { RouteInfo } from '@/hooks/useRouteInfo';

interface RouteItemWebSocketRulesProps {
  info: RouteInfo;
}

const RouteItemWebSocketRules: React.FC<RouteItemWebSocketRulesProps> = ({ info }) => (
  <div className="space-y-3">
    <div className="grid gap-3">
      <WebSocketRulesDisplay
        rules={info.wsConfig.incomingRules || []}
        title="Incoming Message Rules"
        icon={<ArrowDownLeft size={14} className="text-[var(--accent-emerald)]" />}
        direction="incoming"
      />
      <WebSocketRulesDisplay
        rules={info.wsConfig.outgoingRules || []}
        title="Outgoing Message Rules"
        icon={<ArrowUpRight size={14} className="text-[var(--accent-cyan)]" />}
        direction="outgoing"
      />
    </div>
  </div>
);

export default RouteItemWebSocketRules;
