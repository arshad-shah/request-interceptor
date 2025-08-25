import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
  Plus,
  Trash2,
  Edit3
} from 'lucide-react';
import { useAppStore } from '@/stores/app-store';
import { chromeApi, parseRouteKey, createRouteKey, validateJson, formatJson } from '@/lib/chrome-api';
import { 
  HttpMethod, 
  RouteFormData,
  WebSocketRule, 
  RuleType, 
  MatchType 
} from '@/types';
import Card from './ui/Card';
import Input from './ui/Input';
import Select from './ui/Select';
import Button from './ui/Button';
import Toggle from './ui/Toggle';
import ReactAceEditor from '@/components/ReactAceEditor';
import HeaderEditor from '@/components/HeaderEditor';
import RemoveHeadersEditor from '@/components/RemoveHeaderEditor';
import RouteTypeSelection from '@/components/RouteTypeSelection';

const defaultWebSocketRule: Omit<WebSocketRule, 'id'> = {
  enabled: true,
  type: 'replace',
  matchType: 'contains',
  match: '',
  replacement: '',
  description: ''
};

const defaultFormData: RouteFormData = {
  routeType: 'http',
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
  headersOnly: false,
  incomingRules: [],
  outgoingRules: []
};

// Common response headers
const commonResponseHeaders = [
  { key: 'Access-Control-Allow-Origin', value: '*', description: 'Allow cross-origin requests from any domain' },
  { key: 'Access-Control-Allow-Methods', value: 'GET, POST, PUT, DELETE, OPTIONS', description: 'Allowed HTTP methods for CORS' },
  { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization', description: 'Allowed headers for CORS' },
  { key: 'Cache-Control', value: 'no-cache', description: 'Disable caching of the response' },
  { key: 'Cache-Control', value: 'max-age=3600', description: 'Cache response for 1 hour' },
  { key: 'X-Powered-By', value: 'Request Interceptor', description: 'Custom powered by header' },
  { key: 'X-Response-Time', value: '150ms', description: 'Simulate response time header' },
  { key: 'Set-Cookie', value: 'sessionId=abc123; HttpOnly; Secure', description: 'Set a secure session cookie' },
  { key: 'Location', value: '/api/redirect', description: 'Redirect location for 3xx responses' },
  { key: 'Content-Disposition', value: 'attachment; filename="data.json"', description: 'Force file download' }
];

// Common request headers to add/modify
const commonRequestHeaders = [
  { key: 'Authorization', value: 'Bearer token123', description: 'Add/override authorization header' },
  { key: 'User-Agent', value: 'Request-Interceptor/1.0', description: 'Override user agent' },
  { key: 'X-API-Key', value: 'your-api-key', description: 'Add API key header' },
  { key: 'X-Forwarded-For', value: '127.0.0.1', description: 'Add forwarded IP header' },
  { key: 'Accept', value: 'application/json', description: 'Override accept header' },
  { key: 'Content-Type', value: 'application/json', description: 'Override content type' },
  { key: 'X-Requested-With', value: 'XMLHttpRequest', description: 'Mark as AJAX request' },
  { key: 'Origin', value: 'https://trusted-domain.com', description: 'Override origin header' }
];

// Common headers to remove from requests
const commonRemoveHeaders = [
  { key: 'Authorization', description: 'Remove authorization to simulate logged-out state' },
  { key: 'User-Agent', description: 'Remove user agent for anonymity testing' },
  { key: 'Referer', description: 'Remove referer header for privacy testing' },
  { key: 'Cookie', description: 'Remove all cookies' },
  { key: 'X-Forwarded-For', description: 'Remove forwarded IP header' },
  { key: 'X-Real-IP', description: 'Remove real IP header' },
  { key: 'Accept-Encoding', description: 'Remove compression preferences' },
  { key: 'If-Modified-Since', description: 'Remove conditional request header' }
];

interface WebSocketRuleEditorProps {
  title: string;
  rules: WebSocketRule[];
  onRulesChange: (rules: WebSocketRule[]) => void;
  direction: 'incoming' | 'outgoing';
  icon: React.ReactNode;
}

const WebSocketRuleEditor: React.FC<WebSocketRuleEditorProps> = ({
  title,
  rules,
  onRulesChange,
  direction,
  icon
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const addRule = () => {
    const newRule: WebSocketRule = {
      ...defaultWebSocketRule,
      id: `rule-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };
    onRulesChange([...rules, newRule]);
  };

  const updateRule = (index: number, updates: Partial<WebSocketRule>) => {
    const updatedRules = rules.map((rule, i) => 
      i === index ? { ...rule, ...updates } : rule
    );
    onRulesChange(updatedRules);
  };

  const removeRule = (index: number) => {
    const updatedRules = rules.filter((_, i) => i !== index);
    onRulesChange(updatedRules);
  };

  return (
    <div className="space-y-3">
      <div 
        className="flex items-center justify-between cursor-pointer p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          {icon}
          <div>
            <div className="text-sm font-medium text-gray-700">{title}</div>
            <div className="text-xs text-gray-500">
              {direction === 'incoming' ? 'Process messages from server' : 'Process messages to server'}
            </div>
          </div>
          {rules.length > 0 && (
            <div className="ml-2 px-2 py-1 bg-primary-100 text-primary-700 rounded-full text-xs font-medium">
              {rules.length}
            </div>
          )}
        </div>
        
        <motion.div
          animate={{ rotate: isExpanded ? 90 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <Filter className="w-4 h-4 text-gray-400" />
        </motion.div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="space-y-3 overflow-hidden"
          >
            {rules.length > 0 && (
              <div className="space-y-2">
                <AnimatePresence mode="popLayout">
                  {rules.map((rule, index) => (
                    <WebSocketRuleItem
                      key={rule.id}
                      rule={rule}
                      onUpdate={(updates) => updateRule(index, updates)}
                      onRemove={() => removeRule(index)}
                    />
                  ))}
                </AnimatePresence>
              </div>
            )}

            <div className="bg-white border border-gray-200 rounded-lg p-3">
              <Button
                variant="secondary"
                size="sm"
                onClick={addRule}
                leftIcon={<Plus className="w-4 h-4" />}
              >
                Add {direction} Rule
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

interface WebSocketRuleItemProps {
  rule: WebSocketRule;
  onUpdate: (updates: Partial<WebSocketRule>) => void;
  onRemove: () => void;
}

const WebSocketRuleItem: React.FC<WebSocketRuleItemProps> = ({
  rule,
  onUpdate,
  onRemove
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempRule, setTempRule] = useState(rule);

  const handleSave = () => {
    onUpdate(tempRule);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setTempRule(rule);
    setIsEditing(false);
  };

  const ruleTypeOptions: { value: RuleType; label: string; description: string }[] = [
    { value: 'replace', label: 'Replace', description: 'Replace matching content with new content' },
    { value: 'block', label: 'Block', description: 'Block messages that match the pattern' },
    { value: 'inject', label: 'Inject', description: 'Send additional message when pattern matches' }
  ];

  const matchTypeOptions: { value: MatchType; label: string; description: string }[] = [
    { value: 'exact', label: 'Exact Match', description: 'Match entire message exactly' },
    { value: 'contains', label: 'Contains', description: 'Match if message contains text' },
    { value: 'regex', label: 'Regex', description: 'Match using regular expression' }
  ];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="bg-white border border-gray-200 rounded-lg p-3"
    >
      {isEditing ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Toggle
              checked={tempRule.enabled}
              onChange={(checked) => setTempRule(prev => ({ ...prev, enabled: checked }))}
              size="sm"
            />
            <span className="text-sm font-medium text-gray-700">Rule Enabled</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Select
              label="Rule Type"
              value={tempRule.type}
              onChange={(e) => setTempRule(prev => ({ ...prev, type: e as RuleType }))}
            >
              {ruleTypeOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>

            <Select
              label="Match Type"
              value={tempRule.matchType}
              onChange={(e) => setTempRule(prev => ({ ...prev, matchType: e as MatchType }))}
            >
              {matchTypeOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>

          <Input
            label={tempRule.matchType === 'regex' ? 'Pattern (Regular Expression)' : 'Match Text'}
            value={tempRule.match}
            onChange={(e) => setTempRule(prev => ({ ...prev, match: e.target.value }))}
            placeholder={
              tempRule.matchType === 'exact' ? 'Exact message to match' :
              tempRule.matchType === 'contains' ? 'Text to search for' :
              'Regular expression pattern'
            }
          />

          {tempRule.matchType === 'regex' && (
            <Input
              label="Regex Flags (optional)"
              value={tempRule.flags || ''}
              onChange={(e) => setTempRule(prev => ({ ...prev, flags: e.target.value }))}
              placeholder="g, i, m, s, etc."
              helperText="Common flags: g (global), i (ignore case), m (multiline)"
            />
          )}

          {tempRule.type !== 'block' && (
            <Input
              label={tempRule.type === 'inject' ? 'Message to Inject' : 'Replacement Text'}
              value={tempRule.replacement || ''}
              onChange={(e) => setTempRule(prev => ({ ...prev, replacement: e.target.value }))}
              placeholder={
                tempRule.type === 'inject' ? 'Message to send when pattern matches' : 'Text to replace matches with'
              }
            />
          )}

          <Input
            label="Description (optional)"
            value={tempRule.description || ''}
            onChange={(e) => setTempRule(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Describe what this rule does"
          />

          <div className="flex items-center gap-2">
            <Button
              variant="primary"
              size="sm"
              onClick={handleSave}
              disabled={!tempRule.match.trim() || (tempRule.type !== 'block' && !tempRule.replacement?.trim())}
            >
              Save
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleCancel}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Toggle
                checked={rule.enabled}
                onChange={(checked) => onUpdate({ enabled: checked })}
                size="sm"
              />
              <span className={`text-xs px-2 py-1 rounded font-medium ${
                rule.type === 'replace' ? 'bg-blue-100 text-blue-700' :
                rule.type === 'block' ? 'bg-red-100 text-red-700' :
                'bg-green-100 text-green-700'
              }`}>
                {rule.type.toUpperCase()}
              </span>
              <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded">
                {rule.matchType.toUpperCase()}
              </span>
            </div>
            
            <div className="text-sm">
              <span className="font-medium text-gray-900">Match:</span>
              <span className="ml-2 font-mono text-gray-600 break-all">{rule.match}</span>
            </div>
            
            {rule.replacement && (
              <div className="text-sm mt-1">
                <span className="font-medium text-gray-900">
                  {rule.type === 'inject' ? 'Inject:' : 'Replace:'}
                </span>
                <span className="ml-2 font-mono text-gray-600 break-all">{rule.replacement}</span>
              </div>
            )}
            
            {rule.description && (
              <div className="text-xs text-gray-500 mt-1">{rule.description}</div>
            )}
          </div>
          
          <div className="flex items-center gap-1 ml-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditing(true)}
              leftIcon={<Edit3 className="w-3 h-3" />}
            >
              Edit
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onRemove}
              leftIcon={<Trash2 className="w-3 h-3" />}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              Remove
            </Button>
          </div>
        </div>
      )}
    </motion.div>
  );
};

// Helper function for parsing WebSocket keys
function parseWebSocketKey(routeKey: string) {
  const remaining = routeKey.substring(3); // Remove 'WS:'
  const pipeIndex = remaining.indexOf('|');
  
  if (pipeIndex === -1) {
    return { url: remaining, name: '' };
  }
  
  const url = remaining.substring(0, pipeIndex);
  const name = remaining.substring(pipeIndex + 1);
  
  return { url, name };
}

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

  const formatJsonResponse = () => {
    if (formData.contentType === 'application/json') {
      const jsonValidation = validateJson(formData.response);
      if (jsonValidation.isValid) {
        const formatted = formatJson(jsonValidation.parsed);
        setFormData(prev => ({ ...prev, response: formatted }));
        addNotification({
          title: 'Success',
          message: 'JSON formatted successfully',
          type: 'success',
          timestamp: Date.now()
        });
      } else {
        addNotification({
          title: 'Error',
          message: 'Invalid JSON format',
          type: 'error',
          timestamp: Date.now()
        });
      }
    }
  };

  const clearResponse = () => {
    setFormData(prev => ({ ...prev, response: '' }));
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
    <Card className="max-w-4xl mx-auto">
      <Card.Header>
        <div className="flex items-center gap-2">
          <Settings2 className="w-5 h-5 text-primary-500" />
          <span className="text-lg font-semibold">
            {isEditing ? 'Edit Route Interception' : 'Add New Route Interception'}
          </span>
          {isWebSocket ? (
            <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
              WebSocket
            </span>
          ) : formData.headersOnly ? (
            <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
              Headers-Only
            </span>
          ) : (
            <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
              Full Response
            </span>
          )}
        </div>
      </Card.Header>

      <Card.Body className="space-y-6">

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
          leftIcon={<Tag className="w-4 h-4" />}
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
          leftIcon={<Link className="w-4 h-4" />}
          error={errors.url}
          helperText={isWebSocket 
            ? "Supports wildcards (*). Examples: wss://api.example.com/*, ws://localhost:*/chat"
            : "Supports wildcards (*) and query parameters. Examples: /api/users, /api/users/*, https://api.example.com/data"
          }
          required
        />

        {/* HTTP-specific fields */}
        {!isWebSocket && (
          <>
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

            {/* Method */}
            <Select
              label="HTTP Method"
              value={formData.method}
              onChange={(e) => handleInputChange('method', e as any)}
            >
              <option value="GET">GET</option>
              <option value="POST">POST</option>
              <option value="PUT">PUT</option>
              <option value="DELETE">DELETE</option>
              <option value="PATCH">PATCH</option>
            </Select>

            {/* Status and Delay Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {!formData.headersOnly && (
                <Select
                  label="Status Code"
                  value={formData.status}
                  onChange={(e) => handleInputChange('status', parseInt(e) || 200)}
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
                onChange={(e) => handleInputChange('contentType', e as any)}
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
              commonHeaders={commonResponseHeaders}
            />

            {/* Request Headers */}
            <HeaderEditor
              title="Request Headers"
              description="Headers to add or modify in outgoing requests"
              headers={formData.requestHeaders}
              onHeadersChange={(headers) => handleInputChange('requestHeaders', headers)}
              placeholder={{ key: 'Authorization', value: 'Bearer token123' }}
              commonHeaders={commonRequestHeaders}
            />

            {/* Remove Request Headers */}
            <RemoveHeadersEditor
              title="Remove Request Headers"
              description="Headers to strip from outgoing requests"
              removeHeaders={formData.removeRequestHeaders}
              onRemoveHeadersChange={(headers) => handleInputChange('removeRequestHeaders', headers)}
              commonHeaders={commonRemoveHeaders}
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
              leftIcon={<Clock className="w-4 h-4" />}
              error={errors.delay}
              helperText="Delay before processing WebSocket messages"
            />

            {/* WebSocket Rules */}
            <WebSocketRuleEditor
              title="Incoming Message Rules"
              rules={formData.incomingRules}
              onRulesChange={(rules) => handleInputChange('incomingRules', rules)}
              direction="incoming"
              icon={<ArrowDownLeft className="w-4 h-4 text-green-600" />}
            />

            <WebSocketRuleEditor
              title="Outgoing Message Rules"
              rules={formData.outgoingRules}
              onRulesChange={(rules) => handleInputChange('outgoingRules', rules)}
              direction="outgoing"
              icon={<ArrowUpRight className="w-4 h-4 text-blue-600" />}
            />

            {errors.incomingRules && (
              <p className="text-sm text-red-600">{errors.incomingRules}</p>
            )}
          </>
        )}
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