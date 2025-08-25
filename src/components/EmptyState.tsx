import Button from "@/components/ui/Button";
import { Plus, Route } from "lucide-react";

const EmptyState: React.FC<{ onAddRoute: () => void }> = ({ onAddRoute }) => (
  <div className="text-center py-16 px-6">
    {/* Icon with subtle animation hint */}
    <div className="relative w-20 h-20 mx-auto mb-6">
      <div className="w-20 h-20 bg-primary-50 rounded-full flex items-center justify-center border-2 border-primary-100">
        <Route className="w-10 h-10 text-primary-500" />
      </div>
      {/* Subtle pulse indicator */}
      <div className="absolute -top-1 -right-1 w-6 h-6 bg-primary-100 rounded-full flex items-center justify-center">
        <div className="w-2 h-2 bg-primary-400 rounded-full"></div>
      </div>
    </div>

    {/* Enhanced heading */}
    <h3 className="text-xl font-semibold text-gray-900 mb-3">
      Ready to intercept requests?
    </h3>
    
    {/* More engaging description */}
    <p className="text-gray-600 mb-8 max-w-md mx-auto leading-relaxed">
      Create your first route to start intercepting and modifying HTTP requests, 
      headers, and WebSocket messages in real-time. Perfect for debugging, 
      testing, and development.
    </p>

    {/* Feature highlights */}
    <div className="flex flex-wrap justify-center gap-6 mb-8 text-sm">
      <div className="flex items-center gap-2 text-gray-500">
        <div className="w-2 h-2 bg-primary-400 rounded-full"></div>
        <span>HTTP Interception</span>
      </div>
      <div className="flex items-center gap-2 text-gray-500">
        <div className="w-2 h-2 bg-primary-400 rounded-full"></div>
        <span>Header Modification</span>
      </div>
      <div className="flex items-center gap-2 text-gray-500">
        <div className="w-2 h-2 bg-primary-400 rounded-full"></div>
        <span>WebSocket Support</span>
      </div>
    </div>

    {/* Primary action */}
    <div className="space-y-3">
      <Button 
        variant="primary" 
        size="lg"
        onClick={onAddRoute} 
        leftIcon={<Plus className="w-4 h-4" />}
        className="px-6 py-3"
      >
        Create Your First Route
      </Button>
      
      {/* Secondary help text */}
      <p className="text-xs text-gray-400">
        Takes less than a minute to set up
      </p>
    </div>
  </div>
);

export default EmptyState;