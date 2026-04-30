import React from 'react';
import ReactAceEditor from '@/components/common/ReactAceEditor';
import { RouteFormData } from '@/types';

interface BodySectionProps {
  formData: RouteFormData;
  errors: Partial<Record<keyof RouteFormData, string>>;
  onFieldChange: (field: keyof RouteFormData, value: any) => void;
}

function getEditorLanguage(contentType: string): 'json' | 'text' | 'html' | 'xml' {
  switch (contentType) {
    case 'application/json': return 'json';
    case 'text/html': return 'html';
    case 'application/xml': return 'xml';
    default: return 'text';
  }
}

const BodySection: React.FC<BodySectionProps> = ({
  formData,
  errors,
  onFieldChange,
}) => (
  <div className="space-y-4">
    {formData.interceptionMode === 'passthrough' && (
      <div className="space-y-2">
        <label className="ds-label">
          Request Body Override <span className="text-[var(--text-tertiary)]">(Optional)</span>
        </label>
        <div className="text-[11px] text-[var(--text-secondary)] mb-2">
          Override the request body sent to the server
        </div>
        <ReactAceEditor
          value={formData.requestBody}
          onChange={(value) => onFieldChange('requestBody', value)}
          language="json"
          height={150}
          placeholder="Enter request body override"
        />
      </div>
    )}

    <div className="space-y-2">
      <label className="ds-label">
        Response Body{' '}
        {formData.interceptionMode !== 'mock' && (
          <span className="text-[var(--text-tertiary)]">(Optional)</span>
        )}
      </label>

      {formData.interceptionMode !== 'mock' && (
        <div className="text-[11px] text-[var(--text-secondary)] mb-2">
          In {formData.interceptionMode} mode, the real server response will be used.
        </div>
      )}

      <ReactAceEditor
        value={formData.response}
        onChange={(value) => onFieldChange('response', value)}
        language={getEditorLanguage(formData.contentType)}
        height={formData.interceptionMode === 'mock' ? 300 : 200}
        placeholder={
          formData.interceptionMode === 'mock'
            ? 'Enter your response content here'
            : 'Optional: Enter test response content here'
        }
      />

      {errors.response && (
        <p className="text-[11px] text-[var(--accent-rose)]">{errors.response}</p>
      )}
      {errors.responseHeaders && (
        <p className="text-[11px] text-[var(--accent-rose)]">{errors.responseHeaders}</p>
      )}
    </div>
  </div>
);

export default BodySection;
