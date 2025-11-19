import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
        <div className="bg-purple-50 rounded-lg overflow-hidden border border-purple-200">
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center justify-between p-3 text-left hover:bg-purple-100 transition-colors"
            >
                <div className="flex items-center gap-2">
                    {icon}
                    <span className="text-sm font-medium text-purple-700">{title}</span>
                    {hasRules && (
                        <span className="px-2 py-0.5 bg-purple-200 text-purple-800 rounded-full text-xs font-medium">
                            {enabledRules.length}/{rules.length}
                        </span>
                    )}
                </div>
                <motion.div
                    animate={{ rotate: isExpanded ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                >
                    <ChevronDown className="w-4 h-4 text-purple-400" />
                </motion.div>
            </button>

            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="border-t border-purple-200 overflow-hidden"
                    >
                        {hasRules ? (
                            <div className="p-3 space-y-2">
                                {rules.map((rule, index) => (
                                    <div
                                        key={rule.id}
                                        className={cn(
                                            "p-2 rounded border",
                                            rule.enabled 
                                                ? "bg-white border-purple-200" 
                                                : "bg-gray-50 border-gray-200 opacity-60"
                                        )}
                                    >
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className={cn(
                                                "text-xs px-2 py-1 rounded font-medium",
                                                rule.type === 'replace' ? 'bg-blue-100 text-blue-700' :
                                                rule.type === 'block' ? 'bg-red-100 text-red-700' :
                                                'bg-green-100 text-green-700'
                                            )}>
                                                {rule.type.toUpperCase()}
                                            </span>
                                            <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded">
                                                {rule.matchType.toUpperCase()}
                                            </span>
                                            {!rule.enabled && (
                                                <span className="text-xs px-2 py-1 bg-gray-200 text-gray-600 rounded">
                                                    DISABLED
                                                </span>
                                            )}
                                        </div>
                                        
                                        <div className="text-xs">
                                            <span className="font-medium text-gray-900">Match:</span>
                                            <span className="ml-2 font-mono text-gray-600 break-all">{rule.match}</span>
                                        </div>
                                        
                                        {rule.replacement && (
                                            <div className="text-xs mt-1">
                                                <span className="font-medium text-gray-900">
                                                    {rule.type === 'inject' ? 'Inject:' : 'Replace:'}
                                                </span>
                                                <span className="ml-2 font-mono text-gray-600 break-all">{rule.replacement}</span>
                                            </div>
                                        )}
                                        
                                        {rule.description && (
                                            <div className="text-xs text-gray-500 mt-1">{rule.description}</div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="p-3 text-sm text-purple-600 text-center">
                                No {direction} rules configured
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default WebSocketRulesDisplay;