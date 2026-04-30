import React from 'react';
import { Clock, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import Input from '@/components/ui/Input';
import WebSocketRuleEditor from '../WebSocketRuleEditor';
import { RouteFormData } from '@/types';

interface WebSocketSectionProps {
  formData: RouteFormData;
  errors: Partial<Record<keyof RouteFormData, string>>;
  onFieldChange: (field: keyof RouteFormData, value: any) => void;
}

const WebSocketSection: React.FC<WebSocketSectionProps> = ({
  formData,
  errors,
  onFieldChange,
}) => (
  <div className="space-y-4">
    <Input
      label="Processing Delay (ms)"
      type="number"
      min={0}
      value={formData.delay}
      onChange={(e) => onFieldChange('delay', parseInt(e.target.value) || 0)}
      leftIcon={<Clock size={14} />}
      error={errors.delay}
      helperText="Delay before processing WebSocket messages"
    />

    <WebSocketRuleEditor
      title="Incoming Message Rules"
      rules={formData.incomingRules}
      onRulesChange={(rules) => onFieldChange('incomingRules', rules)}
      direction="incoming"
      icon={<ArrowDownLeft size={14} className="text-[var(--accent-emerald)]" />}
    />

    <WebSocketRuleEditor
      title="Outgoing Message Rules"
      rules={formData.outgoingRules}
      onRulesChange={(rules) => onFieldChange('outgoingRules', rules)}
      direction="outgoing"
      icon={<ArrowUpRight size={14} className="text-[var(--accent-cyan)]" />}
    />

    {errors.incomingRules && (
      <p className="text-[11px] text-[var(--accent-rose)]">{errors.incomingRules}</p>
    )}
  </div>
);

export default WebSocketSection;
