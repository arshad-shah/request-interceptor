import React, { useState } from 'react';
import {
  FileCode,
  Upload,
  Code,
  AlertTriangle,
} from 'lucide-react';
import { useAppStore } from '@/stores/app-store';
import { chromeApi } from '@/lib/chrome-api';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { CodeEditor } from '@/components/common/code-editor';
import CollapsibleSchemaExamples from '@/components/common/CollapsibleSchemaExamples';
import RoutePreviews from './RoutePreviews';
import { parseTemplateSchema, type BuildError, type BuiltRoute } from './template-import';


const TemplatesTab: React.FC = () => {
  const { addNotification, setActiveTab, addRoute } = useAppStore();

  const [schemaInput, setSchemaInput] = useState('');
  const [parsedRoutes, setParsedRoutes] = useState<BuiltRoute[]>([]);
  const [parseErrors, setParseErrors] = useState<BuildError[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const handleParseSchema = () => {
    const parsed = parseTemplateSchema(schemaInput);
    if (!parsed.ok) {
      addNotification({
        title: 'Error',
        message: parsed.message,
        type: 'error',
        timestamp: Date.now()
      });
      return;
    }

    const { valid, errors } = parsed;
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