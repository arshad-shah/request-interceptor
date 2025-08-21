import React, { useState, useCallback } from 'react';
import AceEditor from 'react-ace';
import { 
  Code, 
  Check, 
  AlertCircle, 
  Copy, 
  Download, 
  Maximize2, 
  Minimize2,
  RotateCcw,
  Settings,
  Palette
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { validateJson, formatJson } from '@/lib/chrome-api';
import Button from './ui/Button';

// Import ACE modes and themes
import 'ace-builds/src-noconflict/mode-json';
import 'ace-builds/src-noconflict/mode-text';
import 'ace-builds/src-noconflict/mode-html';
import 'ace-builds/src-noconflict/mode-xml';
import 'ace-builds/src-noconflict/mode-javascript';

import 'ace-builds/src-noconflict/theme-github';
import 'ace-builds/src-noconflict/theme-monokai';
import 'ace-builds/src-noconflict/theme-tomorrow';
import 'ace-builds/src-noconflict/theme-twilight';
import 'ace-builds/src-noconflict/theme-solarized_dark';
import 'ace-builds/src-noconflict/theme-solarized_light';
import 'ace-builds/src-noconflict/theme-terminal';

import 'ace-builds/src-noconflict/ext-language_tools';
import 'ace-builds/src-noconflict/ext-searchbox';

interface ReactAceEditorProps {
  value: string;
  onChange: (value: string) => void;
  language?: 'json' | 'text' | 'html' | 'xml' | 'javascript';
  theme?: 'github' | 'monokai' | 'tomorrow' | 'twilight' | 'solarized_dark' | 'solarized_light' | 'terminal';
  height?: string | number;
  className?: string;
  placeholder?: string;
  readOnly?: boolean;
  showLineNumbers?: boolean;
  fontSize?: number;
  tabSize?: number;
  wordWrap?: boolean;
  showPrintMargin?: boolean;
  highlightActiveLine?: boolean;
  enableBasicAutocompletion?: boolean;
  enableLiveAutocompletion?: boolean;
  showGutter?: boolean;
}

const ReactAceEditor: React.FC<ReactAceEditorProps> = ({
  value,
  onChange,
  language = 'json',
  theme = 'github',
  height = 300,
  className,
  placeholder = 'Enter your code here...',
  readOnly = false,
  showLineNumbers = true,
  fontSize = 14,
  tabSize = 2,
  wordWrap = true,
  showPrintMargin = false,
  highlightActiveLine = true,
  enableBasicAutocompletion = true,
  enableLiveAutocompletion = true,
  showGutter = true
}) => {
  const [error, setError] = useState<string>('');
  const [isValid, setIsValid] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const [currentTheme, setCurrentTheme] = useState(theme);
  const [cursorPosition, setCursorPosition] = useState({ row: 1, column: 1 });

  // Available themes
  const themes = [
    { value: 'github', label: 'GitHub Light' },
    { value: 'monokai', label: 'Monokai' },
    { value: 'tomorrow', label: 'Tomorrow' },
    { value: 'twilight', label: 'Twilight' },
    { value: 'solarized_dark', label: 'Solarized Dark' },
    { value: 'solarized_light', label: 'Solarized Light' },
    { value: 'terminal', label: 'Terminal' }
  ];

  // JSON validation
  React.useEffect(() => {
    if (language === 'json' && value.trim()) {
      const validation = validateJson(value);
      setIsValid(validation.isValid);
      setError(validation.error || '');
    } else {
      setIsValid(true);
      setError('');
    }
  }, [value, language]);

  const handleChange = useCallback((newValue: string) => {
    onChange(newValue);
  }, [onChange]);

  const handleCursorChange = useCallback((selection: any) => {
    const cursor = selection.getCursor();
    setCursorPosition({ row: cursor.row + 1, column: cursor.column + 1 });
  }, []);

  const handleFormat = () => {
    if (language === 'json') {
      const validation = validateJson(value);
      if (validation.isValid && validation.parsed) {
        const formatted = formatJson(validation.parsed);
        onChange(formatted);
      }
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([value], { 
      type: language === 'json' ? 'application/json' : 'text/plain' 
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    
    a.href = url;
    a.download = `code.${language}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleReset = () => {
    onChange('');
  };

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  const actualHeight = isExpanded ? '70vh' : (typeof height === 'number' ? height : parseInt(height as string) || 300);

  return (
    <>
      <div className={cn('relative', className)}>
        <div className={cn(
          'border rounded-lg overflow-hidden bg-white transition-all duration-200',
          'focus-within:ring-2 focus-within:ring-primary-500 focus-within:border-primary-500',
          error && !isValid ? 'border-red-300' : 'border-gray-300',
          isExpanded && 'fixed inset-4 z-50 shadow-2xl'
        )}>
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <Code className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700 capitalize">
                {language} Editor
              </span>
              
              {language === 'json' && (
                <div className="flex items-center gap-1 ml-2">
                  {isValid ? (
                    <>
                      <Check className="w-3 h-3 text-green-500" />
                      <span className="text-xs text-green-600">Valid</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-3 h-3 text-red-500" />
                      <span className="text-xs text-red-600">Invalid</span>
                    </>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center gap-1">
              {/* Theme Selector */}
              <div className="relative">
                <select
                  value={currentTheme}
                  onChange={(e) => setCurrentTheme(e.target.value as any)}
                  className="text-xs bg-transparent border-none focus:outline-none pr-6 cursor-pointer"
                  title="Select theme"
                >
                  {themes.map(theme => (
                    <option key={theme.value} value={theme.value}>
                      {theme.label}
                    </option>
                  ))}
                </select>
                <Palette className="absolute right-1 top-1/2 transform -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopy}
                title="Copy to clipboard"
              >
                <Copy className="w-3 h-3" />
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDownload}
                title="Download file"
              >
                <Download className="w-3 h-3" />
              </Button>
              
              {language === 'json' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleFormat}
                  disabled={!isValid || readOnly}
                  title="Format JSON"
                >
                  <Settings className="w-3 h-3" />
                </Button>
              )}
              
              <Button
                variant="ghost"
                size="sm"
                onClick={handleReset}
                title="Clear content"
                disabled={readOnly}
              >
                <RotateCcw className="w-3 h-3" />
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleExpanded}
                title={isExpanded ? "Exit fullscreen" : "Enter fullscreen"}
              >
                {isExpanded ? (
                  <Minimize2 className="w-3 h-3" />
                ) : (
                  <Maximize2 className="w-3 h-3" />
                )}
              </Button>
            </div>
          </div>

          {/* Ace Editor */}
          <div className="relative">
            <AceEditor
              mode={language}
              theme={currentTheme}
              value={value}
              onChange={handleChange}
              onCursorChange={handleCursorChange}
              name={`ace-editor-${Math.random().toString(36).substr(2, 9)}`}
              editorProps={{ $blockScrolling: true }}
              height={`${actualHeight}px`}
              width="100%"
              fontSize={fontSize}
              tabSize={tabSize}
              setOptions={{
                enableBasicAutocompletion,
                enableLiveAutocompletion,
                enableSnippets: true,
                showLineNumbers,
                showGutter,
                highlightActiveLine,
                showPrintMargin,
                readOnly,
                placeholder,
                wrap: wordWrap,
                useWorker: language === 'json', // Enable worker for JSON validation
                displayIndentGuides: true,
                scrollPastEnd: true,
                animatedScroll: true,
                cursorStyle: 'smooth',
                behavioursEnabled: true,
                wrapBehavioursEnabled: true,
                autoScrollEditorIntoView: true
              }}
              commands={[
                {
                  name: 'formatJSON',
                  bindKey: { win: 'Ctrl-Shift-F', mac: 'Cmd-Shift-F' },
                  exec: () => {
                    if (language === 'json') {
                      handleFormat();
                    }
                  }
                },
                {
                  name: 'copyContent',
                  bindKey: { win: 'Ctrl-Shift-C', mac: 'Cmd-Shift-C' },
                  exec: () => {
                    handleCopy();
                  }
                }
              ]}
            />
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-t border-gray-200">
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <span>Ln {cursorPosition.row}, Col {cursorPosition.column}</span>
              <span>{value.length} characters</span>
              <span>{value.split('\n').length} lines</span>
              {language === 'json' && (
                <span>Size: {new Blob([value]).size} bytes</span>
              )}
            </div>

            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span>Theme: {themes.find(t => t.value === currentTheme)?.label}</span>
              <span>•</span>
              <span>Mode: {language}</span>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && !isValid && (
          <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
              <div>
                <div className="text-sm font-medium text-red-800">JSON Syntax Error</div>
                <div className="text-sm text-red-600 mt-1 font-mono">{error}</div>
              </div>
            </div>
          </div>
        )}

        {/* Keyboard shortcuts help */}
        <div className="mt-2 text-xs text-gray-500">
          <span>Shortcuts: </span>
          <span className="font-mono bg-gray-100 px-1 rounded">Ctrl+Shift+F</span> format,
          <span className="font-mono bg-gray-100 px-1 rounded ml-1">Ctrl+Shift+C</span> copy,
          <span className="font-mono bg-gray-100 px-1 rounded ml-1">Ctrl+F</span> find,
          <span className="font-mono bg-gray-100 px-1 rounded ml-1">Ctrl+H</span> replace
        </div>
      </div>

      {/* Backdrop for expanded mode */}
      {isExpanded && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={toggleExpanded}
        />
      )}
    </>
  );
};

export default ReactAceEditor;