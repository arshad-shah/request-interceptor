import React, { useState, useEffect } from 'react';
import { Tag, Link, Code, Check, Clock, FileText, X } from 'lucide-react';
import { useAppStore } from '@/stores/app-store';
import { chromeApi, parseRouteKey, createRouteKey, validateJson, formatJson } from '@/lib/chrome-api';
import { HttpMethod, RouteFormData } from '@/types';
import Card from './ui/Card';
import Input from './ui/Input';
import Select from './ui/Select';
import Button from './ui/Button';
import ReactAceEditor from '@/components/ReactAceEditor';

const defaultFormData: RouteFormData = {
  name: '',
  url: '',
  method: 'GET',
  status: 200,
  delay: 0,
  contentType: 'application/json',
  response: formatJson({ status: 'success', data: [{ id: 1, name: 'Example' }] })
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
          : String(routeConfig.response)
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

    if (formData.contentType === 'application/json') {
      const jsonValidation = validateJson(formData.response);
      if (!jsonValidation.isValid) {
        newErrors.response = jsonValidation.error;
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
      // Parse response based on content type
      let responseBody: any;
      if (formData.contentType === 'application/json') {
        const jsonValidation = validateJson(formData.response);
        responseBody = jsonValidation.parsed;
      } else {
        responseBody = formData.response;
      }

      // Create route key
      const newRouteKey = createRouteKey(formData.method, formData.url, formData.name);

      // Create route config
      const routeConfig = {
        status: formData.status,
        delay: formData.delay,
        response: responseBody,
        contentType: formData.contentType,
        enabled: true,
        timestamp: Date.now(),
        name: formData.name
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

      addNotification(
        'Success', 
        isEditing ? 'Route updated successfully' : 'Route added successfully'
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

  const handleInputChange = (field: keyof RouteFormData, value: string | number) => {
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

  //function to select editor language based on type of response selected
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
        <span className="text-lg font-semibold">
          {isEditing ? 'Edit Route Interception' : 'Add New Route Interception'}
        </span>
      </Card.Header>

      <Card.Body className="space-y-6">
        {/* Route Name */}
        <Input
          label="Route Name (optional)"
          placeholder="e.g. Success Response, Error 404, etc."
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

        {/* Status and Delay Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* we need list of status codes */}
          <Select
            label="Status Code"
            value={formData.status}
            onChange={(e) => handleInputChange('status', parseInt(e.target.value) || 200)}
          >
            <option value={200}>200 OK</option>
            <option value={400}>400 Bad Request</option>
            <option value={404}>404 Not Found</option>
            <option value={500}>500 Internal Server Error</option>
            <option value={502}>502 Bad Gateway</option>
            <option value={503}>503 Service Unavailable</option>
            <option value={504}>504 Gateway Timeout</option>
            <option value={301}>301 Moved Permanently</option>
            <option value={302}>302 Found</option>
            <option value={303}>303 See Other</option>
            <option value={307}>307 Temporary Redirect</option>
            <option value={308}>308 Permanent Redirect</option>
            <option value={403}>403 Forbidden</option>
            <option value={401}>401 Unauthorized</option>
            <option value={422}>422 Unprocessable Entity</option>
            <option value={429}>429 Too Many Requests</option>
            <option value={511}>511 Network Authentication Required</option>
            <option value={418}>418 I'm a teapot</option>
          </Select>

          <Input
            label="Response Delay (ms)"
            type="number"
            min={0}
            value={formData.delay}
            onChange={(e) => handleInputChange('delay', parseInt(e.target.value) || 0)}
            leftIcon={<Clock className="w-4 h-4" />}
            error={errors.delay}
          />
        </div>

        {/* Content Type */}
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

        {/* Response Body */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Response Body
          </label>
          
          <ReactAceEditor
            value={formData.response}
            onChange={(value) => handleInputChange('response', value)}
            language={getEditorLanguage()}
            height={300}
            placeholder="Enter your response content here"
          />
          
          {errors.response && (
            <p className="text-sm text-red-600">{errors.response}</p>
          )}

          <div className="flex items-center gap-2">
            {formData.contentType === 'application/json' && (
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