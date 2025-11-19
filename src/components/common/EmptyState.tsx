import React from 'react';
import { motion } from 'framer-motion';
import Button from '../ui/Button';
import Card from '../ui/Card';
import { Plus, Route, Zap, MessageSquare, Settings, Sparkles } from "lucide-react";

const EmptyState: React.FC<{ onAddRoute: () => void }> = ({ onAddRoute }) => {
  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  const features = [
    {
      icon: <Zap className="w-4 h-4" />,
      title: "HTTP Interception",
      description: "Capture & modify requests"
    },
    {
      icon: <Settings className="w-4 h-4" />,
      title: "Header Modification", 
      description: "Custom headers & responses"
    },
    {
      icon: <MessageSquare className="w-4 h-4" />,
      title: "WebSocket Support",
      description: "Real-time message handling"
    }
  ];

  return (
    <div className="flex items-center justify-center min-h-[40vh] p-4">
      <Card className="max-w-xl w-full" hover={false}>
        <Card.Body className="py-8 px-6">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="text-center"
          >
            {/* Hero Icon with Gradient Background */}
            <motion.div 
              variants={itemVariants}
              className="relative w-16 h-16 mx-auto mb-6"
            >
              {/* Animated background circles */}
              <motion.div 
                className="absolute inset-0 bg-gradient-to-br from-blue-500/20 via-purple-500/20 to-indigo-500/20 rounded-full"
                animate={{ 
                  scale: [1, 1.1, 1],
                  rotate: [0, 180, 360]
                }}
                transition={{ 
                  duration: 8,
                  repeat: Infinity,
                  ease: "linear"
                }}
              />
              
              {/* Main icon container */}
              <div className="relative w-16 h-16 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-full flex items-center justify-center border-2 border-blue-100 shadow-lg">
                <Route className="w-8 h-8 text-blue-600" />
                
                {/* Sparkle indicator */}
                <motion.div 
                  className="absolute -top-1 -right-1 w-6 h-6 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center shadow-md"
                  animate={{ 
                    scale: [1, 1.2, 1],
                    rotate: [0, 360]
                  }}
                  transition={{ 
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                >
                  <Sparkles className="w-3 h-3 text-white" />
                </motion.div>
              </div>
            </motion.div>

            {/* Enhanced Heading */}
            <motion.div variants={itemVariants} className="mb-4">
              <h2 className="text-2xl font-bold text-gray-900 mb-1">
                Ready to intercept requests?
              </h2>
              <p className="text-base text-gray-600">
                Start building powerful request interceptors in seconds
              </p>
            </motion.div>
            
            {/* Engaging Description */}
            <motion.p 
              variants={itemVariants}
              className="text-gray-600 mb-6 max-w-md mx-auto leading-relaxed text-sm"
            >
              Create your first route to start intercepting HTTP requests, headers, and WebSocket messages in real-time.
            </motion.p>

            {/* Enhanced Feature Grid */}
            <motion.div 
              variants={itemVariants}
              className="grid grid-cols-3 gap-3 mb-6"
            >
              {features.map((feature, index) => (
                <motion.div
                  key={feature.title}
                  variants={itemVariants}
                  whileHover={{ y: -2, scale: 1.02 }}
                  className="p-3 rounded-lg bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200 hover:border-blue-200 hover:shadow-sm transition-all duration-200"
                >
                  <div className="flex flex-col items-center text-center space-y-2">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600">
                      {feature.icon}
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900 text-xs">
                        {feature.title}
                      </h4>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>

            {/* Enhanced CTA Section */}
            <motion.div variants={itemVariants} className="space-y-3">
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Button 
                  variant="primary" 
                  size="md"
                  onClick={onAddRoute} 
                  leftIcon={<Plus className="w-4 h-4" />}
                  className="px-6 py-2 text-sm font-semibold shadow-md hover:shadow-lg transition-all duration-200"
                >
                  Create Your First Route
                </Button>
              </motion.div>
              
              <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
                <div className="w-1 h-1 bg-green-400 rounded-full animate-pulse"></div>
                <span>Setup takes less than a minute</span>
              </div>
            </motion.div>
          </motion.div>
        </Card.Body>
      </Card>
    </div>
  );
};

export default EmptyState;