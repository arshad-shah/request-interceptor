import React, { useState } from 'react';
import { Plus, ChevronDown } from 'lucide-react';
import { WebSocketRule } from '@/types';
import { defaultWebSocketRule } from '@/constants/route-form';
import Button from '../ui/Button';
import WebSocketRuleItem from './WebSocketRuleItem';

interface WebSocketRuleEditorProps {
  title: string;
  rules: WebSocketRule[];
  onRulesChange: (rules: WebSocketRule[]) => void;
  direction: 'incoming' | 'outgoing';
  icon: React.ReactNode;
}

const WebSocketRuleEditor: React.FC<WebSocketRuleEditorProps> = ({
  title,
  rules,
  onRulesChange,
  direction,
  icon
}) => {
  const [isExpanded, setIsExpanded] = useState(rules.length > 0);

  const addRule = () => {
    const newRule: WebSocketRule = {
      ...defaultWebSocketRule,
      id: `rule-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };
    onRulesChange([...rules, newRule]);
    setIsExpanded(true);
  };

  const updateRule = (index: number, updates: Partial<WebSocketRule>) => {
    const updatedRules = rules.map((rule, i) => 
      i === index ? { ...rule, ...updates } : rule
    );
    onRulesChange(updatedRules);
  };

  const removeRule = (index: number) => {
    const updatedRules = rules.filter((_, i) => i !== index);
    onRulesChange(updatedRules);
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        {title}
      </label>
      
      <div className="border-2 rounded-xl bg-white border-gray-200 hover:border-gray-300 transition-all duration-200">
        {/* Header */}
        <div 
          className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50 transition-colors"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {icon}
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-sm text-gray-600 truncate">
                {direction === 'incoming' ? 'From server' : 'To server'}
              </span>
              {rules.length > 0 && (
                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium flex-shrink-0">
                  {rules.length}
                </span>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                addRule();
              }}
              leftIcon={<Plus className="w-3 h-3" />}
              className="text-xs"
            >
              Add
            </Button>
            <ChevronDown 
              className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${
                isExpanded ? 'rotate-180' : ''
              }`} 
            />
          </div>
        </div>

        {/* Content */}
        {isExpanded && (
          <div className="border-t border-gray-100">
            {rules.length > 0 ? (
              <div className="p-3 space-y-2">
                {rules.map((rule, index) => (
                  <WebSocketRuleItem
                    key={rule.id}
                    rule={rule}
                    onUpdate={(updates: Partial<WebSocketRule>) => updateRule(index, updates)}
                    onRemove={() => removeRule(index)}
                  />
                ))}
              </div>
            ) : (
              <div className="p-4 text-center text-gray-500 text-sm">
                No rules yet. Click "Add" to create your first rule.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default WebSocketRuleEditor;
