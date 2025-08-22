import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileCode, 
  Upload, 
  Code, 
  Import, 
  X,
  Zap,
  MessageSquare,
  Filter
} from 'lucide-react';
import { useAppStore } from '@/stores/app-store';
import { chromeApi, validateJson } from '@/lib/chrome-api';
import { RouteConfig, WebSocketConfig } from '@/types';
import { cn } from '@/lib/utils';
import { MethodBadge, StatusBadge } from './ui/Badge';
import Card from './ui/Card';
import Button from './ui/Button';
import ReactAceEditor from './ReactAceEditor';
import CodeHighlighter from '@/components/Codehighlighter';

interface RoutePreviewProps {
  routes: any[];
}

const RoutePreview: React.FC<RoutePreviewProps> = ({ routes }) => {
  return (
    <div className="space-y-2 max-h-80 overflow-auto scrollable-content">
      <AnimatePresence>
        {routes.map((route, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className={cn(
              "flex items-center gap-3 p-3 rounded-lg border",
              route.routeType === 'websocket' 
                ? "bg-purple-50 border-purple-200" 
                : "bg-gray-50 border-gray-200"
            )}
          >
            {route.routeType === 'websocket' ? (
              <div className="flex items-center gap-1">
                <MessageSquare className="w-4 h-4 text-purple-600" />
                <span className="text-xs font-medium text-purple-600 bg-purple-100 px-2 py-1 rounded">
                  WS
                </span>
              </div>
            ) : (
              <MethodBadge method={route.method} />
            )}
            
            <div className="flex-1 min-w-0">
              <div className="font-mono text-sm font-medium text-gray-900 truncate">
                {route.url}
              </div>
              {route.name && (
                <div className="text-xs text-gray-500 mt-1">{route.name}</div>
              )}
              {route.routeType === 'websocket' && (
                <div className="text-xs text-purple-600 mt-1">
                  {(route.incomingRules?.length || 0) + (route.outgoingRules?.length || 0)} rules
                </div>
              )}
            </div>
            
            {route.routeType !== 'websocket' && route.status && (
              <StatusBadge status={route.status} />
            )}
            
            {route.headersOnly && (
              <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">
                Headers-Only
              </span>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

const TemplatesTab: React.FC = () => {
  const { addNotification, setActiveTab, addRoute } = useAppStore();

  const [schemaInput, setSchemaInput] = useState('');
  const [parsedRoutes, setParsedRoutes] = useState<any[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const handleParseSchema = () => {
    if (!schemaInput.trim()) {
      addNotification('Error', 'Please enter a JSON schema', 'error');
      return;
    }

    const validation = validateJson(schemaInput);
    if (!validation.isValid) {
      addNotification('Error', `Invalid JSON: ${validation.error}`, 'error');
      return;
    }

    const schema = validation.parsed;
    if (!schema.routes || !Array.isArray(schema.routes)) {
      addNotification('Error', 'Schema must contain a "routes" array', 'error');
      return;
    }

    // Enhanced validation for both HTTP and WebSocket routes
    const validRoutes = schema.routes.filter((route: any) => {
      // Set default routeType if not specified
      if (!route.routeType) {
        // If it has WebSocket-specific fields, treat as WebSocket
        if (route.incomingRules || route.outgoingRules) {
          route.routeType = 'websocket';
        } else {
          route.routeType = 'http';
        }
      }

      if (route.routeType === 'websocket') {
        // WebSocket route validation
        const hasValidRules = (
          (route.incomingRules && Array.isArray(route.incomingRules) && route.incomingRules.length > 0) ||
          (route.outgoingRules && Array.isArray(route.outgoingRules) && route.outgoingRules.length > 0)
        );
        
        return route.url && hasValidRules;
      } else {
        // HTTP route validation
        const hasValidResponse = route.response !== undefined;
        const hasHeaders = (
          (route.responseHeaders && Object.keys(route.responseHeaders).length > 0) ||
          (route.requestHeaders && Object.keys(route.requestHeaders).length > 0) ||
          (route.removeRequestHeaders && Array.isArray(route.removeRequestHeaders) && route.removeRequestHeaders.length > 0)
        );
        const isHeadersOnly = route.headersOnly === true;
        
        return route.method && route.url && (hasValidResponse || isHeadersOnly || hasHeaders);
      }
    });

    if (validRoutes.length === 0) {
      addNotification('Error', 'No valid routes found in schema', 'error');
      return;
    }

    setParsedRoutes(validRoutes);
    setShowPreview(true);
    addNotification('Success', `Parsed ${validRoutes.length} routes successfully`);
  };

  const handleImportRoutes = async () => {
    if (parsedRoutes.length === 0) {
      addNotification('Error', 'No routes to import', 'error');
      return;
    }

    setIsImporting(true);

    try {
      let importedCount = 0;

      for (const route of parsedRoutes) {
        let routeKey: string;
        let routeConfig: RouteConfig | WebSocketConfig;

        if (route.routeType === 'websocket') {
          // WebSocket route
          routeKey = route.name 
            ? `WS:${route.url}|${route.name}`
            : `WS:${route.url}`;

          // Ensure rules have proper structure with IDs
          const processRules = (rules: any[] = []) => {
            return rules.map((rule, index) => ({
              id: rule.id || `rule-${Date.now()}-${index}`,
              enabled: rule.enabled !== false,
              type: rule.type || 'replace',
              matchType: rule.matchType || 'contains',
              match: rule.match || '',
              replacement: rule.replacement || '',
              flags: rule.flags || '',
              description: rule.description || ''
            }));
          };

          routeConfig = {
            enabled: route.enabled !== false,
            timestamp: Date.now(),
            name: route.name,
            incomingRules: processRules(route.incomingRules),
            outgoingRules: processRules(route.outgoingRules),
            delay: route.delay || 0
          } as WebSocketConfig;
        } else {
          // HTTP route
          routeKey = route.name 
            ? `${route.method}:${route.url}|${route.name}`
            : `${route.method}:${route.url}`;

          routeConfig = {
            status: route.status || 200,
            delay: route.delay || 0,
            contentType: route.contentType || 'application/json',
            response: route.response,
            enabled: route.enabled !== false,
            timestamp: Date.now(),
            name: route.name,
            responseHeaders: route.responseHeaders || {},
            requestHeaders: route.requestHeaders || {},
            removeRequestHeaders: route.removeRequestHeaders || [],
            headersOnly: route.headersOnly || false
          } as RouteConfig;
        }

        try {
          await chromeApi.addRoute(routeKey, routeConfig, route.name);
          addRoute(routeKey, routeConfig);
          importedCount++;
        } catch (error) {
          console.error('Failed to import route:', route, error);
        }

        // Small delay to prevent overwhelming the background script
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      addNotification('Success', `Successfully imported ${importedCount} routes`);
      
      // Reset and navigate to routes tab
      setSchemaInput('');
      setParsedRoutes([]);
      setShowPreview(false);
      setActiveTab('routes');
      
    } catch (error) {
      addNotification('Error', 'Failed to import routes', 'error');
    } finally {
      setIsImporting(false);
    }
  };

  const handleFileImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        setSchemaInput(content);
        addNotification('Success', 'File loaded successfully');
      };
      
      reader.onerror = () => {
        addNotification('Error', 'Failed to read file', 'error');
      };
      
      reader.readAsText(file);
    };
    
    input.click();
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">

      {/* Schema Import */}
      <Card>
        <Card.Header>
          <div className="flex items-center gap-2">
            <FileCode className="w-5 h-5 text-primary-500" />
            <span>JSON Schema Import</span>
          </div>
        </Card.Header>
        
        <Card.Body className="space-y-4">
          <ReactAceEditor
            value={schemaInput}
            onChange={setSchemaInput}
            language="json"
            height={250}
            placeholder="Paste your JSON schema here..."
          />
          
          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              onClick={handleFileImport}
              leftIcon={<Upload className="w-4 h-4" />}
            >
              Import from File
            </Button>
            
            <Button
              variant="secondary"
              onClick={handleParseSchema}
              leftIcon={<Code className="w-4 h-4" />}
            >
              Parse Schema
            </Button>
          </div>
        </Card.Body>
      </Card>

      {/* Preview */}
      <AnimatePresence>
        {showPreview && parsedRoutes.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <Card>
              <Card.Header>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-primary-500 rounded-full animate-pulse-dot" />
                    <span>{parsedRoutes.length} routes ready to import</span>
                    
                    {/* Route type breakdown */}
                    <div className="flex items-center gap-2 ml-4">
                      {parsedRoutes.some(r => r.routeType !== 'websocket') && (
                        <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded">
                          {parsedRoutes.filter(r => r.routeType !== 'websocket').length} HTTP
                        </span>
                      )}
                      {parsedRoutes.some(r => r.routeType === 'websocket') && (
                        <span className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded">
                          {parsedRoutes.filter(r => r.routeType === 'websocket').length} WebSocket
                        </span>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="icon"
                    size="sm"
                    onClick={() => {
                      setShowPreview(false);
                      setParsedRoutes([]);
                    }}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </Card.Header>
              
              <Card.Body>
                <RoutePreview routes={parsedRoutes} />
              </Card.Body>
              
              <Card.Footer>
                <Button
                  onClick={handleImportRoutes}
                  isLoading={isImporting}
                  leftIcon={<Import className="w-4 h-4" />}
                >
                  Import Routes
                </Button>
              </Card.Footer>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Schema Format Examples */}
      <Card>
        <Card.Header>
          <span>Schema Format Examples</span>
        </Card.Header>
        
        <Card.Body className="space-y-6">
          {/* Complete Export Example */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <FileCode className="w-4 h-4 text-blue-600" />
              Complete Export/Import Schema
            </h4>
            <div className="bg-gray-50 rounded-lg p-4 overflow-auto">
              <CodeHighlighter code={`{
  "routes": [
    {
      "routeType": "http",
      "method": "GET",
      "url": "/api/users",
      "name": "Get Users",
      "status": 200,
      "delay": 300,
      "contentType": "application/json",
      "enabled": true,
      "headersOnly": false,
      "response": {
        "users": [
          {"id": 1, "name": "John Doe"},
          {"id": 2, "name": "Jane Smith"}
        ]
      },
      "responseHeaders": {
        "Access-Control-Allow-Origin": "*",
        "X-API-Version": "1.0"
      },
      "requestHeaders": {
        "Authorization": "Bearer test-token"
      },
      "removeRequestHeaders": ["Cookie"]
    },
    {
      "routeType": "websocket",
      "url": "wss://api.example.com/chat",
      "name": "Chat Filter",
      "delay": 100,
      "enabled": true,
      "incomingRules": [
        {
          "id": "replace-username",
          "enabled": true,
          "type": "replace",
          "matchType": "regex",
          "match": "\\"username\\":\\"([^\"]+)\\"",
          "replacement": "\\"username\\":\\"TestUser\\"",
          "flags": "g",
          "description": "Replace usernames with TestUser"
        }
      ],
      "outgoingRules": [
        {
          "id": "block-spam",
          "enabled": true,
          "type": "block",
          "matchType": "contains",
          "match": "SPAM",
          "description": "Block spam messages"
        }
      ]
    }
  ]
}`} language="json" />
            </div>
          </div>

          {/* HTTP Route Example */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <Zap className="w-4 h-4 text-green-600" />
              HTTP Route Example
            </h4>
            <div className="bg-gray-50 rounded-lg p-4 overflow-auto">
              <CodeHighlighter code={`{
  "routes": [
    {
      "routeType": "http",
      "method": "GET",
      "url": "/api/users",
      "status": 200,
      "delay": 300,
      "name": "Get Users",
      "contentType": "application/json",
      "enabled": true,
      "response": {
        "users": [
          {"id": 1, "name": "John Doe"},
          {"id": 2, "name": "Jane Smith"}
        ]
      },
      "responseHeaders": {
        "Access-Control-Allow-Origin": "*",
        "X-API-Version": "1.0"
      },
      "requestHeaders": {
        "Authorization": "Bearer test-token"
      },
      "removeRequestHeaders": ["Cookie"]
    }
  ]
}`} language="json" />
            </div>
          </div>

          {/* Headers-Only Example */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <Filter className="w-4 h-4 text-blue-600" />
              Headers-Only Route Example
            </h4>
            <div className="bg-gray-50 rounded-lg p-4 overflow-auto">
              <CodeHighlighter code={`{
  "routes": [
    {
      "routeType": "http",
      "method": "GET",
      "url": "/api/*",
      "name": "CORS Headers",
      "headersOnly": true,
      "enabled": true,
      "responseHeaders": {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE"
      },
      "requestHeaders": {
        "X-Test-Mode": "true"
      },
      "removeRequestHeaders": ["Authorization"]
    }
  ]
}`} language="json" />
            </div>
          </div>

          {/* WebSocket Example */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-purple-600" />
              WebSocket Route Example
            </h4>
            <div className="bg-gray-50 rounded-lg p-4 overflow-auto">
              <CodeHighlighter code={`{
  "routes": [
    {
      "routeType": "websocket",
      "url": "wss://api.example.com/chat",
      "name": "Chat Filter",
      "delay": 100,
      "enabled": true,
      "incomingRules": [
        {
          "id": "replace-username",
          "enabled": true,
          "type": "replace",
          "matchType": "regex",
          "match": "\\"username\\":\\"([^\"]+)\\"",
          "replacement": "\\"username\\":\\"TestUser\\"",
          "flags": "g",
          "description": "Replace usernames with TestUser"
        }
      ],
      "outgoingRules": [
        {
          "id": "block-spam",
          "enabled": true,
          "type": "block",
          "matchType": "contains",
          "match": "SPAM",
          "description": "Block spam messages"
        }
      ]
    }
  ]
}`} language="json" />
            </div>
          </div>

          {/* Import Notes */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-blue-800 mb-2">Import Notes</h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• <code>routeType</code> field is optional - will be auto-detected based on route structure</li>
              <li>• WebSocket routes require at least one rule in <code>incomingRules</code> or <code>outgoingRules</code></li>
              <li>• HTTP routes need either a <code>response</code>, <code>headersOnly: true</code>, or header modifications</li>
              <li>• Rule IDs will be auto-generated if not provided</li>
              <li>• All routes default to <code>enabled: true</code> if not specified</li>
            </ul>
          </div>
        </Card.Body>
      </Card>
    </div>
  );
};

export default TemplatesTab;