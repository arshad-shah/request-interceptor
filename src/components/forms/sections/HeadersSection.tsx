import React from 'react';
import HeaderEditor from '../HeaderEditor';
import RemoveHeadersEditor from '../RemoveHeaderEditor';
import QueryParamEditor from '../QueryParamEditor';
import { RouteFormData } from '@/types';
import {
  commonResponseHeaders,
  commonRequestHeaders,
  commonRemoveHeaders,
} from '@/constants/route-form';

interface HeadersSectionProps {
  formData: RouteFormData;
  onFieldChange: (field: keyof RouteFormData, value: any) => void;
}

const HeadersSection: React.FC<HeadersSectionProps> = ({
  formData,
  onFieldChange,
}) => (
  <div className="space-y-4">
    {formData.interceptionMode !== 'block' && (
      <QueryParamEditor
        rules={formData.queryParamRules}
        onRulesChange={(rules) => onFieldChange('queryParamRules', rules)}
      />
    )}

    {(formData.interceptionMode === 'mock' || formData.interceptionMode === 'passthrough') && (
      <HeaderEditor
        title="Response Headers"
        description={
          formData.interceptionMode === 'passthrough'
            ? 'Headers to add/modify in the real server response'
            : 'Headers to include in the mock response'
        }
        headers={formData.responseHeaders}
        onHeadersChange={(headers: Record<string, string>) =>
          onFieldChange('responseHeaders', headers)
        }
        placeholder={{ key: 'X-Custom-Header', value: 'Custom Value' }}
        commonHeaders={commonResponseHeaders}
      />
    )}

    {formData.interceptionMode !== 'block' && (
      <HeaderEditor
        title="Request Headers"
        description="Headers to add or modify in outgoing requests"
        headers={formData.requestHeaders}
        onHeadersChange={(headers: Record<string, string>) =>
          onFieldChange('requestHeaders', headers)
        }
        placeholder={{ key: 'Authorization', value: 'Bearer token123' }}
        commonHeaders={commonRequestHeaders}
      />
    )}

    {formData.interceptionMode !== 'block' && (
      <RemoveHeadersEditor
        title="Remove Request Headers"
        description="Headers to strip from outgoing requests"
        removeHeaders={formData.removeRequestHeaders}
        onRemoveHeadersChange={(headers: string[]) =>
          onFieldChange('removeRequestHeaders', headers)
        }
        commonHeaders={commonRemoveHeaders}
      />
    )}
  </div>
);

export default HeadersSection;
