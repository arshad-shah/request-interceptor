import React from 'react';
import { JsonTreeViewer } from '@/components/common/JsonTreeViewer';

interface EventPayloadProps {
  data: unknown;
  compact?: boolean;
}

const EventPayload: React.FC<EventPayloadProps> = ({ data, compact }) => {
  return (
    <JsonTreeViewer
      data={data}
      compact={compact}
      maxHeight={compact ? 150 : 300}
      initialExpandDepth={compact ? 1 : 2}
      showToolbar={!compact}
      searchable={!compact}
      parseEmbeddedJson
    />
  );
};

export default EventPayload;
