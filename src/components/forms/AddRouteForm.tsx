import React, { useState, useEffect } from 'react';
import {
  Tag,
  Link,
  Check,
  Clock,
  X,
  Settings2,
  Filter,
  ArrowDownLeft,
  ArrowUpRight
} from 'lucide-react';
import { useAppStore } from '@/stores/app-store';
import { chromeApi, parseRouteKey, createRouteKey, validateJson, formatJson } from '@/lib/chrome-api';
import { parseWebSocketKey } from '@/lib/utils';
import {
  HttpMethod,
  RouteFormData
} from '@/types';
import {
  defaultFormData,
  commonResponseHeaders,
  commonRequestHeaders,
  commonRemoveHeaders
} from '@/constants/route-form';
import Input from '../ui/Input';
import Select, { type SelectOption } from '../ui/Select';
import Button from '../ui/Button';
import Radio from '../ui/Radio';
import ReactAceEditor from '@/components/common/ReactAceEditor';
import HeaderEditor from './HeaderEditor';
import RemoveHeadersEditor from './RemoveHeaderEditor';
import RouteTypeSelection from './RouteTypeSelection';
import WebSocketRuleEditor from './WebSocketRuleEditor';

const httpMethodOptions: SelectOption[] = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].map(method => ({
  value: method,
  label: method
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
  { value: '504', label: '504 Gateway Timeout' }
];

const contentTypeOptions: SelectOption[] = [
  { value: 'application/json', label: 'application/json' },
  { value: 'text/plain', label: 'text/plain' },
  { value: 'text/html', label: 'text/html' },
  { value: 'application/xml', label: 'application/xml' }
];

const AddRouteForm: React.FC = () => {
  const {
    routes,
    editingRoute,
    setActiveTab,
    setEditingRoute,
    addNotification,
    addRoute,
    updateRoute
  } = useAppStore();

  const [formData, setFormData] = useState<RouteFormData>(defaultFormData);
  const [errors, setErrors] = useState<Partial<Record<keyof RouteFormData, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load route data when editing
  useEffect(() => {
    if (editingRoute && routes[editingRoute]) {
      const routeConfig = routes[editingRoute];

      if (editingRoute.startsWith('WS:')) {
        // WebSocket route
        const { url, name } = parseWebSocketKey(editingRoute);
        setFormData({
          ...defaultFormData,
          routeType: 'websocket',
          name: name || '',
          url,
          delay: routeConfig.delay || 0,
          incomingRules: (routeConfig as any).incomingRules || [],
          outgoingRules: (routeConfig as any).outgoingRules || []
        });
      } else {
        // HTTP route
        const { method, url, name } = parseRouteKey(editingRoute);
        setFormData({
          ...defaultFormData,
          routeType: 'http',
          name: name || '',
          url,
          method: method as HttpMethod,
          status: (routeConfig as any).status,
          delay: routeConfig.delay ?? 0,
          contentType: (routeConfig as any).contentType,
          response: typeof (routeConfig as any).response === 'object'
            ? formatJson((routeConfig as any).response)
            : String((routeConfig as any).response),
          responseHeaders: (routeConfig as any).responseHeaders || {},
          requestHeaders: (routeConfig as any).requestHeaders || {},
          removeRequestHeaders: (routeConfig as any).removeRequestHeaders || [],
          headersOnly: (routeConfig as any).headersOnly || false
        });
      }
    } else {
      setFormData(defaultFormData);
    }
  }, [editingRoute, routes]);

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof RouteFormData, string>> = {};

    if (!formData.url.trim()) {
      newErrors.url = 'URL is required';
    }

    if (formData.delay < 0) {
      newErrors.delay = 'Delay must be 0 or greater';
    }

    if (formData.routeType === 'http') {
      // HTTP validation
      if (formData.status < 100 || formData.status > 599) {
        newErrors.status = 'Status code must be between 100 and 599';
      }

      if (!formData.headersOnly) {
        if (!formData.response.trim()) {
          newErrors.response = 'Response is required for full interception mode';
        } else if (formData.contentType === 'application/json') {
          const jsonValidation = validateJson(formData.response);
          if (!jsonValidation.isValid) {
            newErrors.response = jsonValidation.error;
          }
        }
      } else {
        const hasResponseHeaders = Object.keys(formData.responseHeaders).length > 0;
        const hasRequestHeaders = Object.keys(formData.requestHeaders).length > 0;
        const hasRemoveHeaders = formData.removeRequestHeaders.length > 0;

        if (!hasResponseHeaders && !hasRequestHeaders && !hasRemoveHeaders) {
          newErrors.responseHeaders = 'At least one header modification is required for headers-only mode';
        }
      }
    } else {
      // WebSocket validation
      const hasIncomingRules = formData.incomingRules.some(rule => rule.enabled && rule.match.trim());
      const hasOutgoingRules = formData.outgoingRules.some(rule => rule.enabled && rule.match.trim());

      if (!hasIncomingRules && !hasOutgoingRules) {
        newErrors.incomingRules = 'At least one message rule is required for WebSocket interception';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      addNotification({title: 'Validation Error', message: 'Please fix the form errors before submitting', type: 'error', timestamp: Date.now()});
      return;
    }

    setIsSubmitting(true);

    try {
      let routeKey: string;
      let routeConfig: any;

      if (formData.routeType === 'websocket') {
        // WebSocket route
        routeKey = formData.name
          ? `WS:${formData.url}|${formData.name}`
          : `WS:${formData.url}`;

        routeConfig = {
          enabled: true,
          timestamp: Date.now(),
          name: formData.name,
          incomingRules: formData.incomingRules,
          outgoingRules: formData.outgoingRules,
          delay: formData.delay
        };
      } else {
        // HTTP route
        routeKey = createRouteKey(formData.method, formData.url, formData.name);

        let responseBody: any;
        if (!formData.headersOnly) {
          if (formData.contentType === 'application/json') {
            const jsonValidation = validateJson(formData.response);
            responseBody = jsonValidation.parsed;
          } else {
            responseBody = formData.response;
          }
        } else {
          responseBody = formData.response.trim() || null;
        }

        routeConfig = {
          status: formData.status,
          delay: formData.delay,
          response: responseBody,
          contentType: formData.contentType,
          enabled: true,
          timestamp: Date.now(),
          name: formData.name,
          responseHeaders: formData.responseHeaders,
          requestHeaders: formData.requestHeaders,
          removeRequestHeaders: formData.removeRequestHeaders,
          headersOnly: formData.headersOnly
        };
      }

      // Check if we're editing and the key has changed
      const isEditing = editingRoute != null;
      const keyChanged = isEditing && editingRoute !== routeKey;

      if (isEditing && keyChanged) {
        await chromeApi.removeRoute(editingRoute);
        await chromeApi.addRoute(routeKey, routeConfig, formData.name);
        updateRoute(routeKey, routeConfig);
      } else {
        const targetKey = isEditing ? editingRoute : routeKey;
        await chromeApi.addRoute(targetKey, routeConfig, formData.name);

        if (isEditing) {
          updateRoute(targetKey, routeConfig);
        } else {
          addRoute(targetKey, routeConfig);
        }
      }

      const typeText = formData.routeType === 'websocket' ? ' WebSocket' : '';
      const modeText = formData.routeType === 'http' && formData.headersOnly ? ' (Headers-Only)' : '';

      addNotification({
        title: 'Success',
        message: (isEditing ? 'Route updated successfully' : 'Route added successfully') + typeText + modeText,
        type: 'success',
        timestamp: Date.now()
      });

      handleCancel();

    } catch (error) {
      console.error('Error saving route:', error);
      addNotification({title: 'Error', message: 'Failed to save route', type: 'error', timestamp: Date.now()});
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setFormData(defaultFormData);
    setErrors({});
    setEditingRoute(null);
    setActiveTab('routes');
  };

  const handleInputChange = (field: keyof RouteFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const isEditing = editingRoute != null;
  const isWebSocket = formData.routeType === 'websocket';

  const getEditorLanguage = () => {
    switch (formData.contentType) {
      case 'application/json':
        return 'json';
      case 'text/plain':
        return 'text';
      case 'text/html':
        return 'html';
      case 'application/xml':
        return 'xml';
      default:
        return 'text';
    }
  };

  return (
    <div className="ds-panel max-w-4xl mx-auto">
      <div className="ds-panel-header">
        <div className="flex items-center gap-2">
          <Settings2 size={18} className="text-[var(--accent-indigo)]" />
          <span className="text-[14px] font-semibold text-[var(--text-primary)]">
            {isEditing ? 'Edit Route' : 'Add New Route'}
          </span>
          {isWebSocket ? (
            <span className="ds-badge violet">WebSocket</span>
          ) : formData.headersOnly ? (
            <span className="ds-badge info">Headers-Only</span>
          ) : (
            <span className="ds-badge success">Full Response</span>
          )}
        </div>
      </div>

      <div className="ds-panel-body space-y-4">
        <RouteTypeSelection
          formData={formData}
          handleInputChange={(field: string, value: string) => handleInputChange(field as keyof RouteFormData, value)}
        />

        {/* Route Name */}
        <Input
          label="Route Name (optional)"
          placeholder={isWebSocket ? "e.g. Chat Messages, Live Updates" : "e.g. Success Response, Error 404"}
          value={formData.name}
          onChange={(e) => handleInputChange('name', e.target.value)}
          leftIcon={<Tag size={14} />}
          helperText="Give your route a descriptive name to easily identify it"
        />

        {/* URL */}
        <Input
          label={isWebSocket ? "WebSocket URL to Intercept" : "URL to Intercept"}
          placeholder={isWebSocket
            ? "e.g. wss://api.example.com/chat or ws://localhost:8080/updates"
            : "e.g. /api/users or https://example.com/api/data"
          }
          value={formData.url}
          onChange={(e) => handleInputChange('url', e.target.value)}
          leftIcon={<Link size={14} />}
          error={errors.url}
          helperText={isWebSocket
            ? "Supports wildcards (*). Examples: wss://api.example.com/*, ws://localhost:*/chat"
            : "Supports wildcards (*) and query parameters. Examples: /api/users, /api/users/*, https://api.example.com/data"
          }
        />

        {/* HTTP-specific fields */}
        {!isWebSocket && (
          <>
            {/* Interception Mode */}
            <div className="space-y-2">
              <label className="ds-label">Interception Mode</label>

              <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[var(--radius-md)] p-3">
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Radio
                      checked={!formData.headersOnly}
                      onChange={() => handleInputChange('headersOnly', false)}
                      value="full"
                      name="interceptionMode"
                      size="sm"
                    />
                    <Settings2 size={14} className="text-[var(--accent-emerald)]" />
                    <span className="text-[12px] text-[var(--text-primary)]">Full Response</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <Radio
                      checked={formData.headersOnly}
                      onChange={() => handleInputChange('headersOnly', true)}
                      value="headers"
                      name="interceptionMode"
                      size="sm"
                    />
                    <Filter size={14} className="text-[var(--accent-violet)]" />
                    <span className="text-[12px] text-[var(--text-primary)]">Headers Only</span>
                  </label>
                </div>

                <div className="mt-2 text-[11px] text-[var(--text-tertiary)]">
                  {formData.headersOnly
                    ? 'Modify request/response headers while letting the original request proceed'
                    : 'Replace the entire response with your mock data'
                  }
                </div>
              </div>
            </div>

            {/* Method */}
            <Select
              label="HTTP Method"
              value={formData.method}
              onChange={(value) => handleInputChange('method', value as HttpMethod)}
              options={httpMethodOptions}
            />

            {/* Status and Delay Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {!formData.headersOnly && (
                <Select
                  label="Status Code"
                  value={String(formData.status)}
                  onChange={(value) => handleInputChange('status', parseInt(value, 10) || 200)}
                  options={statusCodeOptions}
                />
              )}

              <Input
                label="Response Delay (ms)"
                type="number"
                min={0}
                value={formData.delay}
                onChange={(e) => handleInputChange('delay', parseInt(e.target.value) || 0)}
                leftIcon={<Clock size={14} />}
                error={errors.delay}
                helperText={formData.headersOnly ? "Delay before modifying headers" : "Delay before returning mock response"}
              />
            </div>

            {/* Content Type - Only show for full interception */}
            {!formData.headersOnly && (
              <Select
                label="Content Type"
                value={formData.contentType}
                onChange={(value) => handleInputChange('contentType', value)}
                options={contentTypeOptions}
              />
            )}

            {/* Response Headers */}
            <HeaderEditor
              title="Response Headers"
              description={formData.headersOnly
                ? "Headers to add/modify in the real server response"
                : "Headers to include in the mock response"
              }
              headers={formData.responseHeaders}
              onHeadersChange={(headers: Record<string, string>) => handleInputChange('responseHeaders', headers)}
              placeholder={{ key: 'X-Custom-Header', value: 'Custom Value' }}
              commonHeaders={commonResponseHeaders}
            />

            {/* Request Headers */}
            <HeaderEditor
              title="Request Headers"
              description="Headers to add or modify in outgoing requests"
              headers={formData.requestHeaders}
              onHeadersChange={(headers: Record<string, string>) => handleInputChange('requestHeaders', headers)}
              placeholder={{ key: 'Authorization', value: 'Bearer token123' }}
              commonHeaders={commonRequestHeaders}
            />

            {/* Remove Request Headers */}
            <RemoveHeadersEditor
              title="Remove Request Headers"
              description="Headers to strip from outgoing requests"
              removeHeaders={formData.removeRequestHeaders}
              onRemoveHeadersChange={(headers: string[]) => handleInputChange('removeRequestHeaders', headers)}
              commonHeaders={commonRemoveHeaders}
            />

            {/* Response Body */}
            <div className="space-y-2">
              <label className="ds-label">
                Response Body {formData.headersOnly && <span className="text-[var(--text-tertiary)]">(Optional)</span>}
              </label>

              {formData.headersOnly && (
                <div className="text-[11px] text-[var(--text-secondary)] mb-2">
                  In headers-only mode, you can optionally provide a response body for testing,
                  but the real server response will be used.
                </div>
              )}

              <ReactAceEditor
                value={formData.response}
                onChange={(value) => handleInputChange('response', value)}
                language={getEditorLanguage()}
                height={formData.headersOnly ? 200 : 300}
                placeholder={formData.headersOnly
                  ? "Optional: Enter test response content here"
                  : "Enter your response content here"
                }
              />

              {errors.response && (
                <p className="text-[11px] text-[var(--accent-rose)]">{errors.response}</p>
              )}
              {errors.responseHeaders && (
                <p className="text-[11px] text-[var(--accent-rose)]">{errors.responseHeaders}</p>
              )}
            </div>
          </>
        )}

        {/* WebSocket-specific fields */}
        {isWebSocket && (
          <>
            <Input
              label="Processing Delay (ms)"
              type="number"
              min={0}
              value={formData.delay}
              onChange={(e) => handleInputChange('delay', parseInt(e.target.value) || 0)}
              leftIcon={<Clock size={14} />}
              error={errors.delay}
              helperText="Delay before processing WebSocket messages"
            />

            {/* WebSocket Rules */}
            <WebSocketRuleEditor
              title="Incoming Message Rules"
              rules={formData.incomingRules}
              onRulesChange={(rules) => handleInputChange('incomingRules', rules)}
              direction="incoming"
              icon={<ArrowDownLeft size={14} className="text-[var(--accent-emerald)]" />}
            />

            <WebSocketRuleEditor
              title="Outgoing Message Rules"
              rules={formData.outgoingRules}
              onRulesChange={(rules) => handleInputChange('outgoingRules', rules)}
              direction="outgoing"
              icon={<ArrowUpRight size={14} className="text-[var(--accent-cyan)]" />}
            />

            {errors.incomingRules && (
              <p className="text-[11px] text-[var(--accent-rose)]">{errors.incomingRules}</p>
            )}
          </>
        )}
      </div>

      <div className="flex items-center justify-end gap-2 px-4 py-3 bg-[var(--bg-surface)] border-t border-[var(--border-subtle)]">
        <Button
          variant="default"
          onClick={handleCancel}
          leftIcon={<X size={14} />}
        >
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={handleSubmit}
          disabled={isSubmitting}
          leftIcon={isEditing ? <Check size={14} /> : undefined}
        >
          {isSubmitting ? 'Saving...' : isEditing ? 'Save Changes' : 'Add Interception'}
        </Button>
      </div>
    </div>
  );
};

export default AddRouteForm;
