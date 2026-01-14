import React, { useState, useCallback } from 'react';
import AceEditor from 'react-ace';
import {
  Code,
  Check,
  AlertCircle,
  Copy,
  RotateCcw,
  ChevronDown,
  FileCode,
  Zap,
  Moon
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { validateJson, formatJson } from '@/lib/chrome-api';
import Button from '../ui/Button';

// Import ACE modes and themes
import 'ace-builds/src-noconflict/mode-json';
import 'ace-builds/src-noconflict/mode-text';
import 'ace-builds/src-noconflict/mode-html';
import 'ace-builds/src-noconflict/mode-xml';
import 'ace-builds/src-noconflict/mode-javascript';

import 'ace-builds/src-noconflict/theme-monokai';
import 'ace-builds/src-noconflict/theme-twilight';
import 'ace-builds/src-noconflict/theme-solarized_dark';
import 'ace-builds/src-noconflict/theme-terminal';

import 'ace-builds/src-noconflict/ext-language_tools';
import 'ace-builds/src-noconflict/ext-searchbox';

interface ReactAceEditorProps {
  value: string;
  onChange: (value: string) => void;
  language?: 'json' | 'text' | 'html' | 'xml' | 'javascript';
  theme?: 'monokai' | 'twilight' | 'solarized_dark' | 'terminal';
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
  theme = 'monokai',
  height = 300,
  className,
  placeholder = 'Start coding...',
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
  const [currentTheme, setCurrentTheme] = useState(theme);
  const [cursorPosition, setCursorPosition] = useState({ row: 1, column: 1 });
  const [showThemeMenu, setShowThemeMenu] = useState(false);

  // Dark theme configuration
  const themes = [
    {
      value: 'monokai',
      label: 'Monokai',
      icon: Moon
    },
    {
      value: 'twilight',
      label: 'Twilight',
      icon: Moon
    },
    {
      value: 'solarized_dark',
      label: 'Solarized Dark',
      icon: Moon
    },
    {
      value: 'terminal',
      label: 'Terminal',
      icon: Moon
    }
  ];

  const currentThemeInfo = themes.find(t => t.value === currentTheme) || themes[0];

  // Language configuration with dark theme colors
  const languageConfig = {
    json: {
      icon: FileCode,
      color: 'text-[var(--accent-amber)]',
      bgColor: 'bg-[rgba(245,158,11,0.15)]',
      name: 'JSON'
    },
    javascript: {
      icon: Code,
      color: 'text-[var(--accent-amber)]',
      bgColor: 'bg-[rgba(245,158,11,0.15)]',
      name: 'JavaScript'
    },
    html: {
      icon: FileCode,
      color: 'text-[var(--accent-orange)]',
      bgColor: 'bg-[rgba(249,115,22,0.15)]',
      name: 'HTML'
    },
    xml: {
      icon: FileCode,
      color: 'text-[var(--accent-cyan)]',
      bgColor: 'bg-[rgba(6,182,212,0.15)]',
      name: 'XML'
    },
    text: {
      icon: FileCode,
      color: 'text-[var(--text-secondary)]',
      bgColor: 'bg-[var(--bg-elevated)]',
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

  const handleReset = () => {
    onChange('');
  };

  return (
    <>
      <div className={cn('relative group', className)}>
        <div className={cn(
          'border rounded-[var(--radius-lg)] overflow-hidden bg-[var(--bg-elevated)] transition-all duration-200',
          'focus-within:ring-2 focus-within:ring-[var(--accent-cyan)] focus-within:border-[var(--accent-cyan)]',
          error && !isValid
            ? 'border-[var(--accent-rose)]'
            : 'border-[var(--border-subtle)] hover:border-[var(--border-default)]'
        )}>
          {/* Compact Header */}
          <div className="flex items-center justify-between px-3 py-2 bg-[var(--bg-surface)] border-b border-[var(--border-subtle)]">
            <div className="flex items-center gap-2">
              {/* Language Badge */}
              <div className={cn(
                'flex items-center gap-1.5 px-2 py-1 rounded-[var(--radius-sm)] text-xs font-medium',
                config.bgColor,
                config.color
              )}>
                <IconComponent className="w-3 h-3" />
                <span>{config.name}</span>
              </div>

              {/* JSON Validation */}
              {language === 'json' && (
                <div className={cn(
                  'flex items-center gap-1 px-2 py-1 rounded-[var(--radius-sm)] text-xs',
                  isValid
                    ? 'bg-[rgba(16,185,129,0.15)] text-[var(--accent-emerald)]'
                    : 'bg-[rgba(244,63,94,0.15)] text-[var(--accent-rose)]'
                )}>
                  {isValid ? (
                    <Check className="w-3 h-3" />
                  ) : (
                    <AlertCircle className="w-3 h-3" />
                  )}
                  <span>{isValid ? 'Valid' : 'Invalid'}</span>
                </div>
              )}
            </div>

            {/* Compact Actions */}
            <div className="flex items-center gap-1">
              {/* Theme Toggle */}
              <div className="relative">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowThemeMenu(!showThemeMenu)}
                  leftIcon={<currentThemeInfo.icon className="w-3 h-3" />}
                  className="text-xs px-2"
                >
                  <span className="hidden sm:inline">{currentThemeInfo.label}</span>
                </Button>

                {showThemeMenu && (
                  <div className="absolute top-full right-0 mt-1 w-48 bg-[var(--bg-elevated)] rounded-[var(--radius-md)] shadow-lg border border-[var(--border-subtle)] z-10">
                    <div className="p-2 max-h-64 overflow-y-auto">
                      {themes.map(theme => (
                        <button
                          key={theme.value}
                          onClick={() => {
                            setCurrentTheme(theme.value as any);
                            setShowThemeMenu(false);
                          }}
                          className={cn(
                            'w-full flex items-center gap-2 px-2 py-1.5 rounded-[var(--radius-sm)] text-xs transition-colors',
                            currentTheme === theme.value
                              ? 'bg-[rgba(6,182,212,0.15)] text-[var(--accent-cyan)]'
                              : 'hover:bg-[var(--bg-hover)] text-[var(--text-secondary)]'
                          )}
                        >
                          <theme.icon className="w-3 h-3" />
                          <span>{theme.label}</span>
                          {currentTheme === theme.value && (
                            <Check className="w-3 h-3 ml-auto text-[var(--accent-cyan)]" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopy}
                className="text-xs px-2"
                title="Copy"
              >
                <Copy className="w-3 h-3" />
              </Button>

              {language === 'json' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleFormat}
                  disabled={!isValid || readOnly}
                  className="text-xs px-2"
                  title="Format"
                >
                  <Zap className="w-3 h-3" />
                </Button>
              )}

              <Button
                variant="ghost"
                size="sm"
                onClick={handleReset}
                disabled={readOnly}
                className="text-xs px-2 text-[var(--accent-rose)] hover:bg-[rgba(244,63,94,0.15)]"
                title="Clear"
              >
                <RotateCcw className="w-3 h-3" />
              </Button>
            </div>
          </div>

          {/* Editor Container */}
          <div className="relative">
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
                scrollPastEnd: false,
                animatedScroll: false,
                cursorStyle: 'smooth',
                behavioursEnabled: true,
                wrapBehavioursEnabled: true,
                autoScrollEditorIntoView: true,
                fontFamily: '"SF Mono", Consolas, "Liberation Mono", Menlo, monospace'
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

          {/* Compact Footer */}
          <div className="flex items-center justify-between px-3 py-1.5 bg-[var(--bg-surface)] border-t border-[var(--border-subtle)] text-xs text-[var(--text-tertiary)]">
            <div className="flex items-center gap-3">
              <span className="font-mono">Ln {cursorPosition.row}, Col {cursorPosition.column}</span>
              <span className="hidden sm:inline">{value.length} chars</span>
            </div>
            <div className="flex items-center gap-2">
              <span>{config.name}</span>
              <span>•</span>
              <span>{currentThemeInfo.label}</span>
            </div>
          </div>
        </div>

        {/* Compact Error Display */}
        {error && !isValid && (
          <div className="mt-2 p-3 bg-[rgba(244,63,94,0.1)] border border-[rgba(244,63,94,0.3)] rounded-[var(--radius-md)]">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-[var(--accent-rose)] mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <div className="text-sm font-medium text-[var(--accent-rose)]">JSON Error</div>
                <div className="text-xs text-[var(--text-secondary)] font-mono mt-1">{error}</div>
              </div>
            </div>
          </div>
        )}
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
