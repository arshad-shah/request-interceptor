import React from 'react';
import { Clock, Search } from 'lucide-react';
import Input from '@/components/ui/Input';
import Select, { type SelectOption } from '@/components/ui/Select';
import { RouteFormData, HttpMethod } from '@/types';

const httpMethodOptions: SelectOption[] = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].map(method => ({
  value: method,
  label: method,
}));

const statusCodeOptions: SelectOption[] = [
  { value: '200', label: '200 OK' },
  { value: '201', label: '201 Created' },
  { value: '204', label: '204 No Content' },
  { value: '301', label: '301 Moved Permanently' },
  { value: '302', label: '302 Found' },
  { value: '304', label: '304 Not Modified' },
  { value: '400', label: '400 Bad Request' },
  { value: '401', label: '401 Unauthorized' },
  { value: '403', label: '403 Forbidden' },
  { value: '404', label: '404 Not Found' },
  { value: '422', label: '422 Unprocessable Entity' },
  { value: '429', label: '429 Too Many Requests' },
  { value: '500', label: '500 Internal Server Error' },
  { value: '502', label: '502 Bad Gateway' },
  { value: '503', label: '503 Service Unavailable' },
  { value: '504', label: '504 Gateway Timeout' },
];

const contentTypeOptions: SelectOption[] = [
  { value: 'application/json', label: 'application/json' },
  { value: 'text/plain', label: 'text/plain' },
  { value: 'text/html', label: 'text/html' },
  { value: 'application/xml', label: 'application/xml' },
];

interface RequestConfigSectionProps {
  formData: RouteFormData;
  errors: Partial<Record<keyof RouteFormData, string>>;
  onFieldChange: (field: keyof RouteFormData, value: any) => void;
}

const RequestConfigSection: React.FC<RequestConfigSectionProps> = ({
  formData,
  errors,
  onFieldChange,
}) => (
  <div className="space-y-4">
    <Select
      label="HTTP Method"
      value={formData.method}
      onChange={(value) => onFieldChange('method', value as HttpMethod)}
      options={httpMethodOptions}
    />

    <Input
      label="GraphQL Operation Name (optional)"
      placeholder="e.g. GetUsers, CreatePost"
      value={formData.graphqlOperationName}
      onChange={(e) => onFieldChange('graphqlOperationName', e.target.value)}
      leftIcon={<Search size={14} />}
      helperText="When set, only intercept GraphQL requests with this operation name"
    />

    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {formData.interceptionMode === 'mock' && (
        <Select
          label="Status Code"
          value={String(formData.status)}
          onChange={(value) => onFieldChange('status', parseInt(value, 10) || 200)}
          options={statusCodeOptions}
        />
      )}

      <Input
        label="Response Delay (ms)"
        type="number"
        min={0}
        value={formData.delay}
        onChange={(e) => onFieldChange('delay', parseInt(e.target.value) || 0)}
        leftIcon={<Clock size={14} />}
        error={errors.delay}
        helperText="Delay before processing the request"
      />
    </div>

    {formData.interceptionMode === 'mock' && (
      <Select
        label="Content Type"
        value={formData.contentType}
        onChange={(value) => onFieldChange('contentType', value)}
        options={contentTypeOptions}
      />
    )}
  </div>
);

export default RequestConfigSection;
