import React from 'react';
import { Zap, MessageSquare, Code } from 'lucide-react';
import Radio from '../ui/Radio';

interface RouteTypeSelectionProps {
    formData: {
        routeType: 'http' | 'websocket' | 'injection' | string;
    };
    handleInputChange: (field: string, value: string) => void;
}

const RouteTypeSelection: React.FC<RouteTypeSelectionProps> = ({
    formData,
    handleInputChange,
}) => {
    return (
        <div className="space-y-2">
            <label className="ds-label">Route Type</label>

            <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[var(--radius-md)] p-3 hover:border-[var(--border-default)] transition-colors">
                <div className="flex items-center gap-6">
                    <label className="flex items-center gap-2 cursor-pointer">
                        <Radio
                            checked={formData.routeType === 'http'}
                            onChange={() => handleInputChange('routeType', 'http')}
                            value="http"
                            name="routeType"
                            size="sm"
                        />
                        <Zap size={14} className="text-[var(--accent-cyan)]" />
                        <span className="text-[12px] text-[var(--text-primary)]">HTTP/HTTPS</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                        <Radio
                            checked={formData.routeType === 'websocket'}
                            onChange={() => handleInputChange('routeType', 'websocket')}
                            value="websocket"
                            name="routeType"
                            size="sm"
                        />
                        <MessageSquare size={14} className="text-[var(--accent-violet)]" />
                        <span className="text-[12px] text-[var(--text-primary)]">WebSocket</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                        <Radio
                            checked={formData.routeType === 'injection'}
                            onChange={() => handleInputChange('routeType', 'injection')}
                            value="injection"
                            name="routeType"
                            size="sm"
                        />
                        <Code size={14} className="text-[var(--accent-indigo)]" />
                        <span className="text-[12px] text-[var(--text-primary)]">Injection</span>
                    </label>
                </div>
            </div>
        </div>
    );
};

export default RouteTypeSelection;
