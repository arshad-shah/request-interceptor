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
  ArrowUpRight,
  Ban,
  ExternalLink,
  Search,
  Code
} from 'lucide-react';
import { useAppStore } from '@/stores/app-store';
import { chromeApi, parseRouteKey, createRouteKey, createInjectionKey, validateJson, formatJson } from '@/lib/chrome-api';
import { parseWebSocketKey, parseInjectionKey } from '@/lib/utils';
import {
  HttpMethod,
  RouteFormData,
  InterceptionMode
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
import QueryParamEditor from './QueryParamEditor';

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
        const { url, name } = parseWebSocketKey(editingRoute);
        setFormData({
          ...defaultFormData,
          routeType: 'websocket',
          name: name || '',
          url,
          delay: (routeConfig as any).delay || 0,
          incomingRules: (routeConfig as any).incomingRules || [],
          outgoingRules: (routeConfig as any).outgoingRules || []
        });
      } else if (editingRoute.startsWith('INJ:')) {
        const { urlPattern, name } = parseInjectionKey(editingRoute);
        setFormData({
          ...defaultFormData,
          routeType: 'injection',
          name: name || '',
          url: urlPattern,
          scripts: (routeConfig as any).scripts || [],
          stylesheets: (routeConfig as any).stylesheets || [],
          injectAt: (routeConfig as any).injectAt || 'document_end'
        });
      } else {
        const { method, url, name } = parseRouteKey(editingRoute);
        const rc = routeConfig as any;
        const mode: InterceptionMode = rc.interceptionMode || (rc.headersOnly ? 'passthrough' : 'mock');
        setFormData({
          ...defaultFormData,
          routeType: 'http',
          name: name || '',
          url,
          method: method as HttpMethod,
          status: rc.status,
          delay: rc.delay ?? 0,
          contentType: rc.contentType,
          response: typeof rc.response === 'object'
            ? formatJson(rc.response)
            : String(rc.response ?? ''),
          responseHeaders: rc.responseHeaders || {},
          requestHeaders: rc.requestHeaders || {},
          removeRequestHeaders: rc.removeRequestHeaders || [],
          headersOnly: rc.headersOnly || false,
          interceptionMode: mode,
          redirectUrl: rc.redirectUrl || '',
          requestBody: rc.requestBody || '',
          queryParamRules: rc.queryParamRules || [],
          graphqlOperationName: rc.graphqlOperationName || ''
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
      if (formData.status < 100 || formData.status > 599) {
        newErrors.status = 'Status code must be between 100 and 599';
      }

      switch (formData.interceptionMode) {
        case 'mock':
          if (!formData.response.trim()) {
            newErrors.response = 'Response is required for mock mode';
          } else if (formData.contentType === 'application/json') {
            const jsonValidation = validateJson(formData.response);
            if (!jsonValidation.isValid) {
              newErrors.response = jsonValidation.error;
            }
          }
          break;
        case 'passthrough': {
          const hasResponseHeaders = Object.keys(formData.responseHeaders).length > 0;
          const hasRequestHeaders = Object.keys(formData.requestHeaders).length > 0;
          const hasRemoveHeaders = formData.removeRequestHeaders.length > 0;
          const hasRequestBody = formData.requestBody.trim().length > 0;
          const hasQueryParams = formData.queryParamRules.length > 0;

          if (!hasResponseHeaders && !hasRequestHeaders && !hasRemoveHeaders && !hasRequestBody && !hasQueryParams) {
            newErrors.responseHeaders = 'At least one modification is required for passthrough mode';
          }
          break;
        }
        case 'block':
          // No additional validation needed
          break;
        case 'redirect':
          if (!formData.redirectUrl.trim()) {
            newErrors.redirectUrl = 'Redirect URL is required';
          }
          break;
      }
    } else if (formData.routeType === 'websocket') {
      const hasIncomingRules = formData.incomingRules.some(rule => rule.enabled && rule.match.trim());
      const hasOutgoingRules = formData.outgoingRules.some(rule => rule.enabled && rule.match.trim());

      if (!hasIncomingRules && !hasOutgoingRules) {
        newErrors.incomingRules = 'At least one message rule is required for WebSocket interception';
      }
    } else if (formData.routeType === 'injection') {
      const hasScripts = formData.scripts.some(s => s.trim());
      const hasStylesheets = formData.stylesheets.some(s => s.trim());

      if (!hasScripts && !hasStylesheets) {
        newErrors.scripts = 'At least one script or stylesheet is required';
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
      } else if (formData.routeType === 'injection') {
        routeKey = createInjectionKey(formData.url, formData.name);

        routeConfig = {
          enabled: true,
          timestamp: Date.now(),
          name: formData.name,
          scripts: formData.scripts.filter(s => s.trim()),
          stylesheets: formData.stylesheets.filter(s => s.trim()),
          injectAt: formData.injectAt,
          urlPattern: formData.url
        };
      } else {
        routeKey = createRouteKey(formData.method, formData.url, formData.name);

        let responseBody: any;
        if (formData.interceptionMode === 'mock') {
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
          headersOnly: formData.interceptionMode === 'passthrough',
          interceptionMode: formData.interceptionMode,
          redirectUrl: formData.redirectUrl,
          requestBody: formData.requestBody,
          queryParamRules: formData.queryParamRules,
          graphqlOperationName: formData.graphqlOperationName
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

      const typeText = formData.routeType === 'websocket' ? ' WebSocket' : formData.routeType === 'injection' ? ' Injection' : '';
      const modeText = formData.routeType === 'http' ? ` (${formData.interceptionMode})` : '';

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
  const isInjection = formData.routeType === 'injection';

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
          ) : isInjection ? (
            <span className="ds-badge" style={{ color: 'var(--accent-indigo)', background: 'rgba(99,102,241,0.15)' }}>Injection</span>
          ) : formData.interceptionMode === 'block' ? (
            <span className="ds-badge" style={{ color: 'var(--accent-rose)', background: 'rgba(244,63,94,0.15)' }}>Block</span>
          ) : formData.interceptionMode === 'redirect' ? (
            <span className="ds-badge" style={{ color: 'var(--accent-amber)', background: 'rgba(245,158,11,0.15)' }}>Redirect</span>
          ) : formData.interceptionMode === 'passthrough' ? (
            <span className="ds-badge info">Passthrough</span>
          ) : (
            <span className="ds-badge success">Mock Response</span>
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
        {!isWebSocket && !isInjection && (
          <>
            {/* Interception Mode */}
            <div className="space-y-2">
              <label className="ds-label">Interception Mode</label>

              <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[var(--radius-md)] p-3">
                <div className="flex flex-wrap gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Radio
                      checked={formData.interceptionMode === 'mock'}
                      onChange={() => handleInputChange('interceptionMode', 'mock')}
                      value="mock"
                      name="interceptionMode"
                      size="sm"
                    />
                    <Settings2 size={14} className="text-[var(--accent-emerald)]" />
                    <span className="text-[12px] text-[var(--text-primary)]">Mock Response</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <Radio
                      checked={formData.interceptionMode === 'passthrough'}
                      onChange={() => handleInputChange('interceptionMode', 'passthrough')}
                      value="passthrough"
                      name="interceptionMode"
                      size="sm"
                    />
                    <Filter size={14} className="text-[var(--accent-violet)]" />
                    <span className="text-[12px] text-[var(--text-primary)]">Modify Request</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <Radio
                      checked={formData.interceptionMode === 'block'}
                      onChange={() => handleInputChange('interceptionMode', 'block')}
                      value="block"
                      name="interceptionMode"
                      size="sm"
                    />
                    <Ban size={14} className="text-[var(--accent-rose)]" />
                    <span className="text-[12px] text-[var(--text-primary)]">Block Request</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <Radio
                      checked={formData.interceptionMode === 'redirect'}
                      onChange={() => handleInputChange('interceptionMode', 'redirect')}
                      value="redirect"
                      name="interceptionMode"
                      size="sm"
                    />
                    <ExternalLink size={14} className="text-[var(--accent-amber)]" />
                    <span className="text-[12px] text-[var(--text-primary)]">Redirect</span>
                  </label>
                </div>

                <div className="mt-2 text-[11px] text-[var(--text-tertiary)]">
                  {formData.interceptionMode === 'mock' && 'Replace the entire response with your mock data'}
                  {formData.interceptionMode === 'passthrough' && 'Modify request headers, body, or query params while letting the original request proceed'}
                  {formData.interceptionMode === 'block' && 'Block the request entirely — returns a network error'}
                  {formData.interceptionMode === 'redirect' && 'Forward the request to a different URL'}
                </div>
              </div>
            </div>

            {/* Redirect URL */}
            {formData.interceptionMode === 'redirect' && (
              <Input
                label="Redirect URL"
                placeholder="https://other-api.example.com/endpoint"
                value={formData.redirectUrl}
                onChange={(e) => handleInputChange('redirectUrl', e.target.value)}
                leftIcon={<ExternalLink size={14} />}
                error={(errors as any).redirectUrl}
                helperText="The URL to redirect the request to"
              />
            )}

            {/* Method */}
            <Select
              label="HTTP Method"
              value={formData.method}
              onChange={(value) => handleInputChange('method', value as HttpMethod)}
              options={httpMethodOptions}
            />

            {/* GraphQL Operation Name */}
            <Input
              label="GraphQL Operation Name (optional)"
              placeholder="e.g. GetUsers, CreatePost"
              value={formData.graphqlOperationName}
              onChange={(e) => handleInputChange('graphqlOperationName', e.target.value)}
              leftIcon={<Search size={14} />}
              helperText="When set, only intercept GraphQL requests with this operation name"
            />

            {/* Status and Delay Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {formData.interceptionMode === 'mock' && (
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
                helperText="Delay before processing the request"
              />
            </div>

            {/* Content Type - Only show for mock */}
            {formData.interceptionMode === 'mock' && (
              <Select
                label="Content Type"
                value={formData.contentType}
                onChange={(value) => handleInputChange('contentType', value)}
                options={contentTypeOptions}
              />
            )}

            {/* Query Parameter Rules - show for non-block modes */}
            {formData.interceptionMode !== 'block' && (
              <QueryParamEditor
                rules={formData.queryParamRules}
                onRulesChange={(rules) => handleInputChange('queryParamRules', rules)}
              />
            )}

            {/* Response Headers - show for mock and passthrough */}
            {(formData.interceptionMode === 'mock' || formData.interceptionMode === 'passthrough') && (
              <HeaderEditor
                title="Response Headers"
                description={formData.interceptionMode === 'passthrough'
                  ? "Headers to add/modify in the real server response"
                  : "Headers to include in the mock response"
                }
                headers={formData.responseHeaders}
                onHeadersChange={(headers: Record<string, string>) => handleInputChange('responseHeaders', headers)}
                placeholder={{ key: 'X-Custom-Header', value: 'Custom Value' }}
                commonHeaders={commonResponseHeaders}
              />
            )}

            {/* Request Headers - show for non-block modes */}
            {formData.interceptionMode !== 'block' && (
              <HeaderEditor
                title="Request Headers"
                description="Headers to add or modify in outgoing requests"
                headers={formData.requestHeaders}
                onHeadersChange={(headers: Record<string, string>) => handleInputChange('requestHeaders', headers)}
                placeholder={{ key: 'Authorization', value: 'Bearer token123' }}
                commonHeaders={commonRequestHeaders}
              />
            )}

            {/* Remove Request Headers - show for non-block modes */}
            {formData.interceptionMode !== 'block' && (
              <RemoveHeadersEditor
                title="Remove Request Headers"
                description="Headers to strip from outgoing requests"
                removeHeaders={formData.removeRequestHeaders}
                onRemoveHeadersChange={(headers: string[]) => handleInputChange('removeRequestHeaders', headers)}
                commonHeaders={commonRemoveHeaders}
              />
            )}

            {/* Request Body Override - show for passthrough */}
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
                  onChange={(value) => handleInputChange('requestBody', value)}
                  language="json"
                  height={150}
                  placeholder="Enter request body override"
                />
              </div>
            )}

            {/* Response Body */}
            {formData.interceptionMode !== 'block' && (
              <div className="space-y-2">
                <label className="ds-label">
                  Response Body {formData.interceptionMode !== 'mock' && <span className="text-[var(--text-tertiary)]">(Optional)</span>}
                </label>

                {formData.interceptionMode !== 'mock' && (
                  <div className="text-[11px] text-[var(--text-secondary)] mb-2">
                    In {formData.interceptionMode} mode, the real server response will be used.
                  </div>
                )}

                <ReactAceEditor
                  value={formData.response}
                  onChange={(value) => handleInputChange('response', value)}
                  language={getEditorLanguage()}
                  height={formData.interceptionMode === 'mock' ? 300 : 200}
                  placeholder={formData.interceptionMode === 'mock'
                    ? "Enter your response content here"
                    : "Optional: Enter test response content here"
                  }
                />

                {errors.response && (
                  <p className="text-[11px] text-[var(--accent-rose)]">{errors.response}</p>
                )}
                {errors.responseHeaders && (
                  <p className="text-[11px] text-[var(--accent-rose)]">{errors.responseHeaders}</p>
                )}
              </div>
            )}
          </>
        )}

        {/* Injection-specific fields */}
        {isInjection && (
          <>
            {/* Inject Timing */}
            <div className="space-y-2">
              <label className="ds-label">Inject Timing</label>
              <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-[var(--radius-md)] p-3">
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Radio
                      checked={formData.injectAt === 'document_start'}
                      onChange={() => handleInputChange('injectAt', 'document_start')}
                      value="document_start"
                      name="injectAt"
                      size="sm"
                    />
                    <span className="text-[12px] text-[var(--text-primary)]">Document Start</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Radio
                      checked={formData.injectAt === 'document_end'}
                      onChange={() => handleInputChange('injectAt', 'document_end')}
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
              <ReactAceEditor
                value={formData.scripts[0] || ''}
                onChange={(value) => handleInputChange('scripts', [value])}
                language="javascript"
                height={200}
                placeholder="// Enter JavaScript code to inject into matching pages"
              />
              {(errors as any).scripts && (
                <p className="text-[11px] text-[var(--accent-rose)]">{(errors as any).scripts}</p>
              )}
            </div>

            {/* CSS */}
            <div className="space-y-2">
              <label className="ds-label">CSS to Inject</label>
              <ReactAceEditor
                value={formData.stylesheets[0] || ''}
                onChange={(value) => handleInputChange('stylesheets', [value])}
                language="css"
                height={200}
                placeholder="/* Enter CSS styles to inject into matching pages */"
              />
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
