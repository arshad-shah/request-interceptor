import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WebSocketRule } from '@/types';

interface WebSocketRulesDisplayProps {
    rules: WebSocketRule[];
    title: string;
    icon: React.ReactNode;
    direction: 'incoming' | 'outgoing';
}

const WebSocketRulesDisplay: React.FC<WebSocketRulesDisplayProps> = ({
    rules,
    title,
    icon,
    direction
}) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const enabledRules = rules.filter(rule => rule.enabled);
    const hasRules = rules.length > 0;

    if (!hasRules && !isExpanded) {
        return null;
    }

    return (
        <div className="bg-[rgba(139,92,246,0.1)] rounded-[var(--radius-md)] overflow-hidden border border-[rgba(139,92,246,0.3)]">
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center justify-between p-3 text-left hover:bg-[rgba(139,92,246,0.15)] transition-colors"
            >
                <div className="flex items-center gap-2">
                    {icon}
                    <span className="text-sm font-medium text-[var(--accent-violet)]">{title}</span>
                    {hasRules && (
                        <span className="px-2 py-0.5 bg-[rgba(139,92,246,0.2)] text-[var(--accent-violet)] rounded-full text-xs font-medium">
                            {enabledRules.length}/{rules.length}
                        </span>
                    )}
                </div>
                <div
                    className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                >
                    <ChevronDown className="w-4 h-4 text-[var(--accent-violet)]" />
                </div>
            </button>

            {isExpanded && (
                <div className="border-t border-[rgba(139,92,246,0.3)]">
                    {hasRules ? (
                        <div className="p-3 space-y-2">
                            {rules.map((rule) => (
                                <div
                                    key={rule.id}
                                    className={cn(
                                        "p-2 rounded-[var(--radius-sm)] border",
                                        rule.enabled
                                            ? "bg-[var(--bg-elevated)] border-[rgba(139,92,246,0.3)]"
                                            : "bg-[var(--bg-surface)] border-[var(--border-subtle)] opacity-60"
                                    )}
                                >
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className={cn(
                                            "text-xs px-2 py-1 rounded-[var(--radius-sm)] font-medium",
                                            rule.type === 'replace' ? 'bg-[rgba(59,130,246,0.15)] text-[var(--accent-cyan)]' :
                                            rule.type === 'block' ? 'bg-[rgba(244,63,94,0.15)] text-[var(--accent-rose)]' :
                                            'bg-[rgba(16,185,129,0.15)] text-[var(--accent-emerald)]'
                                        )}>
                                            {rule.type.toUpperCase()}
                                        </span>
                                        <span className="text-xs px-2 py-1 bg-[var(--bg-surface)] text-[var(--text-secondary)] rounded-[var(--radius-sm)]">
                                            {rule.matchType.toUpperCase()}
                                        </span>
                                        {!rule.enabled && (
                                            <span className="text-xs px-2 py-1 bg-[var(--bg-elevated)] text-[var(--text-tertiary)] rounded-[var(--radius-sm)]">
                                                DISABLED
                                            </span>
                                        )}
                                    </div>

                                    <div className="text-xs">
                                        <span className="font-medium text-[var(--text-primary)]">Match:</span>
                                        <span className="ml-2 font-mono text-[var(--text-secondary)] break-all">{rule.match}</span>
                                    </div>

                                    {rule.replacement && (
                                        <div className="text-xs mt-1">
                                            <span className="font-medium text-[var(--text-primary)]">
                                                {rule.type === 'inject' ? 'Inject:' : 'Replace:'}
                                            </span>
                                            <span className="ml-2 font-mono text-[var(--text-secondary)] break-all">{rule.replacement}</span>
                                        </div>
                                    )}

                                    {rule.description && (
                                        <div className="text-xs text-[var(--text-tertiary)] mt-1">{rule.description}</div>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="p-3 text-sm text-[var(--accent-violet)] text-center">
                            No {direction} rules configured
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default WebSocketRulesDisplay;
