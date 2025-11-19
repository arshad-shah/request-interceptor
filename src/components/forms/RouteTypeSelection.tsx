import React from 'react';
import { Zap, MessageSquare } from 'lucide-react';
import Radio from '../ui/Radio';

interface RouteTypeSelectionProps {
    formData: {
        routeType: 'http' | 'websocket' | string;
    };
    handleInputChange: (field: string, value: string) => void;
}

const RouteTypeSelection: React.FC<RouteTypeSelectionProps> = ({
    formData,
    handleInputChange,
}) => {
    return (
        <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
                Route Type
            </label>
            
            <div className="relative group">
                <div className="border-2 rounded-xl bg-white overflow-hidden border-gray-200 hover:border-gray-300 transition-all duration-200 hover:shadow-md">
                    <div className="p-4">
                        <div className="flex items-center gap-8">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <Radio
                                    checked={formData.routeType === 'http'}
                                    onChange={() => handleInputChange('routeType', 'http')}
                                    value="http"
                                    name="routeType"
                                    size="sm"
                                />
                                <Zap className="w-4 h-4 text-blue-600" />
                                <span className="text-sm text-gray-900">HTTP/HTTPS</span>
                            </label>
                            
                            <label className="flex items-center gap-2 cursor-pointer">
                                <Radio
                                    checked={formData.routeType === 'websocket'}
                                    onChange={() => handleInputChange('routeType', 'websocket')}
                                    value="websocket"
                                    name="routeType"
                                    size="sm"
                                />
                                <MessageSquare className="w-4 h-4 text-purple-600" />
                                <span className="text-sm text-gray-900">WebSocket</span>
                            </label>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RouteTypeSelection;