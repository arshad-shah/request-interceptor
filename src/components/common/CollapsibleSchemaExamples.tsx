import { useState } from 'react';
import { ChevronDown, ChevronUp, FileCode } from 'lucide-react';
import { JsonTreeViewer } from './JsonTreeViewer';
import { complete_template } from '@/components/templates/schema_format_examples';
import Card from '../ui/Card';

const CollapsibleSchemaExamples = () => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <Card>
      <Card.Header>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-between text-left hover:bg-[var(--bg-hover)] -m-4 p-4 rounded-[var(--radius-lg)] transition-colors"
        >
          <span>Schema Format Examples</span>
          <div className="flex items-center gap-2 text-[var(--text-tertiary)]">
            <span className="text-xs">
              {isExpanded ? 'Hide examples' : 'Show examples'}
            </span>
            {isExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </div>
        </button>
      </Card.Header>

      <div
        className={`transition-all duration-300 ease-in-out overflow-hidden ${
          isExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <Card.Body className="space-y-6 border-t border-[var(--border-subtle)]">
          {/* Complete Export Example */}
          <div>
            <h4 className="text-sm font-medium text-[var(--text-secondary)] mb-2 flex items-center gap-2">
              <FileCode className="w-4 h-4 text-[var(--accent-cyan)]" />
              Complete Export/Import Schema
            </h4>
            <JsonTreeViewer 
              data={complete_template} 
              maxHeight={600}
              showToolbar={true}
              initialExpandDepth={2}
              searchable={true}
            />
          </div>
        </Card.Body>
      </div>
    </Card>
  );
};

export default CollapsibleSchemaExamples;
