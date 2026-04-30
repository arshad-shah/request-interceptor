import React, { useState } from 'react';
import { Plus, Trash2, ChevronDown } from 'lucide-react';
import { QueryParamRule, QueryParamAction } from '@/types';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select, { type SelectOption } from '../ui/Select';

interface QueryParamEditorProps {
  rules: QueryParamRule[];
  onRulesChange: (rules: QueryParamRule[]) => void;
  title?: string;
  description?: string;
  className?: string;
}

const actionOptions: SelectOption[] = [
  { value: 'add', label: 'Add' },
  { value: 'remove', label: 'Remove' },
  { value: 'modify', label: 'Modify' }
];

const QueryParamEditor: React.FC<QueryParamEditorProps> = ({
  rules,
  onRulesChange,
  title = 'Query Parameters',
  description = 'Add, remove, or modify URL query parameters',
  className
}) => {
  const [isExpanded, setIsExpanded] = useState(rules.length > 0);
  const [newAction, setNewAction] = useState<QueryParamAction>('add');
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');

  const handleAddRule = () => {
    if (!newKey.trim()) return;

    const newRule: QueryParamRule = {
      key: newKey.trim(),
      action: newAction,
      ...(newAction !== 'remove' ? { value: newValue } : {})
    };

    onRulesChange([...rules, newRule]);
    setNewKey('');
    setNewValue('');
    setIsExpanded(true);
  };

  const handleRemoveRule = (index: number) => {
    onRulesChange(rules.filter((_, i) => i !== index));
  };

  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between w-full text-left"
      >
        <div className="flex items-center gap-2">
          <label className="ds-label cursor-pointer">{title}</label>
          {rules.length > 0 && (
            <span className="ds-badge info">{rules.length}</span>
          )}
        </div>
        <ChevronDown
          size={14}
          className={`text-[var(--text-tertiary)] transition-transform ${isExpanded ? 'rotate-180' : ''}`}
        />
      </button>

      {isExpanded && (
        <div className="mt-2 space-y-2">
          {description && (
            <p className="text-[11px] text-[var(--text-tertiary)]">{description}</p>
          )}

          {/* Existing rules */}
          {rules.map((rule, index) => (
            <div
              key={index}
              className="flex items-center gap-2 p-2 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[var(--radius-sm)]"
            >
              <span className={`text-[11px] font-medium px-1.5 py-0.5 rounded ${
                rule.action === 'add' ? 'text-[var(--accent-emerald)] bg-[rgba(16,185,129,0.1)]' :
                rule.action === 'remove' ? 'text-[var(--accent-rose)] bg-[rgba(244,63,94,0.1)]' :
                'text-[var(--accent-amber)] bg-[rgba(245,158,11,0.1)]'
              }`}>
                {rule.action.toUpperCase()}
              </span>
              <span className="text-[12px] font-mono text-[var(--text-primary)]">{rule.key}</span>
              {rule.action !== 'remove' && rule.value !== undefined && (
                <>
                  <span className="text-[11px] text-[var(--text-tertiary)]">=</span>
                  <span className="text-[12px] font-mono text-[var(--text-secondary)]">{rule.value}</span>
                </>
              )}
              <button
                type="button"
                onClick={() => handleRemoveRule(index)}
                className="ml-auto ds-icon-btn text-[var(--accent-rose)]"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}

          {/* Add new rule */}
          <div className="flex items-end gap-2">
            <div className="w-24">
              <Select
                label="Action"
                value={newAction}
                onChange={(v) => setNewAction(v as QueryParamAction)}
                options={actionOptions}
              />
            </div>
            <div className="flex-1">
              <Input
                label="Key"
                placeholder="param_name"
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
              />
            </div>
            {newAction !== 'remove' && (
              <div className="flex-1">
                <Input
                  label="Value"
                  placeholder="param_value"
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                />
              </div>
            )}
            <Button
              variant="default"
              size="sm"
              onClick={handleAddRule}
              leftIcon={<Plus size={14} />}
              disabled={!newKey.trim()}
            >
              Add
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default QueryParamEditor;
