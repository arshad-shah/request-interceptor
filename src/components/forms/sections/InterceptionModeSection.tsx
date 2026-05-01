import React from 'react';
import { Settings2, Filter, Ban, ExternalLink } from 'lucide-react';
import Radio from '@/components/ui/Radio';
import Input from '@/components/ui/Input';
import { RouteFormData, InterceptionMode } from '@/types';

interface InterceptionModeSectionProps {
  formData: RouteFormData;
  errors: Partial<Record<keyof RouteFormData, string>>;
  onFieldChange: (field: keyof RouteFormData, value: any) => void;
}

const modeDescriptions: Record<InterceptionMode, string> = {
  mock: 'Replace the entire response with your mock data',
  passthrough: 'Modify request headers, body, or query params while letting the original request proceed',
  block: 'Block the request entirely — returns a network error',
  redirect: 'Forward the request to a different URL',
};

const modes: { value: InterceptionMode; label: string; icon: React.ReactNode }[] = [
  { value: 'mock', label: 'Mock Response', icon: <Settings2 size={14} className="text-[var(--accent-emerald)]" /> },
  { value: 'passthrough', label: 'Modify Request', icon: <Filter size={14} className="text-[var(--accent-violet)]" /> },
  { value: 'block', label: 'Block Request', icon: <Ban size={14} className="text-[var(--accent-rose)]" /> },
  { value: 'redirect', label: 'Redirect', icon: <ExternalLink size={14} className="text-[var(--accent-amber)]" /> },
];

const InterceptionModeSection: React.FC<InterceptionModeSectionProps> = ({
  formData,
  errors,
  onFieldChange,
}) => (
  <div className="space-y-4">
    <div className="space-y-2">
      <label className="ds-label">Interception Mode</label>
      <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[var(--radius-md)] p-3">
        <div className="flex flex-wrap gap-4">
          {modes.map(({ value, label, icon }) => (
            <label key={value} className="flex items-center gap-2 cursor-pointer">
              <Radio
                checked={formData.interceptionMode === value}
                onChange={() => onFieldChange('interceptionMode', value)}
                value={value}
                name="interceptionMode"
                size="sm"
              />
              {icon}
              <span className="text-[12px] text-[var(--text-primary)]">{label}</span>
            </label>
          ))}
        </div>
        <div className="mt-2 text-[11px] text-[var(--text-tertiary)]">
          {modeDescriptions[formData.interceptionMode]}
        </div>
      </div>
    </div>

    {formData.interceptionMode === 'redirect' && (
      <Input
        label="Redirect URL"
        placeholder="https://other-api.example.com/endpoint"
        value={formData.redirectUrl}
        onChange={(e) => onFieldChange('redirectUrl', e.target.value)}
        leftIcon={<ExternalLink />}
        error={(errors as any).redirectUrl}
        helperText="The URL to redirect the request to"
      />
    )}
  </div>
);

export default InterceptionModeSection;
