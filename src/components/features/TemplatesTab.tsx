import React, { useState } from 'react';
import {
  FileCode,
  Upload,
  Code
} from 'lucide-react';
import { useAppStore } from '@/stores/app-store';
import { chromeApi, validateJson } from '@/lib/chrome-api';
import { RouteConfig, WebSocketConfig } from '@/types';
import Card from '../ui/Card';
import Button from '../ui/Button';
import ReactAceEditor from '@/components/common/ReactAceEditor';
import CollapsibleSchemaExamples from '@/components/common/CollapsibleSchemaExamples';
import RoutePreviews from './RoutePreviews';


const TemplatesTab: React.FC = () => {
  const { addNotification, setActiveTab, addRoute } = useAppStore();

  const [schemaInput, setSchemaInput] = useState('');
  const [parsedRoutes, setParsedRoutes] = useState<any[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const handleParseSchema = () => {
    if (!schemaInput.trim()) {
      addNotification({
        title: 'Error',
        message: 'Please enter a JSON schema',
        type: 'error',
        timestamp: Date.now()
      });
      return;
    }

    const validation = validateJson(schemaInput);
    if (!validation.isValid) {
      addNotification({
        title: 'Error',
        message: `Invalid JSON: ${validation.error}`,
        type: 'error',
        timestamp: Date.now()
      });
      return;
    }

    const schema = validation.parsed;
    if (!schema.routes || !Array.isArray(schema.routes)) {
      addNotification({
        title: 'Error',
        message: 'Schema must contain a "routes" array',
        type: 'error',
        timestamp: Date.now()
      });
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
      addNotification({
        title: 'Error',
        message: 'No valid routes found in schema',
        type: 'error',
        timestamp: Date.now()
      });
      return;
    }

    setParsedRoutes(validRoutes);
    setShowPreview(true);
    addNotification({
      title: 'Success',
      message: `Parsed ${validRoutes.length} routes successfully`,
      type: 'success',
      timestamp: Date.now()
    });
  };

  const handleImportRoutes = async () => {
    if (parsedRoutes.length === 0) {
      addNotification({
        title: 'Error',
        message: 'No routes to import',
        type: 'error',
        timestamp: Date.now()
      });
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

      addNotification({
        title: 'Success',
        message: `Successfully imported ${importedCount} routes`,
        type: 'success',
        timestamp: Date.now()
      });

      // Reset and navigate to routes tab
      setSchemaInput('');
      setParsedRoutes([]);
      setShowPreview(false);
      setActiveTab('routes');
      
    } catch (error) {
      console.error('Error importing routes:', error);
      addNotification({
        title: 'Error',
        message: 'Failed to import routes',
        type: 'error',
        timestamp: Date.now()
      });
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
        addNotification({
          title: 'Success',
          message: 'File loaded successfully',
          type: 'success',
          timestamp: Date.now()
        });
      };
      
      reader.onerror = () => {
        addNotification({
          title: 'Error',
          message: 'Failed to read file',
          type: 'error',
          timestamp: Date.now()
        });
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
          
          <div className="flex w-full items-end gap-3">
            <Button
              variant="secondary"
              onClick={handleFileImport}
              leftIcon={<Upload className="w-4 h-4" />}
            >
              Import from File
            </Button>
            
            <Button
              variant="primary"
              onClick={handleParseSchema}
              leftIcon={<Code className="w-4 h-4" />}
            >
              Parse Schema
            </Button>
          </div>
        </Card.Body>
      </Card>

      {/* Preview */}
      {showPreview && parsedRoutes.length > 0 && (
        <RoutePreviews
          parsedRoutes={parsedRoutes}
          setShowPreview={setShowPreview}
          setParsedRoutes={setParsedRoutes}
          handleImportRoutes={handleImportRoutes}
          isImporting={isImporting}
        />
      )}

        <CollapsibleSchemaExamples />
    </div>
  );
};

export default TemplatesTab;