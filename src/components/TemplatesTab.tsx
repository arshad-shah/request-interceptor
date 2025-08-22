import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileCode, 
  Upload, 
  Code, 
  Import, 
  X, 
  ChevronRight,
  Sparkles,
  Database,
  Shield,
  ShoppingCart,
  Zap
} from 'lucide-react';
import { useAppStore } from '@/stores/app-store';
import { chromeApi, validateJson, formatJson } from '@/lib/chrome-api';
import { Template, TemplateRoute } from '@/types';
import { cn, formatTemplateName } from '@/lib/utils';
import { MethodBadge, StatusBadge } from './ui/Badge';
import Card from './ui/Card';
import Button from './ui/Button';
import ReactAceEditor from './ReactAceEditor';
import CodeHighlighter from '@/components/Codehighlighter';
import templates from '@/lib/templates';

const templateIcons = {
  "Basic API": Zap,
  "CRUD API": Database,
  "Authentication API": Shield,
  "E-commerce API": ShoppingCart
};

interface TemplateCardProps {
  name: string;
  template: Template;
  isSelected: boolean;
  onSelect: () => void;
}

const TemplateCard: React.FC<TemplateCardProps> = ({ 
  name, 
  template, 
  isSelected, 
  onSelect 
}) => {
  const Icon = templateIcons[name as keyof typeof templateIcons] || FileCode;
  const routeCount = template.routes.length;
  const methods = [...new Set(template.routes.map(r => r.method))];

  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        "relative p-4 border-2 rounded-lg cursor-pointer transition-all duration-200",
        "bg-white hover:shadow-md",
        isSelected 
          ? "border-primary-500 bg-primary-50 shadow-md" 
          : "border-gray-200 hover:border-gray-300"
      )}
      onClick={onSelect}
    >
      <div className="flex items-start gap-3">
        <div className={cn(
          "w-10 h-10 rounded-lg flex items-center justify-center",
          isSelected ? "bg-primary-500 text-white" : "bg-gray-100 text-gray-600"
        )}>
          <Icon className="w-5 h-5" />
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-gray-900 mb-1">{formatTemplateName(name)}</h3>
          <p className="text-sm text-gray-500 mb-2">
            {routeCount} route{routeCount !== 1 ? 's' : ''}
          </p>
          
          <div className="flex items-center gap-1 flex-wrap">
            {methods.map(method => (
              <MethodBadge key={method} method={method as any} className="text-xs" />
            ))}
          </div>
        </div>
        
        <ChevronRight className={cn(
          "w-4 h-4 transition-colors",
          isSelected ? "text-primary-500" : "text-gray-400"
        )} />
      </div>
      
      {isSelected && (
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-500 origin-left"
        />
      )}
    </motion.div>
  );
};

interface RoutePreviewProps {
  routes: TemplateRoute[];
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
            className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200"
          >
            <MethodBadge method={route.method} />
            
            <div className="flex-1 min-w-0">
              <div className="font-mono text-sm font-medium text-gray-900 truncate">
                {route.url}
              </div>
              {route.name && (
                <div className="text-xs text-gray-500 mt-1">{route.name}</div>
              )}
            </div>
            
            <StatusBadge status={route.status} />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

const TemplatesTab: React.FC = () => {
  const { addNotification, setActiveTab, addRoute } = useAppStore();
  
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [schemaInput, setSchemaInput] = useState('');
  const [parsedRoutes, setParsedRoutes] = useState<TemplateRoute[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const handleTemplateSelect = (templateName: string) => {
    setSelectedTemplate(templateName);
    const template = templates[templateName];
    if (template) {
      const formattedSchema = formatJson({ routes: template.routes });
      setSchemaInput(formattedSchema);
      setParsedRoutes(template.routes);
      setShowPreview(true);
    }
  };

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

    const validRoutes = schema.routes.filter((route: any) => {
      return route.method && route.url && route.response !== undefined;
    });

    if (validRoutes.length === 0) {
      addNotification('Error', 'No valid routes found in schema', 'error');
      return;
    }

    setParsedRoutes(validRoutes);
    setShowPreview(true);
    setSelectedTemplate(null);
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
        const routeKey = route.name 
          ? `${route.method}:${route.url}|${route.name}`
          : `${route.method}:${route.url}`;

        const routeConfig = {
          status: route.status || 200,
          delay: route.delay || 0,
          contentType: route.contentType || 'application/json',
          response: route.response,
          enabled: route.enabled !== false,
          timestamp: Date.now(),
          name: route.name
        };

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
      setSelectedTemplate(null);
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
      {/* Template Selection */}
      <Card>
        <Card.Header>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary-500" />
            <span>Quick Start Templates</span>
          </div>
        </Card.Header>
        
        <Card.Body>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(templates).map(([name, template]) => (
              <TemplateCard
                key={name}
                name={name}
                template={template}
                isSelected={selectedTemplate === name}
                onSelect={() => handleTemplateSelect(name)}
              />
            ))}
          </div>
        </Card.Body>
      </Card>

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
            theme="github"
            height={250}
            placeholder="Paste your JSON schema here..."
            showLineNumbers={true}
            tabSize={2}
            fontSize={14}
            wordWrap={true}
            enableBasicAutocompletion={true}
            enableLiveAutocompletion={true}
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
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowPreview(false);
                      setParsedRoutes([]);
                      setSelectedTemplate(null);
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

      {/* Schema Format Example */}
      <Card>
        <Card.Header>
          <span>Schema Format Example</span>
        </Card.Header>
        
        <Card.Body>
          <div className="bg-gray-50 rounded-lg p-4 overflow-auto">
            <CodeHighlighter code={`{
  "routes": [
    {
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
      }
    }
  ]
}`} language="json" />
          </div>
        </Card.Body>
      </Card>
    </div>
  );
};

export default TemplatesTab;