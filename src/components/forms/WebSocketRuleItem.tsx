import React, { useState } from 'react';
import { Edit3, Trash2, Check, X } from 'lucide-react';
import { WebSocketRule, RuleType, MatchType } from '@/types';
import Button from '../ui/Button';
import Toggle from '../ui/Toggle';
import Select, { type SelectOption } from '../ui/Select';
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

  const ruleTypeOptions: SelectOption[] = [
    { value: 'replace', label: 'Replace' },
    { value: 'block', label: 'Block' },
    { value: 'inject', label: 'Inject' }
  ];

  const matchTypeOptions: SelectOption[] = [
    { value: 'exact', label: 'Exact' },
    { value: 'contains', label: 'Contains' },
    { value: 'regex', label: 'Regex' }
  ];

  const getRuleTypeColor = (type: RuleType) => {
    switch (type) {
      case 'replace': return 'bg-[rgba(59,130,246,0.15)] text-[var(--accent-cyan)]';
      case 'block': return 'bg-[rgba(244,63,94,0.15)] text-[var(--accent-rose)]';
      case 'inject': return 'bg-[rgba(16,185,129,0.15)] text-[var(--accent-emerald)]';
      default: return 'bg-[var(--bg-elevated)] text-[var(--text-secondary)]';
    }
  };

  if (isEditing) {
    return (
      <div className="bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-[var(--radius-md)] p-4 space-y-4">
        {/* Header with toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Toggle
              checked={tempRule.enabled}
              onChange={(checked) => setTempRule(prev => ({ ...prev, enabled: checked }))}
              size="sm"
            />
            <span className="text-sm font-medium text-[var(--text-secondary)]">Enabled</span>
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
            onChange={(value) => setTempRule(prev => ({ ...prev, type: value as RuleType }))}
            options={ruleTypeOptions}
          />

          <Select
            label="Match Type"
            value={tempRule.matchType}
            onChange={(value) => setTempRule(prev => ({ ...prev, matchType: value as MatchType }))}
            options={matchTypeOptions}
          />
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
    <div className="bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-[var(--radius-md)] p-3 hover:border-[var(--border-default)] transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {/* Header with toggle and badges */}
          <div className="flex items-center gap-2 mb-2">
            <Toggle
              checked={rule.enabled}
              onChange={(checked) => onUpdate({ enabled: checked })}
              size="sm"
            />
            <span className={`text-xs px-2 py-0.5 rounded-[var(--radius-sm)] font-medium ${getRuleTypeColor(rule.type)}`}>
              {rule.type}
            </span>
            <span className="text-xs px-2 py-0.5 bg-[var(--bg-surface)] text-[var(--text-tertiary)] rounded-[var(--radius-sm)]">
              {rule.matchType}
            </span>
          </div>

          {/* Match pattern */}
          <div className="text-sm mb-1">
            <span className="text-[var(--text-tertiary)]">Match:</span>
            <span className="ml-2 font-mono text-[var(--text-primary)] break-all">{rule.match}</span>
          </div>

          {/* Replacement/injection text */}
          {rule.replacement && (
            <div className="text-sm mb-1">
              <span className="text-[var(--text-tertiary)]">
                {rule.type === 'inject' ? 'Inject:' : 'Replace:'}
              </span>
              <span className="ml-2 font-mono text-[var(--text-primary)] break-all">{rule.replacement}</span>
            </div>
          )}

          {/* Description */}
          {rule.description && (
            <div className="text-xs text-[var(--text-tertiary)] mt-1">{rule.description}</div>
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
            className="text-xs text-[var(--accent-rose)] hover:bg-[rgba(244,63,94,0.15)]"
          >
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
};

export default WebSocketRuleItem;
