import React, { useState } from 'react';
import {
  FileCode,
  Upload,
  Code,
  AlertTriangle,
} from 'lucide-react';
import { useAppStore } from '@/stores/app-store';
import { chromeApi, validateJson } from '@/lib/chrome-api';
import { RouteConfig, WebSocketConfig, InjectionConfig } from '@/types';
import {
  validateHttpConfig,
  validateWebSocketConfig,
  validateInjectionConfig,
} from '@/core/route-validation';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { CodeEditor } from '@/components/common/code-editor';
import CollapsibleSchemaExamples from '@/components/common/CollapsibleSchemaExamples';
import RoutePreviews from './RoutePreviews';

interface BuiltRoute {
  raw: any;
  key: string;
  config: RouteConfig | WebSocketConfig | InjectionConfig;
  routeType: 'http' | 'websocket' | 'injection';
  label: string;
}

interface BuildError {
  label: string;
  error: string;
  raw: any;
}

const inferRouteType = (route: any): 'http' | 'websocket' | 'injection' => {
  if (route.routeType) return route.routeType;
  if (route.scripts || route.stylesheets || route.urlPattern || route.injectAt) return 'injection';
  if (route.incomingRules || route.outgoingRules) return 'websocket';
  return 'http';
};

const labelFor = (route: any, fallback: string): string =>
  route.name || fallback || 'Unnamed route';

const buildRoute = (route: any): { ok: true; built: BuiltRoute } | { ok: false; error: BuildError } => {
  const routeType = inferRouteType(route);
  route.routeType = routeType;

  if (routeType === 'injection') {
    const urlPattern = route.urlPattern || route.url;
    const label = labelFor(route, urlPattern);
    if (!urlPattern || !String(urlPattern).trim()) {
      return { ok: false, error: { label, error: 'Injection route must have a URL pattern', raw: route } };
    }
    const config: InjectionConfig = {
      enabled: route.enabled !== false,
      timestamp: Date.now(),
      name: route.name,
      urlPattern,
      scripts: Array.isArray(route.scripts) ? route.scripts : [],
      stylesheets: Array.isArray(route.stylesheets) ? route.stylesheets : [],
      injectAt: route.injectAt === 'document_start' ? 'document_start' : 'document_end',
    };
    const result = validateInjectionConfig(config);
    if (!result.valid) {
      return { ok: false, error: { label, error: result.error || 'Invalid injection route', raw: route } };
    }
    const key = route.name ? `INJ:${urlPattern}|${route.name}` : `INJ:${urlPattern}`;
    return { ok: true, built: { raw: route, key, config, routeType, label } };
  }

  if (routeType === 'websocket') {
    const label = labelFor(route, route.url);
    if (!route.url || !String(route.url).trim()) {
      return { ok: false, error: { label, error: 'WebSocket route must have a URL', raw: route } };
    }
    const processRules = (rules: any[] = []) =>
      rules.map((rule, index) => ({
        id: rule.id || `rule-${Date.now()}-${index}`,
        enabled: rule.enabled !== false,
        type: rule.type || 'replace',
        matchType: rule.matchType || 'contains',
        match: rule.match || '',
        replacement: rule.replacement || '',
        flags: rule.flags || '',
        description: rule.description || '',
      }));
    const config: WebSocketConfig = {
      enabled: route.enabled !== false,
      timestamp: Date.now(),
      name: route.name,
      incomingRules: processRules(route.incomingRules),
      outgoingRules: processRules(route.outgoingRules),
      delay: route.delay || 0,
    };
    const result = validateWebSocketConfig(config);
    if (!result.valid) {
      return { ok: false, error: { label, error: result.error || 'Invalid WebSocket route', raw: route } };
    }
    const key = route.name ? `WS:${route.url}|${route.name}` : `WS:${route.url}`;
    return { ok: true, built: { raw: route, key, config, routeType, label } };
  }

  // HTTP
  const label = labelFor(route, `${route.method || '?'} ${route.url || ''}`.trim());
  if (!route.method || !String(route.method).trim()) {
    return { ok: false, error: { label, error: 'HTTP route must have a method', raw: route } };
  }
  if (!route.url || !String(route.url).trim()) {
    return { ok: false, error: { label, error: 'HTTP route must have a URL', raw: route } };
  }
  if (route.status !== undefined && (route.status < 100 || route.status > 599)) {
    return { ok: false, error: { label, error: 'Status code must be between 100 and 599', raw: route } };
  }

  const headersOnly = route.headersOnly === true || route.interceptionMode === 'passthrough';
  const interceptionMode = route.interceptionMode || (headersOnly ? 'passthrough' : 'mock');

  const config: RouteConfig = {
    status: route.status ?? 200,
    delay: route.delay || 0,
    contentType: route.contentType || 'application/json',
    response: route.response,
    enabled: route.enabled !== false,
    timestamp: Date.now(),
    name: route.name,
    responseHeaders: route.responseHeaders || {},
    requestHeaders: route.requestHeaders || {},
    removeRequestHeaders: route.removeRequestHeaders || [],
    headersOnly,
    interceptionMode,
    redirectUrl: route.redirectUrl || '',
    requestBody: route.requestBody || '',
    queryParamRules: Array.isArray(route.queryParamRules) ? route.queryParamRules : [],
    graphqlOperationName: route.graphqlOperationName || '',
  };
  const result = validateHttpConfig(config);
  if (!result.valid) {
    return { ok: false, error: { label, error: result.error || 'Invalid HTTP route', raw: route } };
  }
  const key = route.name ? `${route.method}:${route.url}|${route.name}` : `${route.method}:${route.url}`;
  return { ok: true, built: { raw: route, key, config, routeType, label } };
};


const TemplatesTab: React.FC = () => {
  const { addNotification, setActiveTab, addRoute } = useAppStore();

  const [schemaInput, setSchemaInput] = useState('');
  const [parsedRoutes, setParsedRoutes] = useState<BuiltRoute[]>([]);
  const [parseErrors, setParseErrors] = useState<BuildError[]>([]);
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

    const valid: BuiltRoute[] = [];
    const errors: BuildError[] = [];
    schema.routes.forEach((route: any) => {
      const result = buildRoute(route);
      if (result.ok) {
        valid.push(result.built);
      } else {
        errors.push(result.error);
      }
    });

    setParsedRoutes(valid);
    setParseErrors(errors);
    setShowPreview(valid.length > 0 || errors.length > 0);

    if (errors.length > 0) {
      const summary = errors
        .slice(0, 3)
        .map((e) => `${e.label}: ${e.error}`)
        .join(' · ');
      const more = errors.length > 3 ? ` (+${errors.length - 3} more)` : '';
      addNotification({
        title: `${errors.length} route${errors.length === 1 ? '' : 's'} rejected`,
        message: `${summary}${more}`,
        type: 'error',
        timestamp: Date.now(),
      });
    }

    if (valid.length > 0) {
      addNotification({
        title: 'Parsed',
        message: `${valid.length} valid route${valid.length === 1 ? '' : 's'} ready to import${
          errors.length > 0 ? `, ${errors.length} skipped` : ''
        }`,
        type: errors.length > 0 ? 'warning' : 'success',
        timestamp: Date.now(),
      });
    } else if (errors.length === 0) {
      addNotification({
        title: 'Error',
        message: 'No routes found in schema',
        type: 'error',
        timestamp: Date.now(),
      });
    }
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
      const failures: { label: string; error: string }[] = [];

      for (const built of parsedRoutes) {
        try {
          await chromeApi.addRoute(built.key, built.config, built.raw.name);
          addRoute(built.key, built.config);
          importedCount++;
        } catch (error) {
          const msg = error instanceof Error ? error.message : String(error);
          console.error('Failed to import route:', built, error);
          failures.push({ label: built.label, error: msg });
        }

        // Small delay to prevent overwhelming the background script
        await new Promise((resolve) => setTimeout(resolve, 50));
      }

      if (importedCount > 0) {
        addNotification({
          title: 'Success',
          message: `Successfully imported ${importedCount} route${importedCount === 1 ? '' : 's'}`,
          type: 'success',
          timestamp: Date.now()
        });
      }

      if (failures.length > 0) {
        const summary = failures
          .slice(0, 3)
          .map((f) => `${f.label}: ${f.error}`)
          .join(' · ');
        const more = failures.length > 3 ? ` (+${failures.length - 3} more)` : '';
        addNotification({
          title: `${failures.length} route${failures.length === 1 ? '' : 's'} skipped`,
          message: `${summary}${more}`,
          type: 'error',
          timestamp: Date.now()
        });
      }

      if (importedCount > 0 && failures.length === 0) {
        setSchemaInput('');
        setParsedRoutes([]);
        setParseErrors([]);
        setShowPreview(false);
        setActiveTab('routes');
      }
      
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
    <div className="space-y-3">
      <Card>
        <Card.Header>
          <div className="flex items-center gap-2 text-(--text-primary)">
            <FileCode size={14} className="text-(--text-tertiary)" />
            <span className="ds-panel-title">Import routes from JSON</span>
          </div>
        </Card.Header>

        <Card.Body className="space-y-3">
          <CodeEditor
            value={schemaInput}
            onChange={setSchemaInput}
            language="json"
            height={220}
            placeholder='Paste a routes schema, e.g. { "routes": [ ... ] }'
          />

          <div className="flex items-center justify-end gap-2">
            <Button
              variant="default"
              size="sm"
              onClick={handleFileImport}
              leftIcon={<Upload size={14} />}
            >
              From file
            </Button>

            <Button
              variant="primary"
              size="sm"
              onClick={handleParseSchema}
              leftIcon={<Code size={14} />}
            >
              Parse
            </Button>
          </div>
        </Card.Body>
      </Card>

      {showPreview && parseErrors.length > 0 && (
        <div className="ds-panel">
          <div
            className="ds-panel-header"
            style={{
              background: 'rgba(244,63,94,0.08)',
              borderBottomColor: 'rgba(244,63,94,0.25)',
            }}
          >
            <div className="flex items-center gap-2 text-(--accent-rose)">
              <AlertTriangle size={14} />
              <span className="ds-panel-title text-(--accent-rose)">
                {parseErrors.length} rejected
              </span>
            </div>
          </div>
          <div className="ds-panel-body space-y-1.5">
            {parseErrors.map((e, i) => (
              <div
                key={i}
                className="flex items-baseline gap-2 py-1.5 border-b border-(--border-subtle) last:border-b-0"
              >
                <span className="font-mono text-[12px] text-(--text-primary) truncate min-w-0 max-w-[40%]">
                  {e.label}
                </span>
                <span className="text-[11px] text-(--accent-rose) flex-1 min-w-0">
                  {e.error}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {showPreview && parsedRoutes.length > 0 && (
        <RoutePreviews
          parsedRoutes={parsedRoutes.map((b) => ({ ...b.raw, _builtKey: b.key }))}
          setShowPreview={setShowPreview}
          setParsedRoutes={() => setParsedRoutes([])}
          handleImportRoutes={handleImportRoutes}
          isImporting={isImporting}
        />
      )}

      <CollapsibleSchemaExamples />
    </div>
  );
};

export default TemplatesTab;