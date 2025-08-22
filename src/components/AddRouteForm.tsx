import React, { useState, useEffect } from 'react';
import { Tag, Link, Code, Check, Clock, FileText, X, Settings2, Filter } from 'lucide-react';
import { useAppStore } from '@/stores/app-store';
import { chromeApi, parseRouteKey, createRouteKey, validateJson, formatJson } from '@/lib/chrome-api';
import { HttpMethod, RouteFormData, HeaderConfig } from '@/types';
import Card from './ui/Card';
import Input from './ui/Input';
import Select from './ui/Select';
import Button from './ui/Button';
import Toggle from './ui/Toggle';
import ReactAceEditor from '@/components/ReactAceEditor';
import HeaderEditor from '@/components/HeaderEditor';
import RemoveHeadersEditor from '@/components/RemoveHeaderEditor';

const defaultFormData: RouteFormData = {
  name: '',
  url: '',
  method: 'GET',
  status: 200,
  delay: 0,
  contentType: 'application/json',
  response: formatJson({ status: 'success', data: [{ id: 1, name: 'Example' }] }),
  responseHeaders: {},
  requestHeaders: {},
  removeRequestHeaders: [],
  headersOnly: false // NEW: Default to full interception
};

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
      const { method, url, name } = parseRouteKey(editingRoute);
      
      setFormData({
        name: name || '',
        url,
        method: method as HttpMethod,
        status: routeConfig.status,
        delay: routeConfig.delay,
        contentType: routeConfig.contentType,
        response: typeof routeConfig.response === 'object' 
          ? formatJson(routeConfig.response) 
          : String(routeConfig.response),
        responseHeaders: routeConfig.responseHeaders || {},
        requestHeaders: routeConfig.requestHeaders || {},
        removeRequestHeaders: routeConfig.removeRequestHeaders || [],
        headersOnly: routeConfig.headersOnly || false // NEW: Load headers-only setting
      });
    } else {
      setFormData(defaultFormData);
    }
  }, [editingRoute, routes]);

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof RouteFormData, string>> = {};

    if (!formData.url.trim()) {
      newErrors.url = 'URL is required';
    }

    if (formData.status < 100 || formData.status > 599) {
      newErrors.status = 'Status code must be between 100 and 599';
    }

    if (formData.delay < 0) {
      newErrors.delay = 'Delay must be 0 or greater';
    }

    // NEW: Validate based on headers-only mode
    if (!formData.headersOnly) {
      // Full interception mode - response is required
      if (!formData.response.trim()) {
        newErrors.response = 'Response is required for full interception mode';
      } else if (formData.contentType === 'application/json') {
        const jsonValidation = validateJson(formData.response);
        if (!jsonValidation.isValid) {
          newErrors.response = jsonValidation.error;
        }
      }
    } else {
      // Headers-only mode - at least one header modification is required
      const hasResponseHeaders = Object.keys(formData.responseHeaders).length > 0;
      const hasRequestHeaders = Object.keys(formData.requestHeaders).length > 0;
      const hasRemoveHeaders = formData.removeRequestHeaders.length > 0;
      
      if (!hasResponseHeaders && !hasRequestHeaders && !hasRemoveHeaders) {
        newErrors.responseHeaders = 'At least one header modification is required for headers-only mode';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      addNotification('Validation Error', 'Please fix the form errors before submitting', 'error');
      return;
    }

    setIsSubmitting(true);

    try {
      // Parse response based on content type (only for full interception)
      let responseBody: any;
      if (!formData.headersOnly) {
        if (formData.contentType === 'application/json') {
          const jsonValidation = validateJson(formData.response);
          responseBody = jsonValidation.parsed;
        } else {
          responseBody = formData.response;
        }
      } else {
        // For headers-only mode, response can be empty/null
        responseBody = formData.response.trim() || null;
      }

      // Create route key
      const newRouteKey = createRouteKey(formData.method, formData.url, formData.name);

      // Create route config with headers and headers-only flag
      const routeConfig = {
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
        headersOnly: formData.headersOnly // NEW: Include headers-only flag
      };

      // Check if we're editing and the key has changed
      const isEditing = editingRoute != null;
      const keyChanged = isEditing && editingRoute !== newRouteKey;

      if (isEditing && keyChanged) {
        // Remove old route and add new one
        await chromeApi.removeRoute(editingRoute);
        await chromeApi.addRoute(newRouteKey, routeConfig, formData.name);
        updateRoute(newRouteKey, routeConfig);
      } else {
        // Add or update route
        const routeKey = isEditing ? editingRoute : newRouteKey;
        await chromeApi.addRoute(routeKey, routeConfig, formData.name);
        
        if (isEditing) {
          updateRoute(routeKey, routeConfig);
        } else {
          addRoute(routeKey, routeConfig);
        }
      }

      const modeText = formData.headersOnly ? ' (Headers-Only Mode)' : '';
      addNotification(
        'Success', 
        (isEditing ? 'Route updated successfully' : 'Route added successfully') + modeText
      );

      // Reset form and navigate to routes
      handleCancel();
      
    } catch (error) {
      console.error('Error saving route:', error);
      addNotification('Error', 'Failed to save route', 'error');
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

  const handleInputChange = (field: keyof RouteFormData, value: string | number | boolean | HeaderConfig | string[]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const formatJsonResponse = () => {
    if (formData.contentType === 'application/json') {
      const jsonValidation = validateJson(formData.response);
      if (jsonValidation.isValid) {
        const formatted = formatJson(jsonValidation.parsed);
        setFormData(prev => ({ ...prev, response: formatted }));
        addNotification('Success', 'JSON formatted successfully');
      } else {
        addNotification('Error', 'Invalid JSON format', 'error');
      }
    }
  };

  const clearResponse = () => {
    setFormData(prev => ({ ...prev, response: '' }));
  };

  const isEditing = editingRoute != null;

  // Function to select editor language based on type of response selected
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
    <Card className="max-w-4xl mx-auto">
      <Card.Header>
        <div className="flex items-center gap-2">
          <Settings2 className="w-5 h-5 text-primary-500" />
          <span className="text-lg font-semibold">
            {isEditing ? 'Edit Route Interception' : 'Add New Route Interception'}
          </span>
          {formData.headersOnly && (
            <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
              Headers-Only Mode
            </span>
          )}
        </div>
      </Card.Header>

      <Card.Body className="space-y-6">
        {/* Interception Mode Toggle */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Filter className="w-5 h-5 text-blue-600" />
              <div>
                <div className="font-medium text-blue-900">Interception Mode</div>
                <div className="text-sm text-blue-700 mt-1">
                  {formData.headersOnly 
                    ? 'Headers-only: Modify request/response headers while letting the original request proceed'
                    : 'Full interception: Replace the entire response with your mock data'
                  }
                </div>
              </div>
            </div>
            <Toggle
              checked={formData.headersOnly}
              onChange={(checked) => handleInputChange('headersOnly', checked)}
              size="md"
            />
          </div>
          
          {formData.headersOnly && (
            <div className="mt-3 p-3 bg-blue-100 rounded-lg">
              <div className="text-sm text-blue-800">
                <strong>Headers-Only Mode:</strong> The original request will be sent to the server, 
                but you can modify request headers before sending and response headers after receiving. 
                This is useful for testing CORS, authentication, caching behaviors, etc.
              </div>
            </div>
          )}
        </div>

        {/* Route Name */}
        <Input
          label="Route Name (optional)"
          placeholder="e.g. CORS Headers, Auth Headers, etc."
          value={formData.name}
          onChange={(e) => handleInputChange('name', e.target.value)}
          leftIcon={<Tag className="w-4 h-4" />}
          helperText="Give your route a descriptive name to easily identify it"
        />

        {/* URL */}
        <Input
          label="URL to Intercept"
          placeholder="e.g. /api/users or https://example.com/api/data"
          value={formData.url}
          onChange={(e) => handleInputChange('url', e.target.value)}
          leftIcon={<Link className="w-4 h-4" />}
          error={errors.url}
          helperText="Supports wildcards (*) and query parameters. Examples: /api/users, /api/users/*, https://api.example.com/data"
          required
        />

        {/* Method */}
        <Select
          label="HTTP Method"
          value={formData.method}
          onChange={(e) => handleInputChange('method', e.target.value)}
        >
          <option value="GET">GET</option>
          <option value="POST">POST</option>
          <option value="PUT">PUT</option>
          <option value="DELETE">DELETE</option>
          <option value="PATCH">PATCH</option>
        </Select>

        {/* Status and Delay Row - Only show status for full interception */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {!formData.headersOnly && (
            <Select
              label="Status Code"
              value={formData.status}
              onChange={(e) => handleInputChange('status', parseInt(e.target.value) || 200)}
            >
              <option value={200}>200 OK</option>
              <option value={201}>201 Created</option>
              <option value={204}>204 No Content</option>
              <option value={301}>301 Moved Permanently</option>
              <option value={302}>302 Found</option>
              <option value={304}>304 Not Modified</option>
              <option value={400}>400 Bad Request</option>
              <option value={401}>401 Unauthorized</option>
              <option value={403}>403 Forbidden</option>
              <option value={404}>404 Not Found</option>
              <option value={422}>422 Unprocessable Entity</option>
              <option value={429}>429 Too Many Requests</option>
              <option value={500}>500 Internal Server Error</option>
              <option value={502}>502 Bad Gateway</option>
              <option value={503}>503 Service Unavailable</option>
              <option value={504}>504 Gateway Timeout</option>
            </Select>
          )}

          <Input
            label="Response Delay (ms)"
            type="number"
            min={0}
            value={formData.delay}
            onChange={(e) => handleInputChange('delay', parseInt(e.target.value) || 0)}
            leftIcon={<Clock className="w-4 h-4" />}
            error={errors.delay}
            helperText={formData.headersOnly ? "Delay before modifying headers" : "Delay before returning mock response"}
          />
        </div>

        {/* Content Type - Only show for full interception */}
        {!formData.headersOnly && (
          <Select
            label="Content Type"
            value={formData.contentType}
            onChange={(e) => handleInputChange('contentType', e.target.value)}
          >
            <option value="application/json">application/json</option>
            <option value="text/plain">text/plain</option>
            <option value="text/html">text/html</option>
            <option value="application/xml">application/xml</option>
          </Select>
        )}

        {/* Response Headers */}
        <HeaderEditor
          title="Response Headers"
          description={formData.headersOnly 
            ? "Headers to add/modify in the real server response" 
            : "Headers to include in the mock response"
          }
          headers={formData.responseHeaders}
          onHeadersChange={(headers) => handleInputChange('responseHeaders', headers)}
          placeholder={{ key: 'X-Custom-Header', value: 'Custom Value' }}
          commonHeaders={[
            { key: 'Access-Control-Allow-Origin', value: '*', description: 'Allow cross-origin requests from any domain' },
            { key: 'Access-Control-Allow-Methods', value: 'GET, POST, PUT, DELETE, OPTIONS', description: 'Allowed HTTP methods for CORS' },
            { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization', description: 'Allowed headers for CORS' },
            { key: 'Cache-Control', value: 'no-cache', description: 'Disable caching of the response' },
            { key: 'Cache-Control', value: 'max-age=3600', description: 'Cache response for 1 hour' },
            { key: 'X-Powered-By', value: 'Request Interceptor', description: 'Custom powered by header' }
          ]}
        />

        {/* Request Headers */}
        <HeaderEditor
          title="Request Headers"
          description="Headers to add or modify in outgoing requests"
          headers={formData.requestHeaders}
          onHeadersChange={(headers) => handleInputChange('requestHeaders', headers)}
          placeholder={{ key: 'Authorization', value: 'Bearer token123' }}
          commonHeaders={[
            { key: 'Authorization', value: 'Bearer token123', description: 'Add/override authorization header' },
            { key: 'User-Agent', value: 'Request-Interceptor/1.0', description: 'Override user agent' },
            { key: 'X-API-Key', value: 'your-api-key', description: 'Add API key header' },
            { key: 'X-Forwarded-For', value: '127.0.0.1', description: 'Add forwarded IP header' },
            { key: 'Accept', value: 'application/json', description: 'Override accept header' },
            { key: 'Content-Type', value: 'application/json', description: 'Override content type' }
          ]}
        />

        {/* Remove Request Headers */}
        <RemoveHeadersEditor
          title="Remove Request Headers"
          description="Headers to strip from outgoing requests"
          removeHeaders={formData.removeRequestHeaders}
          onRemoveHeadersChange={(headers) => handleInputChange('removeRequestHeaders', headers)}
          commonHeaders={[
            { key: 'Authorization', description: 'Remove authorization to simulate logged-out state' },
            { key: 'User-Agent', description: 'Remove user agent for anonymity testing' },
            { key: 'Referer', description: 'Remove referer header for privacy testing' },
            { key: 'Cookie', description: 'Remove all cookies' },
            { key: 'X-Forwarded-For', description: 'Remove forwarded IP header' }
          ]}
        />

        {/* Response Body - Only show for full interception or as optional for headers-only */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Response Body {formData.headersOnly && <span className="text-gray-500">(Optional)</span>}
          </label>
          
          {formData.headersOnly && (
            <div className="text-sm text-gray-600 mb-2">
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
            <p className="text-sm text-red-600">{errors.response}</p>
          )}
          {errors.responseHeaders && (
            <p className="text-sm text-red-600">{errors.responseHeaders}</p>
          )}

          <div className="flex items-center gap-2">
            {!formData.headersOnly && formData.contentType === 'application/json' && (
              <Button
                variant="secondary"
                size="sm"
                onClick={formatJsonResponse}
                leftIcon={<Code className="w-4 h-4" />}
              >
                Format JSON
              </Button>
            )}
            <Button
              variant="secondary"
              size="sm"
              onClick={clearResponse}
              leftIcon={<FileText className="w-4 h-4" />}
            >
              Clear
            </Button>
          </div>
        </div>
      </Card.Body>

      <Card.Footer>
        <Button
          variant="secondary"
          onClick={handleCancel}
          leftIcon={<X className="w-4 h-4" />}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          isLoading={isSubmitting}
          leftIcon={isEditing ? <Check className="w-4 h-4" /> : undefined}
        >
          {isEditing ? 'Save Changes' : 'Add Interception'}
        </Button>
      </Card.Footer>
    </Card>
  );
};

export default AddRouteForm;