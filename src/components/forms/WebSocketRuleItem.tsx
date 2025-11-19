import React, { useState } from 'react';
import { Edit3, Trash2, Check, X } from 'lucide-react';
import { WebSocketRule, RuleType, MatchType } from '@/types';
import Button from '../ui/Button';
import Toggle from '../ui/Toggle';
import Select from '../ui/Select';
import Input from '../ui/Input';

interface WebSocketRuleItemProps {
  rule: WebSocketRule;
  onUpdate: (updates: Partial<WebSocketRule>) => void;
  onRemove: () => void;
}

const WebSocketRuleItem: React.FC<WebSocketRuleItemProps> = ({
  rule,
  onUpdate,
  onRemove
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempRule, setTempRule] = useState(rule);

  const handleSave = () => {
    onUpdate(tempRule);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setTempRule(rule);
    setIsEditing(false);
  };

  const ruleTypeOptions: { value: RuleType; label: string }[] = [
    { value: 'replace', label: 'Replace' },
    { value: 'block', label: 'Block' },
    { value: 'inject', label: 'Inject' }
  ];

  const matchTypeOptions: { value: MatchType; label: string }[] = [
    { value: 'exact', label: 'Exact' },
    { value: 'contains', label: 'Contains' },
    { value: 'regex', label: 'Regex' }
  ];

  const getRuleTypeColor = (type: RuleType) => {
    switch (type) {
      case 'replace': return 'bg-blue-100 text-blue-700';
      case 'block': return 'bg-red-100 text-red-700';
      case 'inject': return 'bg-green-100 text-green-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  if (isEditing) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-4">
        {/* Header with toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Toggle
              checked={tempRule.enabled}
              onChange={(checked) => setTempRule(prev => ({ ...prev, enabled: checked }))}
              size="sm"
            />
            <span className="text-sm font-medium text-gray-700">Enabled</span>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="primary"
              size="sm"
              onClick={handleSave}
              disabled={!tempRule.match.trim() || (tempRule.type !== 'block' && !tempRule.replacement?.trim())}
              leftIcon={<Check className="w-3 h-3" />}
            >
              Save
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancel}
              leftIcon={<X className="w-3 h-3" />}
            >
              Cancel
            </Button>
          </div>
        </div>

        {/* Type selectors */}
        <div className="grid grid-cols-2 gap-3">
          <Select
            label="Rule Type"
            value={tempRule.type}
            onChange={(e) => setTempRule(prev => ({ ...prev, type: e as RuleType }))}
          >
            {ruleTypeOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>

          <Select
            label="Match Type"
            value={tempRule.matchType}
            onChange={(e) => setTempRule(prev => ({ ...prev, matchType: e as MatchType }))}
          >
            {matchTypeOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>

        {/* Match input */}
        <Input
          label="Match Pattern"
          value={tempRule.match}
          onChange={(e) => setTempRule(prev => ({ ...prev, match: e.target.value }))}
          placeholder={
            tempRule.matchType === 'exact' ? 'Exact message to match' :
            tempRule.matchType === 'contains' ? 'Text to search for' :
            'Regular expression pattern'
          }
        />

        {/* Regex flags */}
        {tempRule.matchType === 'regex' && (
          <Input
            label="Regex Flags"
            value={tempRule.flags || ''}
            onChange={(e) => setTempRule(prev => ({ ...prev, flags: e.target.value }))}
            placeholder="g, i, m, s"
            helperText="Optional: g (global), i (ignore case), m (multiline)"
          />
        )}

        {/* Replacement/injection input */}
        {tempRule.type !== 'block' && (
          <Input
            label={tempRule.type === 'inject' ? 'Message to Inject' : 'Replacement Text'}
            value={tempRule.replacement || ''}
            onChange={(e) => setTempRule(prev => ({ ...prev, replacement: e.target.value }))}
            placeholder={
              tempRule.type === 'inject' ? 'Message to send when pattern matches' : 'Text to replace matches with'
            }
          />
        )}

        {/* Description */}
        <Input
          label="Description"
          value={tempRule.description || ''}
          onChange={(e) => setTempRule(prev => ({ ...prev, description: e.target.value }))}
          placeholder="Optional: Describe what this rule does"
        />
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3 hover:border-gray-300 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {/* Header with toggle and badges */}
          <div className="flex items-center gap-2 mb-2">
            <Toggle
              checked={rule.enabled}
              onChange={(checked) => onUpdate({ enabled: checked })}
              size="sm"
            />
            <span className={`text-xs px-2 py-0.5 rounded font-medium ${getRuleTypeColor(rule.type)}`}>
              {rule.type}
            </span>
            <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
              {rule.matchType}
            </span>
          </div>
          
          {/* Match pattern */}
          <div className="text-sm mb-1">
            <span className="text-gray-500">Match:</span>
            <span className="ml-2 font-mono text-gray-900 break-all">{rule.match}</span>
          </div>
          
          {/* Replacement/injection text */}
          {rule.replacement && (
            <div className="text-sm mb-1">
              <span className="text-gray-500">
                {rule.type === 'inject' ? 'Inject:' : 'Replace:'}
              </span>
              <span className="ml-2 font-mono text-gray-900 break-all">{rule.replacement}</span>
            </div>
          )}
          
          {/* Description */}
          {rule.description && (
            <div className="text-xs text-gray-500 mt-1">{rule.description}</div>
          )}
        </div>
        
        {/* Actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsEditing(true)}
            leftIcon={<Edit3 className="w-3 h-3" />}
            className="text-xs"
          >
            Edit
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onRemove}
            leftIcon={<Trash2 className="w-3 h-3" />}
            className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
};

export default WebSocketRuleItem;
