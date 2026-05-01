import { useState } from 'react';
import { ChevronDown, ChevronUp, FileCode } from 'lucide-react';
import { JsonTreeViewer } from './JsonTreeViewer';
import { complete_template } from '@/components/templates/schema_format_examples';

const CollapsibleSchemaExamples = () => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className={`ds-section ${isExpanded ? '' : 'collapsed'}`}>
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        aria-expanded={isExpanded}
        className="ds-section-header w-full"
      >
        <span className="flex items-center gap-2">
          <FileCode size={14} className="text-(--text-tertiary)" />
          Schema format reference
        </span>
        <span className="flex items-center gap-1.5 text-(--text-tertiary) text-[11px]">
          {isExpanded ? 'Hide' : 'Show'}
          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </span>
      </button>

      <div className="ds-section-content">
        <JsonTreeViewer
          data={complete_template}
          maxHeight={420}
          showToolbar={true}
          initialExpandDepth={2}
          searchable={true}
        />
      </div>
    </div>
  );
};

export default CollapsibleSchemaExamples;
