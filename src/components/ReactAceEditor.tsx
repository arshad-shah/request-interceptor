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
  ChevronDown,
  FileCode,
  Zap,
  Sun,
  Moon
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
  placeholder = 'Start coding...',
  readOnly = false,
  showLineNumbers = true,
  fontSize = 16,
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
  const [currentTheme, setCurrentTheme] = useState(theme);
  const [cursorPosition, setCursorPosition] = useState({ row: 1, column: 1 });
  const [showThemeMenu, setShowThemeMenu] = useState(false);

  // Enhanced theme configuration with categories
  const themes = [
    { 
      value: 'github', 
      label: 'GitHub Light', 
      category: 'Light',
      icon: Sun,
      gradient: 'from-gray-50 to-white'
    },
    { 
      value: 'solarized_light', 
      label: 'Solarized Light', 
      category: 'Light',
      icon: Sun,
      gradient: 'from-yellow-50 to-orange-50'
    },
    { 
      value: 'tomorrow', 
      label: 'Tomorrow', 
      category: 'Light',
      icon: Sun,
      gradient: 'from-blue-50 to-indigo-50'
    },
    { 
      value: 'monokai', 
      label: 'Monokai', 
      category: 'Dark',
      icon: Moon,
      gradient: 'from-gray-800 to-gray-900'
    },
    { 
      value: 'twilight', 
      label: 'Twilight', 
      category: 'Dark',
      icon: Moon,
      gradient: 'from-purple-800 to-gray-900'
    },
    { 
      value: 'solarized_dark', 
      label: 'Solarized Dark', 
      category: 'Dark',
      icon: Moon,
      gradient: 'from-slate-800 to-slate-900'
    },
    { 
      value: 'terminal', 
      label: 'Terminal', 
      category: 'Dark',
      icon: Moon,
      gradient: 'from-green-900 to-black'
    }
  ];

  const currentThemeInfo = themes.find(t => t.value === currentTheme) || themes[0];

  // Language configuration with icons and colors
  const languageConfig = {
    json: { 
      icon: FileCode, 
      color: 'text-yellow-600', 
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200',
      name: 'JSON'
    },
    javascript: { 
      icon: Code, 
      color: 'text-yellow-500', 
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200',
      name: 'JavaScript'
    },
    html: { 
      icon: FileCode, 
      color: 'text-orange-600', 
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200',
      name: 'HTML'
    },
    xml: { 
      icon: FileCode, 
      color: 'text-blue-600', 
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      name: 'XML'
    },
    text: { 
      icon: FileCode, 
      color: 'text-gray-600', 
      bgColor: 'bg-gray-50',
      borderColor: 'border-gray-200',
      name: 'Text'
    }
  };

  const config = languageConfig[language] || languageConfig.text;
  const IconComponent = config.icon;

  // JSON validation with enhanced error handling
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

  return (
    <>
      <div className={cn('relative group', className)}>
        <div className={cn(
          'border-2 rounded-xl overflow-hidden bg-white transition-all duration-300',
          'focus-within:ring-4 focus-within:ring-blue-500/20 focus-within:border-blue-500',
          'hover:shadow-lg',
          error && !isValid 
            ? 'border-red-300 shadow-red-100' 
            : 'border-gray-200 hover:border-gray-300'
        )}>
          {/* Enhanced Header */}
          <div className={cn(
            'flex items-center justify-between px-4 py-3',
            'bg-gradient-to-r from-gray-50 via-white to-gray-50',
            'border-b border-gray-200'
          )}>
            <div className="flex items-center gap-3">
              {/* Language Badge */}
              <div className={cn(
                'flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium',
                config.bgColor,
                config.borderColor,
                'border'
              )}>
                <IconComponent className={cn('w-4 h-4', config.color)} />
                <span className={config.color}>{config.name}</span>
              </div>
              
              {/* Validation Status for JSON */}
              {language === 'json' && (
                <div className={cn(
                  'flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200',
                  isValid 
                    ? 'bg-green-50 text-green-700 border border-green-200' 
                    : 'bg-red-50 text-red-700 border border-red-200'
                )}>
                  {isValid ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Valid</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>Invalid</span>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Enhanced Action Bar */}
            <div className="flex items-center gap-1">
              {/* Theme Selector with Dropdown */}
              <div className="relative">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowThemeMenu(!showThemeMenu)}
                  leftIcon={<currentThemeInfo.icon className="w-3.5 h-3.5" />}
                  rightIcon={<ChevronDown className="w-3 h-3" />}
                  className="text-gray-600 hover:text-gray-800"
                >
                  <span className="hidden sm:inline text-xs">{currentThemeInfo.label}</span>
                </Button>
                
                {showThemeMenu && (
                  <div className="absolute top-full right-0 mt-1 w-56 bg-white rounded-lg shadow-xl border border-gray-200 z-10">
                    <div className="p-2">
                      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide px-2 py-1">
                        Light Themes
                      </div>
                      {themes.filter(t => t.category === 'Light').map(theme => (
                        <button
                          key={theme.value}
                          onClick={() => {
                            setCurrentTheme(theme.value as any);
                            setShowThemeMenu(false);
                          }}
                          className={cn(
                            'w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm transition-colors',
                            currentTheme === theme.value 
                              ? 'bg-blue-50 text-blue-700' 
                              : 'hover:bg-gray-50 text-gray-700'
                          )}
                        >
                          <theme.icon className="w-3.5 h-3.5" />
                          <span>{theme.label}</span>
                          {currentTheme === theme.value && (
                            <Check className="w-3 h-3 ml-auto text-blue-600" />
                          )}
                        </button>
                      ))}
                      
                      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide px-2 py-1 mt-2">
                        Dark Themes
                      </div>
                      {themes.filter(t => t.category === 'Dark').map(theme => (
                        <button
                          key={theme.value}
                          onClick={() => {
                            setCurrentTheme(theme.value as any);
                            setShowThemeMenu(false);
                          }}
                          className={cn(
                            'w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm transition-colors',
                            currentTheme === theme.value 
                              ? 'bg-blue-50 text-blue-700' 
                              : 'hover:bg-gray-50 text-gray-700'
                          )}
                        >
                          <theme.icon className="w-3.5 h-3.5" />
                          <span>{theme.label}</span>
                          {currentTheme === theme.value && (
                            <Check className="w-3 h-3 ml-auto text-blue-600" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="w-px h-6 bg-gray-300 mx-1"></div>

              {/* Action Buttons */}
              <Button
                variant="icon"
                size="sm"
                onClick={handleCopy}
                className="text-gray-600 hover:text-gray-800 hover:bg-gray-100"
                title="Copy to clipboard (Ctrl+Shift+C)"
              >
                <Copy className="w-3.5 h-3.5" />
              </Button>
              
              <Button
                variant="icon"
                size="sm"
                onClick={handleDownload}
                className="text-gray-600 hover:text-gray-800 hover:bg-gray-100"
                title="Download file"
              >
                <Download className="w-3.5 h-3.5" />
              </Button>
              
              {language === 'json' && (
                <Button
                  variant="icon"
                  size="sm"
                  onClick={handleFormat}
                  disabled={!isValid || readOnly}
                  className={cn(
                    'text-gray-600 hover:text-gray-800 hover:bg-gray-100',
                    isValid && !readOnly && 'hover:text-blue-600 hover:bg-blue-50'
                  )}
                  title="Format JSON (Ctrl+Shift+F)"
                >
                  <Zap className="w-3.5 h-3.5" />
                </Button>
              )}
              
              <Button
                variant="icon"
                size="sm"
                onClick={handleReset}
                disabled={readOnly}
                className="text-gray-600 hover:text-red-600 hover:bg-red-50"
                title="Clear content"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>

          {/* Editor Container */}
          <div className="relative bg-white">
            <AceEditor
              mode={language}
              theme={currentTheme}
              value={value}
              onChange={handleChange}
              onCursorChange={handleCursorChange}
              name={`ace-editor-${Math.random().toString(36).substr(2, 9)}`}
              editorProps={{ $blockScrolling: true }}
              height={`${(typeof height === 'number' ? height : parseInt(height as string) || 300)}px`}
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
                useWorker: language === 'json',
                displayIndentGuides: true,
                scrollPastEnd: true,
                animatedScroll: true,
                cursorStyle: 'smooth',
                behavioursEnabled: true,
                wrapBehavioursEnabled: true,
                autoScrollEditorIntoView: true,
                fontFamily: '"Fira Code", "JetBrains Mono", "SF Mono", Consolas, monospace'
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

          {/* Enhanced Footer */}
          <div className={cn(
            'flex items-center justify-between px-4 py-2.5',
            'bg-gradient-to-r from-gray-50 via-white to-gray-50',
            'border-t border-gray-200'
          )}>
            <div className="flex items-center gap-6 text-xs text-gray-600">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                <span className="font-mono">Ln {cursorPosition.row}, Col {cursorPosition.column}</span>
              </div>
              <div className="hidden sm:flex items-center gap-4">
                <span>{value.length.toLocaleString()} characters</span>
                <span>{value.split('\n').length.toLocaleString()} lines</span>
                {language === 'json' && (
                  <span>{(new Blob([value]).size / 1024).toFixed(1)} KB</span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs text-gray-500">
              <span>UTF-8</span>
              <span>•</span>
              <span>{config.name}</span>
              <span>•</span>
              <span>{currentThemeInfo.label}</span>
            </div>
          </div>
        </div>

        {/* Enhanced Error Display */}
        {error && !isValid && (
          <div className="mt-3 p-4 bg-red-50 border-l-4 border-red-400 rounded-r-lg shadow-sm">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <div className="text-sm font-semibold text-red-800 mb-1">
                  JSON Syntax Error
                </div>
                <div className="text-sm text-red-700 font-mono bg-red-100 px-2 py-1 rounded">
                  {error}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Enhanced Keyboard Shortcuts */}
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-gray-500">
          <span className="font-medium">Shortcuts:</span>
          {[
            { key: 'Ctrl+Shift+F', action: 'Format' },
            { key: 'Ctrl+Shift+C', action: 'Copy' },
            { key: 'Ctrl+F', action: 'Find' },
            { key: 'Ctrl+H', action: 'Replace' }
          ].map(({ key, action }) => (
            <div key={key} className="flex items-center gap-1">
              <kbd className="font-mono bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-xs border border-gray-300">
                {key}
              </kbd>
              <span>{action}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Click Outside Handler for Theme Menu */}
      {showThemeMenu && (
        <div 
          className="fixed inset-0 z-[5]"
          onClick={() => setShowThemeMenu(false)}
        />
      )}
    </>
  );
};

export default ReactAceEditor;