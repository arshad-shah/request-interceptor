import Button from "@/components/ui/Button";
import { Search, X } from "lucide-react";

const FilterEmptyState: React.FC<{ onClearFilters: () => void }> = ({ onClearFilters }) => (
  <div className="text-center py-16 px-6">
    {/* Enhanced icon with search indication */}
    <div className="relative w-20 h-20 mx-auto mb-6">
      <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center border-2 border-gray-100">
        <Search className="w-10 h-10 text-gray-400" />
      </div>
      {/* Empty results indicator */}
      <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-white rounded-full border-2 border-gray-200 flex items-center justify-center">
        <div className="w-3 h-3 rounded-full border-2 border-gray-300 border-dashed"></div>
      </div>
    </div>

    {/* More descriptive heading */}
    <h3 className="text-xl font-semibold text-gray-900 mb-3">
      No routes match your filters
    </h3>
    
    {/* More helpful description */}
    <p className="text-gray-600 mb-8 max-w-sm mx-auto leading-relaxed">
      We couldn't find any routes that match your current search and filter criteria. 
      Try broadening your search or adjusting the filters.
    </p>

    {/* Helpful suggestions */}
    <div className="bg-gray-50 rounded-lg p-4 mb-8 max-w-md mx-auto">
      <p className="text-sm font-medium text-gray-700 mb-2">Try:</p>
      <div className="space-y-1 text-sm text-gray-600">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-gray-400 rounded-full flex-shrink-0"></div>
          <span>Using different keywords</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-gray-400 rounded-full flex-shrink-0"></div>
          <span>Removing some filters</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-gray-400 rounded-full flex-shrink-0"></div>
          <span>Checking your spelling</span>
        </div>
      </div>
    </div>

    {/* Enhanced action button */}
    <div className="space-y-3">
      <Button
        variant="secondary" 
        size="lg"
        onClick={onClearFilters} 
        leftIcon={<X className="w-4 h-4" />}
        className="px-6 py-3"
      >
        Clear All Filters
      </Button>
      
      {/* Additional context */}
      <p className="text-xs text-gray-400">
        This will reset your search and show all routes
      </p>
    </div>
  </div>
);

export default FilterEmptyState;