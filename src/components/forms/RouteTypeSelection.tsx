import React from 'react';
import { motion } from 'framer-motion';
import { Zap, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
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
        <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
                <Zap className="w-4 h-4 text-gray-600" />
                <span className="font-medium text-gray-900 text-sm">Route Type</span>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3">
                <motion.label
                    className={cn(
                        "flex-1 relative overflow-hidden rounded-lg border-2 transition-all duration-200 cursor-pointer",
                        formData.routeType === 'http' 
                            ? "border-blue-500 bg-blue-50" 
                            : "border-gray-200 bg-white hover:border-gray-300"
                    )}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                >
                    <div className="p-3">
                        <div className="flex items-center gap-3">
                            <Radio
                                checked={formData.routeType === 'http'}
                                onChange={() => handleInputChange('routeType', 'http')}
                                value="http"
                                name="routeType"
                                size="md"
                            />
                            <div className="flex items-center gap-2">
                                <motion.div
                                    animate={{
                                        color: formData.routeType === 'http' ? '#3b82f6' : '#6b7280'
                                    }}
                                    transition={{ duration: 0.2 }}
                                >
                                    <Zap className="w-4 h-4" />
                                </motion.div>
                                <div>
                                    <div className="font-medium text-sm text-gray-900">HTTP/HTTPS</div>
                                    <div className="text-xs text-gray-500">REST APIs, web requests</div>
                                </div>
                            </div>
                        </div>
                    </div>
                
                </motion.label>

                <motion.label
                    className={cn(
                        "flex-1 relative overflow-hidden rounded-lg border-2 transition-all duration-200 cursor-pointer",
                        formData.routeType === 'websocket' 
                            ? "border-purple-500 bg-purple-50" 
                            : "border-gray-200 bg-white hover:border-gray-300"
                    )}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                >
                    <div className="p-3">
                        <div className="flex items-center gap-3">
                            <Radio
                                checked={formData.routeType === 'websocket'}
                                onChange={() => handleInputChange('routeType', 'websocket')}
                                value="websocket"
                                name="routeType"
                                size="md"
                            />
                            <div className="flex items-center gap-2">
                                <motion.div
                                    animate={{
                                        color: formData.routeType === 'websocket' ? '#a855f7' : '#6b7280'
                                    }}
                                    transition={{ duration: 0.2 }}
                                >
                                    <MessageSquare className="w-4 h-4" />
                                </motion.div>
                                <div>
                                    <div className="font-medium text-sm text-gray-900">WebSocket</div>
                                    <div className="text-xs text-gray-500">Real-time messages</div>
                                </div>
                            </div>
                        </div>
                    </div>

                </motion.label>
            </div>
            
            {/* Compact description */}
            <motion.div
                className={cn(
                    "mt-3 p-2 rounded text-xs transition-colors duration-200",
                    formData.routeType === 'websocket' 
                        ? "bg-purple-50 text-purple-700" 
                        : "bg-blue-50 text-blue-700"
                )}
                key={formData.routeType}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2 }}
            >
                {formData.routeType === 'websocket' 
                    ? 'Intercept and modify real-time WebSocket messages with rule-based filtering.'
                    : 'Create mock API responses or modify HTTP headers for testing and debugging.'
                }
            </motion.div>
        </div>
    );
};

export default RouteTypeSelection;