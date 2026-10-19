import React from 'react';
import Radio from '@/components/ui/Radio';
import { CodeEditor } from '@/components/common/code-editor';
import { RouteFormData } from '@/types';
import { type FieldChangeHandler, type RouteFormErrors } from '../route-form-logic';

interface InjectionSectionProps {
  formData: RouteFormData;
  errors: RouteFormErrors;
  onFieldChange: FieldChangeHandler;
}

const InjectionSection: React.FC<InjectionSectionProps> = ({
  formData,
  errors,
  onFieldChange,
}) => (
  <div className="space-y-4">
    {/* Inject Timing */}
    <div className="space-y-2">
      <label className="ds-label">Inject Timing</label>
      <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[var(--radius-md)] p-3">
        <div className="flex gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <Radio
              checked={formData.injectAt === 'document_start'}
              onChange={() => onFieldChange('injectAt', 'document_start')}
              value="document_start"
              name="injectAt"
              size="sm"
            />
            <span className="text-[12px] text-[var(--text-primary)]">Document Start</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <Radio
              checked={formData.injectAt === 'document_end'}
              onChange={() => onFieldChange('injectAt', 'document_end')}
              value="document_end"
              name="injectAt"
              size="sm"
            />
            <span className="text-[12px] text-[var(--text-primary)]">Document End</span>
          </label>
        </div>
      </div>
    </div>

    {/* JavaScript */}
    <div className="space-y-2">
      <label className="ds-label">JavaScript to Inject</label>
      <CodeEditor
        value={formData.scripts[0] || ''}
        onChange={(value) => onFieldChange('scripts', [value])}
        language="javascript"
        height={200}
        placeholder="// Enter JavaScript code to inject into matching pages"
      />
      {errors.scripts && (
        <p className="text-[11px] text-[var(--accent-rose)]">{errors.scripts}</p>
      )}
    </div>

    {/* CSS */}
    <div className="space-y-2">
      <label className="ds-label">CSS to Inject</label>
      <CodeEditor
        value={formData.stylesheets[0] || ''}
        onChange={(value) => onFieldChange('stylesheets', [value])}
        language="css"
        height={200}
        placeholder="/* Enter CSS styles to inject into matching pages */"
      />
    </div>
  </div>
);

export default InjectionSection;
